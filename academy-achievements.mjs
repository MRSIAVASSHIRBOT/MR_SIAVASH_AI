import { getAcademyAssessment, getAcademyCourseIds, normalizeAcademyAssessmentState } from "./academy-assessments.mjs";
import { getAcademyChallenges, normalizeAcademyPracticeState } from "./academy-practice.mjs";
import { normalizeAcademyProgress, summarizeAcademyProgress } from "./academy-progress.mjs";

const COURSE_IDS = getAcademyCourseIds();
const COURSES = COURSE_IDS.map(id => ({
  id,
  lessons: Array.from({ length: 5 }, (_, index) => index)
}));

function milestone(id, title, description, rawCurrent, target, unit, nextStep) {
  const numeric = Number.isFinite(rawCurrent) ? Math.floor(rawCurrent) : 0;
  const current = Math.max(0, Math.min(target, numeric));
  const earned = current >= target;
  return {
    id,
    title,
    description,
    current,
    target,
    unit,
    progressPercent: Math.round(current / target * 100),
    progressLabel: current + " از " + target + " " + unit,
    earned,
    status: earned ? "earned" : current > 0 ? "in_progress" : "locked",
    nextStep: earned ? "این دستاورد بر اساس داده‌های محلی آکادمی ثبت شده است." : nextStep
  };
}

/**
 * Derive a transparent, browser-local learning progression from normalized
 * lesson, assessment, capstone, and expected-output challenge state.
 * No separate achievement state is stored and no credential is issued.
 */
export function deriveAcademyAchievementProgress(rawState = {}) {
  const source = rawState && typeof rawState === "object" && !Array.isArray(rawState)
    ? rawState : {};
  const progress = normalizeAcademyProgress(source.progress, COURSES).progress;
  const summary = summarizeAcademyProgress(COURSES, progress);
  const assessments = normalizeAcademyAssessmentState(source.assessments);
  const practice = normalizeAcademyPracticeState(source.practice);

  const startedCourses = COURSE_IDS.filter(id => (progress[id] || []).length > 0).length;
  const passedAssessments = COURSE_IDS.filter(
    id => assessments.results[id] && assessments.results[id].passed
  ).length;
  const completedCapstones = COURSE_IDS.filter(id => {
    const project = getAcademyAssessment(id)?.project;
    const checked = assessments.projects[id] || [];
    return project && checked.length === project.deliverables.length;
  }).length;
  const completedChallenges = practice.completed.length;
  const completedCourses = summary.completedCourses;

  return [
    milestone(
      "first-step",
      "اولین قدم",
      "اولین فصل آموزشی تکمیل‌شده، شروع قابل‌اندازه‌گیری مسیر یادگیری است.",
      summary.completedLessons,
      1,
      "فصل",
      "یک فصل از یکی از مسیرهای آکادمی را تکمیل کن."
    ),
    milestone(
      "explorer",
      "کاوشگر یادگیری",
      "فعالیت واقعی در چند مسیر متفاوت، دامنه یادگیری را گسترش می‌دهد.",
      startedCourses,
      3,
      "مسیر",
      "در سه مسیر متفاوت دست‌کم یک فصل را تکمیل کن."
    ),
    milestone(
      "course-finisher",
      "پایان نخستین مسیر",
      "یک مسیر زمانی کامل محسوب می‌شود که تمام فصل‌های آن علامت‌گذاری شده باشند.",
      completedCourses,
      1,
      "مسیر",
      "تمام فصل‌های یک مسیر آموزشی را تکمیل کن."
    ),
    milestone(
      "assessment-passer",
      "سنجش‌گر",
      "حدنصاب آزمون‌ها بر اساس آستانه ۸۰ درصد خود آکادمی محاسبه می‌شود.",
      passedAssessments,
      1,
      "سنجش",
      "در یکی از آزمون‌های آکادمی حداقل ۸۰ درصد امتیاز بگیر."
    ),
    milestone(
      "assessment-master",
      "تسلط در سنجش‌ها",
      "تعداد آزمون‌هایی که حدنصاب را گذرانده‌اند، بدون میانگین‌گیری گمراه‌کننده شمرده می‌شود.",
      passedAssessments,
      COURSE_IDS.length,
      "سنجش",
      "حدنصاب هر شش آزمون مسیرهای آکادمی را کسب کن."
    ),
    milestone(
      "capstone-builder",
      "سازنده نمونه‌کار",
      "تکمیل چک‌لیست پروژه یک ثبت خوداظهاری است، نه داوری مستقل کیفیت پروژه.",
      completedCapstones,
      1,
      "پروژه",
      "تمام موارد چک‌لیست یکی از پروژه‌های پایانی را تکمیل کن."
    ),
    milestone(
      "capstone-master",
      "مجموعه پروژه‌ها",
      "پیشرفت چک‌لیست هر شش پروژه پایانی در این مرحله جمع می‌شود.",
      completedCapstones,
      COURSE_IDS.length,
      "پروژه",
      "چک‌لیست هر شش پروژه پایانی را تکمیل کن."
    ),
    milestone(
      "practice-starter",
      "حل‌کننده عملی",
      "تمرین فقط زمانی شمرده می‌شود که خروجی مورد انتظار آن ثبت شده باشد.",
      completedChallenges,
      3,
      "تمرین",
      "سه تمرین JavaScript را با خروجی مورد انتظار تکمیل کن."
    ),
    milestone(
      "practice-master",
      "تکمیل تمرینگاه",
      "تمام تمرین‌های فعلی JavaScript باید با خروجی مورد انتظار تکمیل شوند.",
      completedChallenges,
      getAcademyChallenges().length,
      "تمرین",
      "تمام تمرین‌های موجود در تمرینگاه JavaScript را تکمیل کن."
    ),
    milestone(
      "all-paths",
      "شش مسیر کامل",
      "این مرحله فقط بر اساس تکمیل تمام فصل‌های هر مسیر محاسبه می‌شود.",
      completedCourses,
      COURSE_IDS.length,
      "مسیر",
      "تمام فصل‌های هر شش مسیر آموزشی را تکمیل کن."
    )
  ];
}
