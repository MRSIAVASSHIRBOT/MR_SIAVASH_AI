import { normalizeAcademyProgress, summarizeAcademyProgress } from "./academy-progress.mjs";
import { normalizeAcademyAssessmentState, getAcademyAssessment, getAcademyCourseIds } from "./academy-assessments.mjs";
import { normalizeAcademyPracticeState, getAcademyPracticeStorageKey, getAcademyChallenges } from "./academy-practice.mjs";

const COURSES = getAcademyCourseIds().map(id => ({ id, lessons: Array.from({ length: 5 }, (_, index) => index) }));
const PROGRESS_KEY = "mr-siavash-ai.academy.v1";
const ASSESSMENT_KEY = "mr-siavash-ai.academy.assessments.v1";
const PRACTICE_KEY = getAcademyPracticeStorageKey();
const $ = selector => document.querySelector(selector);

function readState() {
  let progressRaw = "{}";
  let assessmentRaw = "{}";
  let practiceRaw = "{}";
  try { progressRaw = localStorage.getItem(PROGRESS_KEY) || "{}"; } catch {}
  try { assessmentRaw = localStorage.getItem(ASSESSMENT_KEY) || "{}"; } catch {}
  try { practiceRaw = localStorage.getItem(PRACTICE_KEY) || "{}"; } catch {}
  const normalized = normalizeAcademyProgress(progressRaw, COURSES);
  return {
    progress: normalized.progress,
    summary: summarizeAcademyProgress(COURSES, normalized.progress),
    meta: normalized.meta,
    assessments: normalizeAcademyAssessmentState(assessmentRaw),
    practice: normalizeAcademyPracticeState(practiceRaw)
  };
}

function deriveAchievements(state) {
  const achievements = [];
  const practiceCount = state.practice.completed.length;
  if (practiceCount > 0) achievements.push({ id: "practice-first", title: "شروع کدنویسی عملی", detail: "حداقل یک تمرین JavaScript با خروجی مورد انتظار تکمیل شده است." });
  if (practiceCount === getAcademyChallenges().length) achievements.push({ id: "practice-all", title: "تکمیل تمرینگاه JavaScript", detail: "تمام تمرین‌های فعلی تمرینگاه با خروجی مورد انتظار تکمیل شده‌اند." });
  const started = COURSES.filter(course => (state.progress[course.id] || []).length > 0).length;
  if (state.summary.completedLessons > 0) achievements.push({ id: "first-step", title: "اولین قدم", detail: "حداقل یک فصل آموزشی تکمیل شده است." });
  if (started >= 3) achievements.push({ id: "explorer", title: "کاوشگر یادگیری", detail: "در سه مسیر یا بیشتر فعالیت ثبت شده است." });
  for (const course of COURSES) {
    const count = (state.progress[course.id] || []).length;
    if (count === course.lessons.length) achievements.push({ id: "course-" + course.id, title: "تکمیل مسیر " + course.id, detail: "تمام فصل‌های این مسیر در مرورگر علامت‌گذاری شده‌اند." });
    if (state.assessments.results[course.id]?.passed) achievements.push({ id: "assessment-" + course.id, title: "قبولی در سنجش " + course.id, detail: "حدنصاب آزمون ثبت‌شده: ۸۰٪ یا بیشتر." });
    const project = getAcademyAssessment(course.id)?.project;
    const checked = state.assessments.projects[course.id] || [];
    if (project && checked.length === project.deliverables.length) achievements.push({ id: "project-" + course.id, title: "چک‌لیست پروژه " + course.id, detail: "تمام موارد تحویل پروژه علامت‌گذاری شده‌اند؛ این ثبت، داوری مستقل پروژه نیست." });
  }
  return achievements;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildExport(state, achievements) {
  const courses = COURSES.map(course => ({
    id: course.id,
    completedLessons: (state.progress[course.id] || []).length,
    totalLessons: course.lessons.length,
    assessment: state.assessments.results[course.id] || null,
    capstoneChecklistCompleted: (state.assessments.projects[course.id] || []).length,
    capstoneChecklistTotal: getAcademyAssessment(course.id)?.project.deliverables.length || 0
  }));
  return {
    schema: "mr-siavash-ai-learning-portfolio",
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: "browser-local",
    notice: "این گزارش خوداظهاری مبتنی بر داده‌های همین مرورگر است؛ مدرک رسمی، تأیید هویت یا داوری مستقل مهارت محسوب نمی‌شود.",
    summary: state.summary,
    courses,
    practice: { completedChallenges: state.practice.completed, totalChallenges: getAcademyChallenges().length, attempts: state.practice.attempts },
    achievements
  };
}

function render() {
  const root = $("#academyPortfolioContent");
  if (!root) return;
  root.replaceChildren();
  const state = readState();
  const achievements = deriveAchievements(state);
  const summary = element("div", "academy-portfolio-summary");
  const stats = [
    ["پیشرفت", state.summary.percentage + "٪"],
    ["فصل‌های تکمیل‌شده", state.summary.completedLessons + " / " + state.summary.totalLessons],
    ["آزمون‌های قبول‌شده", Object.values(state.assessments.results).filter(item => item.passed).length],
    ["تمرین‌های تکمیل‌شده", state.practice.completed.length + " / " + getAcademyChallenges().length],
    ["دستاوردها", achievements.length]
  ];
  for (const [label, value] of stats) {
    const card = element("div", "academy-portfolio-stat");
    card.append(element("strong", "", value), element("span", "", label));
    summary.append(card);
  }

  const list = element("div", "academy-portfolio-courses");
  for (const course of COURSES) {
    const assessment = state.assessments.results[course.id];
    const project = getAcademyAssessment(course.id)?.project;
    const completed = (state.progress[course.id] || []).length;
    const checked = (state.assessments.projects[course.id] || []).length;
    const card = element("article", "academy-portfolio-course");
    card.append(
      element("h4", "", course.id.toUpperCase()),
      element("p", "", completed + " از " + course.lessons.length + " فصل"),
      element("p", "", assessment ? "آخرین آزمون: " + assessment.score + "٪ · " + (assessment.passed ? "حدنصاب کسب شده" : "نیازمند تمرین") : "آزمون ثبت نشده"),
      element("p", "", project ? "چک‌لیست پروژه: " + checked + " از " + project.deliverables.length : "پروژه موجود نیست")
    );
    list.append(card);
  }

  const badges = element("div", "academy-portfolio-achievements");
  if (!achievements.length) badges.append(element("p", "academy-portfolio-empty", "با تکمیل درس‌ها و ثبت نتایج آزمون‌ها، دستاوردهای واقعی یادگیری در این بخش ظاهر می‌شوند."));
  for (const achievement of achievements) {
    const item = element("article", "academy-portfolio-achievement");
    item.append(element("strong", "", achievement.title), element("p", "", achievement.detail));
    badges.append(item);
  }

  const actions = element("div", "academy-portfolio-actions");
  const exportButton = element("button", "button button-primary", "خروجی گزارش JSON");
  exportButton.type = "button";
  exportButton.addEventListener("click", () => {
    const report = buildExport(readState(), deriveAchievements(readState()));
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = element("a");
    link.href = url;
    link.download = "mr-siavash-ai-learning-portfolio.json";
    link.click();
    URL.revokeObjectURL(url);
  });
  const printButton = element("button", "button button-quiet", "چاپ / ذخیره PDF");
  printButton.type = "button";
  printButton.addEventListener("click", () => window.print());
  actions.append(exportButton, printButton);

  const notice = element("p", "academy-portfolio-notice", "این نمایه فقط از پیشرفت، آزمون‌ها و چک‌لیست‌های ثبت‌شده در همین مرورگر ساخته می‌شود. علامت‌گذاری پروژه به معنی تأیید مستقل کیفیت آن نیست و این گزارش گواهی رسمی محسوب نمی‌شود.");
  root.append(summary, element("h3", "academy-portfolio-subtitle", "وضعیت مسیرها"), list, element("h3", "academy-portfolio-subtitle", "دستاوردهای ثبت‌شده"), badges, actions, notice);
}

function init() {
  render();
  window.addEventListener("storage", event => {
    if (!event.key || event.key === PROGRESS_KEY || event.key === ASSESSMENT_KEY || event.key === PRACTICE_KEY) render();
  });
  window.addEventListener("academy:practice-updated", render);
  document.addEventListener("change", event => {
    if (event.target.closest("#academyPortfolioContent")) render();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
