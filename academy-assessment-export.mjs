import { normalizeAcademyProgress } from "./academy-progress.mjs";
import { normalizeAcademyAssessmentState } from "./academy-assessments.mjs";

export const MAX_ACADEMY_ASSESSMENT_CSV_ROWS = 1000;

function validCourse(course) {
  return Boolean(
    course &&
    typeof course.id === "string" &&
    course.id.length > 0 &&
    course.id.length <= 80 &&
    typeof course.title === "string" &&
    Array.isArray(course.lessons) &&
    course.lessons.length <= 100 &&
    course.lessons.every(lesson => Array.isArray(lesson) && typeof lesson[0] === "string")
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function validTimestamp(value) {
  return typeof value === "string" &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value));
}

export function createAcademyAssessmentCsv({
  courses,
  progress = {},
  assessments = {},
  exportedAt = new Date().toISOString()
} = {}) {
  if (
    !Array.isArray(courses) ||
    courses.length < 1 ||
    courses.length > 50 ||
    !courses.every(validCourse) ||
    new Set(courses.map(course => course.id)).size !== courses.length ||
    !validTimestamp(exportedAt)
  ) {
    throw new TypeError("Academy assessment CSV input is invalid");
  }

  const normalizedProgress = normalizeAcademyProgress(progress, courses).progress;
  const normalizedAssessments = normalizeAcademyAssessmentState(assessments);
  const timestamp = new Date(exportedAt).toISOString();
  const header = [
    "exported_at",
    "course_id",
    "course_title",
    "attempt_number",
    "score_percent",
    "correct_answers",
    "total_questions",
    "passed",
    "completed_at",
    "completed_lessons",
    "total_lessons",
    "course_progress_percent"
  ];
  const rows = [header];

  for (const course of courses) {
    const result = normalizedAssessments.results[course.id];
    const history = Array.isArray(result?.history) ? result.history : [];
    const attempts = history.length
      ? history
      : result
        ? [{
            score: result.score,
            correct: null,
            total: null,
            passed: result.passed,
            completedAt: result.completedAt
          }]
        : [];
    const completed = normalizedProgress[course.id]?.length || 0;
    const total = course.lessons.length;
    const percentage = total ? Math.round(completed / total * 100) : 0;
    const exportAttempts = attempts.length ? attempts : [null];

    for (let index = 0; index < exportAttempts.length; index += 1) {
      if (rows.length > MAX_ACADEMY_ASSESSMENT_CSV_ROWS) {
        throw new RangeError("Academy assessment CSV exceeds the row limit");
      }
      const attempt = exportAttempts[index];
      rows.push([
        timestamp,
        course.id,
        course.title,
        attempt ? Math.max(1, (result?.attempts || attempts.length) - index) : "",
        attempt?.score ?? "",
        attempt?.correct ?? "",
        attempt?.total ?? "",
        attempt ? (attempt.passed ? "true" : "false") : "",
        attempt?.completedAt || "",
        completed,
        total,
        percentage
      ]);
    }
  }

  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
