import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAcademyProgress,
  summarizeAcademyProgress,
  resolveAcademyResume,
  serializeAcademyProgress
} from "../academy-progress.mjs";

const courses = [
  { id: "html", title: "HTML", lessons: [["Intro"], ["Forms"], ["Semantic"]] },
  { id: "css", title: "CSS", lessons: [["Selectors"], ["Layout"]] }
];

test("progress normalization preserves valid legacy browser data and removes invalid entries", () => {
  const state = normalizeAcademyProgress(JSON.stringify({
    html: [0, 1, 1, -1, 3, "2"],
    css: [1, 0],
    unknown: [0]
  }), courses);
  assert.deepEqual(state.progress, { html: [0, 1], css: [0, 1] });
  assert.equal(state.meta.lastCourse, null);
});

test("progress normalization rejects malformed and oversized payloads", () => {
  assert.deepEqual(normalizeAcademyProgress("{broken", courses).progress, {});
  assert.deepEqual(normalizeAcademyProgress("x".repeat(4097), courses).progress, {});
  assert.deepEqual(normalizeAcademyProgress("[]", courses).progress, {});
});

test("dashboard summary calculates total, completion, started and completed courses", () => {
  const summary = summarizeAcademyProgress(courses, { html: [0, 1, 2], css: [0] });
  assert.deepEqual(summary, {
    totalLessons: 5,
    completedLessons: 4,
    percentage: 80,
    startedCourses: 2,
    completedCourses: 1,
    remainingLessons: 1
  });
});

test("resume target continues at the next incomplete lesson when the saved lesson is complete", () => {
  const target = resolveAcademyResume(courses, { html: [0, 1] }, { lastCourse: "html", lastLesson: 1 });
  assert.deepEqual(target, {
    courseId: "html",
    courseTitle: "HTML",
    lessonIndex: 2,
    lessonTitle: "Semantic",
    isComplete: false
  });
});

test("resume target preserves an unfinished lesson position", () => {
  const target = resolveAcademyResume(courses, { html: [0] }, { lastCourse: "html", lastLesson: 2 });
  assert.equal(target.lessonIndex, 2);
  assert.equal(target.lessonTitle, "Semantic");
});

test("resume target falls back to the first started incomplete course for legacy progress", () => {
  const target = resolveAcademyResume(courses, { html: [0], css: [] }, {});
  assert.equal(target.courseId, "html");
  assert.equal(target.lessonIndex, 1);
});

test("resume target marks a fully completed course for review", () => {
  const target = resolveAcademyResume(courses, { html: [0, 1, 2] }, { lastCourse: "html", lastLesson: 2 });
  assert.equal(target.isComplete, true);
  assert.equal(target.lessonIndex, 2);
});

test("serialized metadata round-trips with progress without changing the storage key", () => {
  const raw = serializeAcademyProgress({ html: [0] }, {
    lastCourse: "html",
    lastLesson: 1,
    updatedAt: "2026-11-09T12:00:00.000Z"
  });
  const restored = normalizeAcademyProgress(raw, courses);
  assert.deepEqual(restored.progress, { html: [0] });
  assert.deepEqual(restored.meta, {
    lastCourse: "html",
    lastLesson: 1,
    updatedAt: "2026-11-09T12:00:00.000Z"
  });
});
