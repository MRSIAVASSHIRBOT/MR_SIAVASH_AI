const COURSE_LABELS = Object.freeze({
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  git: "Git",
  linux: "Linux",
  "web-security": "امنیت وب دفاعی"
});

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function buildAcademyDraftPreview(input) {
  const source = input && typeof input === "object" ? input : {};
  const course = typeof source.course === "string" ? source.course : "";
  const title = cleanText(source.title, 120);
  const objective = cleanText(source.objective, 1000);
  const content = cleanText(source.content, 8000);
  const exercise = cleanText(source.exercise, 2000);
  const criteria = Array.isArray(source.criteria)
    ? source.criteria.slice(0, 20).map(value => cleanText(value, 200)).filter(Boolean)
    : [];
  const errors = [];
  if (!Object.hasOwn(COURSE_LABELS, course)) errors.push("مسیر آموزشی");
  if (!title) errors.push("عنوان درس");
  if (!objective) errors.push("هدف یادگیری");
  if (!content) errors.push("محتوای آموزشی");
  return {
    course,
    courseLabel: COURSE_LABELS[course] || "مسیر انتخاب نشده",
    title,
    objective,
    content,
    exercise,
    criteria,
    errors,
    valid: errors.length === 0
  };
}
