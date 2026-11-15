import test from "node:test";
import assert from "node:assert/strict";
import {
  createAcademyBackup,
  parseAcademyBackup,
  MAX_ACADEMY_BACKUP_BYTES
} from "../academy-backup.mjs";

const courses = [
  { id: "html", lessons: [["Intro"], ["Forms"], ["Semantic"]] },
  { id: "css", lessons: [["Selectors"], ["Layout"]] }
];

test("portable backup round-trips lesson progress, resume position and assessment state", () => {
  const raw = createAcademyBackup({
    courses,
    progress: { html: [0, 2], css: [1] },
    meta: {
      lastCourse: "html",
      lastLesson: 2,
      updatedAt: "2026-11-15T10:00:00.000Z"
    },
    assessments: {
      results: {
        html: {
          score: 80,
          passed: true,
          attempts: 2,
          completedAt: "2026-11-15T10:01:00.000Z",
          history: [
            { score: 80, correct: 4, total: 5, passed: true, completedAt: "2026-11-15T10:01:00.000Z" },
            { score: 60, correct: 3, total: 5, passed: false, completedAt: "2026-11-14T10:01:00.000Z" }
          ]
        }
      },
      projects: { html: [0, 2] }
    },
    exportedAt: "2026-11-15T10:02:00.000Z"
  });

  const restored = parseAcademyBackup(raw, courses);
  assert.deepEqual(restored.progress, { html: [0, 2], css: [1] });
  assert.deepEqual(restored.meta, {
    lastCourse: "html",
    lastLesson: 2,
    updatedAt: "2026-11-15T10:00:00.000Z"
  });
  assert.equal(restored.assessmentState.results.html.history.length, 2);
  assert.deepEqual(restored.assessmentState.projects.html, [0, 2]);
  assert.equal(restored.exportedAt, "2026-11-15T10:02:00.000Z");
});

test("backup import normalizes unknown courses and invalid lesson indices", () => {
  const raw = JSON.stringify({
    format: "mr-siavash-ai-academy-backup",
    version: 1,
    exported_at: "2026-11-15T10:00:00.000Z",
    progress: { html: [0, 99, -1, "1"], unknown: [0] },
    meta: { lastCourse: "unknown", lastLesson: 99 },
    assessments: { results: {}, projects: {} }
  });
  const restored = parseAcademyBackup(raw, courses);
  assert.deepEqual(restored.progress, { html: [0] });
  assert.equal(restored.meta.lastCourse, null);
  assert.equal(restored.meta.lastLesson, 0);
});

test("backup import rejects malformed, unsupported and oversized files", () => {
  assert.throws(() => parseAcademyBackup("{broken", courses), /valid JSON/);
  assert.throws(() => parseAcademyBackup(JSON.stringify({
    format: "other", version: 1, exported_at: "2026-11-15T10:00:00Z",
    progress: {}, meta: {}, assessments: {}
  }), courses), /not supported/);
  assert.throws(() => parseAcademyBackup("x".repeat(MAX_ACADEMY_BACKUP_BYTES + 1), courses), /size limit/);
});

test("backup export rejects an invalid course catalog or timestamp", () => {
  assert.throws(() => createAcademyBackup({
    courses: null, progress: {}, meta: {}, assessments: {}
  }), /invalid/);
  assert.throws(() => createAcademyBackup({
    courses, progress: {}, meta: {}, assessments: {}, exportedAt: "not-a-date"
  }), /invalid/);
});
