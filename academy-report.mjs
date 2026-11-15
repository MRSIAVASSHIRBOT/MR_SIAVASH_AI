import { normalizeAcademyProgress, summarizeAcademyProgress } from "./academy-progress.mjs";
import { getAcademyAssessment, normalizeAcademyAssessmentState } from "./academy-assessments.mjs";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

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

function assessmentLabel(result) {
  if (!result) return "ثبت نشده";
  return (result.passed ? "حدنصاب کسب شده" : "نیازمند تمرین") + " · " + result.score + "٪";
}

export function createAcademyLearningReport({
  courses,
  progress = {},
  meta = {},
  assessments = {},
  generatedAt = new Date().toISOString()
} = {}) {
  if (
    !Array.isArray(courses) ||
    courses.length < 1 ||
    courses.length > 50 ||
    !courses.every(validCourse) ||
    new Set(courses.map(course => course.id)).size !== courses.length
  ) {
    throw new Error("invalid academy report course catalog");
  }
  if (
    typeof generatedAt !== "string" ||
    generatedAt.length > 40 ||
    !Number.isFinite(Date.parse(generatedAt))
  ) {
    throw new Error("invalid academy report timestamp");
  }

  const progressSource = progress && typeof progress === "object" && !Array.isArray(progress)
    ? progress : {};
  const normalized = normalizeAcademyProgress({ ...progressSource, _meta: meta }, courses);
  const assessmentState = normalizeAcademyAssessmentState(assessments);
  const summary = summarizeAcademyProgress(courses, normalized.progress);
  let passedAssessments = 0;
  let availableAssessments = 0;
  let checkedDeliverables = 0;
  let totalDeliverables = 0;

  const sections = courses.map(course => {
    const completed = new Set(normalized.progress[course.id] || []);
    const total = course.lessons.length;
    const percentage = total ? Math.round(completed.size / total * 100) : 0;
    const assessment = getAcademyAssessment(course.id);
    const result = assessmentState.results[course.id];
    const projectChecks = new Set(assessmentState.projects[course.id] || []);
    const deliverables = assessment?.project.deliverables || [];

    if (assessment) {
      availableAssessments += 1;
      if (result?.passed) passedAssessments += 1;
      checkedDeliverables += projectChecks.size;
      totalDeliverables += deliverables.length;
    }

    const lessons = course.lessons.map((lesson, index) =>
      '<li class="' + (completed.has(index) ? "done" : "pending") + '">' +
      '<span class="mark" aria-hidden="true">' + (completed.has(index) ? "✓" : "○") + "</span>" +
      escapeHtml(lesson[0]) + "</li>"
    ).join("");

    const projectText = assessment
      ? projectChecks.size + " / " + deliverables.length
      : "برای این مسیر تعریف نشده";
    const examText = assessmentLabel(result);
    const examDetail = result
      ? '<p class="detail">تلاش‌ها: ' + result.attempts +
        (result.completedAt ? " · آخرین ثبت: " + escapeHtml(result.completedAt) : "") + "</p>"
      : "";

    return '<article class="course">' +
      '<div class="course-head"><div><h2>' + escapeHtml(course.title) + "</h2>" +
      '<p class="muted">' + completed.size + " از " + total + " فصل · " + percentage + "٪</p></div>" +
      '<strong class="score">' + percentage + "٪</strong></div>" +
      '<div class="track" role="img" aria-label="پیشرفت ' + percentage + ' درصد"><span style="width:' + percentage + '%"></span></div>' +
      '<div class="facts"><p><b>آزمون:</b> ' + escapeHtml(examText) + "</p>" +
      '<p><b>چک‌لیست پروژه:</b> ' + projectText + "</p></div>" +
      examDetail +
      (assessment ? '<h3>' + escapeHtml(assessment.project.title) + "</h3>" : "") +
      '<ol class="lessons">' + lessons + "</ol></article>";
  }).join("");

  const generatedDate = new Date(generatedAt).toLocaleString("fa-IR");
  const summaryCards = [
    ["پیشرفت کل", summary.percentage + "٪"],
    ["فصل‌های تکمیل‌شده", summary.completedLessons + " از " + summary.totalLessons],
    ["دوره‌های تکمیل‌شده", summary.completedCourses],
    ["آزمون‌های قبول‌شده", passedAssessments + " از " + availableAssessments],
    ["خروجی‌های پروژه", checkedDeliverables + " از " + totalDeliverables]
  ].map(([label, value]) =>
    '<div class="metric"><strong>' + escapeHtml(value) + "</strong><span>" +
    escapeHtml(label) + "</span></div>"
  ).join("");

  return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light">' +
    "<title>گزارش پیشرفت آکادمی MR_SIAVASH_AI</title>" +
    "<style>" +
    "*{box-sizing:border-box}body{margin:0;background:#f4f7f4;color:#17231b;font:15px Tahoma,Arial,sans-serif;line-height:1.9}" +
    "main{max-width:960px;margin:32px auto;padding:0 20px}.hero,.course{background:#fff;border:1px solid #dbe5dc;border-radius:16px;padding:22px;margin-bottom:16px}" +
    "h1{font-size:26px;margin:0 0 5px}h2{font-size:19px;margin:0}h3{font-size:15px;margin:18px 0 6px}.muted,.detail{color:#647267;font-size:12px}" +
    ".metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px;margin-top:18px}.metric{display:grid;padding:12px;background:#f2f7f2;border-radius:10px}.metric strong{font-size:19px}.metric span{font-size:12px;color:#647267}" +
    ".course-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.score{font-size:20px;color:#176c36}.track{height:8px;background:#e6eee7;border-radius:9px;overflow:hidden;margin:10px 0}.track span{display:block;height:100%;background:#328c50}" +
    ".facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.facts p{margin:4px 0;padding:8px;background:#f7faf7;border-radius:8px;font-size:13px}.lessons{margin:10px 0 0;padding:0 22px;display:grid;gap:3px}.lessons li{font-size:13px}.lessons li.done{color:#176c36}.lessons li.pending{color:#6c776e}.mark{display:inline-block;min-width:22px;color:#328c50}" +
    ".notice{font-size:12px;color:#647267;margin-top:16px}@media print{body{background:#fff}.hero,.course{break-inside:avoid;border-color:#bbb;box-shadow:none}main{margin:0 auto;padding:0}.course{page-break-inside:avoid}}" +
    "</style></head><body><main><header class="hero"><h1>گزارش پیشرفت آکادمی</h1>" +
    '<p class="muted">MR_SIAVASH_AI · زمان تهیه: <time datetime="' + escapeHtml(generatedAt) + '">' +
    escapeHtml(generatedDate) + "</time></p><div class=\"metrics\">" + summaryCards + "</div></header>" +
    sections +
    '<p class="notice">این گزارش فقط از اطلاعات ذخیره‌شده در همین مرورگر تهیه شده است؛ به سرور ارسال نمی‌شود و گواهی رسمی یا تأیید هویت آموزشی نیست.</p>' +
    "</main></body></html>";
}
