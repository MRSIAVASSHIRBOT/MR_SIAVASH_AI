import test from "node:test";
import assert from "node:assert/strict";
import { createAcademyLearningReport } from "../academy-report.mjs";

const courses = [
  { id: "html", title: "HTML", lessons: [["ساختار سند"], ["فرم‌ها"]] },
  { id: "css", title: "CSS", lessons: [["انتخابگرها"]] }
];

test("learning report summarizes lesson, assessment and capstone progress", () => {
  const html = createAcademyLearningReport({
    courses,
    progress: { html: [0], css: [0] },
    assessments: {
      results: {
        html: {
          score: 80,
          attempts: 2,
          completedAt: "2026-11-15T10:01:00.000Z"
        }
      },
      projects: { html: [0, 2] }
    },
    generatedAt: "2026-11-15T10:02:00.000Z"
  });

  assert.match(html, /پیشرفت کل/);
  assert.match(html, /۲ از ۳/);
  assert.match(html, /HTML/);
  assert.match(html, /حدنصاب کسب شده/);
  assert.match(html, /۲ \/ ۵/);
  assert.match(html, /این گزارش فقط از اطلاعات ذخیره‌شده در همین مرورگر/);
  assert.match(html, /@media print/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /https?:\/\//i);
});

test("learning report escapes catalog text before embedding it in standalone HTML", () => {
  const html = createAcademyLearningReport({
    courses: [{
      id: "html",
      title: '<script>alert("x")</script>',
      lessons: [['<img src=x onerror="alert(1)">']]
    }],
    progress: { html: [0] },
    generatedAt: "2026-11-15T10:02:00.000Z"
  });

  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<img\b/i);
});

test("learning report rejects invalid catalogs, duplicate course IDs and timestamps", () => {
  assert.throws(() => createAcademyLearningReport({ courses: null }), /invalid academy report/);
  assert.throws(() => createAcademyLearningReport({
    courses: [...courses, courses[0]]
  }), /invalid academy report/);
  assert.throws(() => createAcademyLearningReport({
    courses,
    generatedAt: "not-a-date"
  }), /invalid academy report/);
});
