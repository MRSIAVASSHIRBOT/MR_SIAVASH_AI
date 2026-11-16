import test from "node:test";
import assert from "node:assert/strict";
import { createAcademyAssessmentCsv } from "../academy-assessment-export.mjs";

const courses = [
  { id: "html", title: "HTML فارسی", lessons: [["Intro"], ["Forms"]] },
  { id: "css", title: "CSS", lessons: [["Grid"]] }
];

test("assessment CSV exports newest-first bounded history and course progress", () => {
  const csv = createAcademyAssessmentCsv({
    courses,
    progress: { html: [0], css: [0] },
    assessments: {
      results: {
        html: {
          score: 80,
          attempts: 4,
          passed: true,
          completedAt: "2026-11-16T10:00:00.000Z",
          history: [
            { score: 80, correct: 4, total: 5, passed: true, completedAt: "2026-11-16T10:00:00.000Z" },
            { score: 60, correct: 3, total: 5, passed: false, completedAt: "2026-11-15T10:00:00.000Z" }
          ]
        }
      }
    },
    exportedAt: "2026-11-16T12:00:00.000Z"
  });

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"attempt_number","score_percent","correct_answers"/);
  assert.match(csv, /"4","80","4","5","true"/);
  assert.match(csv, /"3","60","3","5","false"/);
  assert.match(csv, /"css","CSS","","","","",""/);
  assert.match(csv, /"1","2","50"/);
  assert.ok(csv.includes("\r\n"));
});

test("CSV quoting prevents formula injection and preserves embedded delimiters", () => {
  const csv = createAcademyAssessmentCsv({
    courses: [{ id: "html", title: '=HYPERLINK("https://evil.test","open,now")', lessons: [["Intro"]] }],
    assessments: {},
    exportedAt: "2026-11-16T12:00:00.000Z"
  });

  assert.ok(csv.includes('"\'=HYPERLINK(""https://evil.test"",""open,now"")"'));
  assert.doesNotMatch(csv, /\n=HYPERLINK/);
});

test("CSV export normalizes malformed state and rejects invalid catalogs or dates", () => {
  const csv = createAcademyAssessmentCsv({
    courses,
    progress: { html: [0, 99, "1"] },
    assessments: "{broken",
    exportedAt: "2026-11-16T12:00:00.000Z"
  });
  assert.match(csv, /"html","HTML فارسی","","","","",""/);
  assert.throws(() => createAcademyAssessmentCsv({ courses: null }), /input is invalid/);
  assert.throws(() => createAcademyAssessmentCsv({ courses: [...courses, courses[0]] }), /input is invalid/);
  assert.throws(() => createAcademyAssessmentCsv({ courses, exportedAt: "not-a-date" }), /input is invalid/);
});
