import test from "node:test";
import assert from "node:assert/strict";
import { deriveAcademyAchievementProgress } from "../academy-achievements.mjs";
import { getAcademyAssessment, getAcademyCourseIds } from "../academy-assessments.mjs";
import { getAcademyChallenges } from "../academy-practice.mjs";

const courseIds = getAcademyCourseIds();
const emptyState = { progress: {}, assessments: { results: {}, projects: {} }, practice: {} };

function byId(items, id) {
  const item = items.find(candidate => candidate.id === id);
  assert.ok(item, "missing milestone " + id);
  return item;
}

test("achievement progression starts locked and gives a concrete next step", () => {
  const items = deriveAcademyAchievementProgress(emptyState);
  assert.equal(items.length, 10);
  for (const item of items) {
    assert.equal(item.status, "locked");
    assert.equal(item.earned, false);
    assert.equal(item.current, 0);
    assert.equal(item.progressPercent, 0);
    assert.ok(item.nextStep.length > 8);
  }
  assert.equal(byId(items, "first-step").target, 1);
  assert.equal(byId(items, "explorer").target, 3);
  assert.equal(byId(items, "practice-master").target, getAcademyChallenges().length);
});

test("progression combines lesson, assessment, capstone and practical evidence", () => {
  const progress = {
    html: [0, 1, 2, 3, 4],
    css: [0],
    javascript: [0, 1, 2, 3, 4]
  };
  const htmlProject = getAcademyAssessment("html").project;
  const practice = getAcademyChallenges().slice(0, 3);
  const state = {
    progress,
    assessments: {
      results: {
        html: { score: 80, attempts: 1, passed: true, completedAt: "2026-11-17T10:00:00Z" }
      },
      projects: {
        html: htmlProject.deliverables.map((_item, index) => index)
      }
    },
    practice: {
      completed: practice.map(item => item.id),
      attempts: Object.fromEntries(practice.map(item => [item.id, 1]))
    }
  };

  const items = deriveAcademyAchievementProgress(state);
  assert.deepEqual(byId(items, "first-step").progressLabel, "1 از 1 فصل");
  assert.equal(byId(items, "first-step").status, "earned");
  assert.equal(byId(items, "explorer").current, 3);
  assert.equal(byId(items, "explorer").status, "earned");
  assert.equal(byId(items, "course-finisher").current, 2);
  assert.equal(byId(items, "assessment-passer").earned, true);
  assert.equal(byId(items, "assessment-master").current, 1);
  assert.equal(byId(items, "capstone-builder").earned, true);
  assert.equal(byId(items, "practice-starter").earned, true);
  assert.equal(byId(items, "practice-master").current, 3);
  assert.equal(byId(items, "all-paths").current, 2);
});

test("progression normalizes unknown courses, duplicate challenges and invalid indexes", () => {
  const items = deriveAcademyAchievementProgress({
    progress: { html: [0, 0, 99, -1], unknown: [0, 1, 2, 3, 4] },
    assessments: {
      results: { unknown: { score: 100, attempts: 1 } },
      projects: { html: [0, 0, -1, 999] }
    },
    practice: {
      completed: ["js-variables", "js-variables", "unknown"],
      attempts: { "js-variables": 1, unknown: 99 }
    }
  });
  assert.equal(byId(items, "first-step").current, 1);
  assert.equal(byId(items, "explorer").current, 1);
  assert.equal(byId(items, "assessment-passer").current, 0);
  assert.equal(byId(items, "capstone-builder").current, 0);
  assert.equal(byId(items, "practice-starter").current, 1);
  assert.ok(courseIds.includes("html"));
});

test("progress percentages are bounded and completion labels do not overcount", () => {
  const items = deriveAcademyAchievementProgress({
    progress: Object.fromEntries(courseIds.map(id => [id, [0, 1, 2, 3, 4, 5, 6]])),
    assessments: { results: {}, projects: {} },
    practice: { completed: getAcademyChallenges().map(item => item.id) }
  });
  for (const item of items) {
    assert.ok(item.current >= 0 && item.current <= item.target);
    assert.ok(item.progressPercent >= 0 && item.progressPercent <= 100);
    if (item.earned) assert.equal(item.progressPercent, 100);
  }
});
