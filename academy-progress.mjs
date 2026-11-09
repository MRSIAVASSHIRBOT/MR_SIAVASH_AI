export function normalizeAcademyProgress(raw, courses) {
  let value = raw;
  if (typeof value === "string") {
    if (value.length > 4096) value = {};
    else {
      try { value = JSON.parse(value); } catch { value = {}; }
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};

  const progress = {};
  for (const course of courses) {
    const entries = value[course.id];
    if (!Array.isArray(entries)) continue;
    progress[course.id] = [...new Set(entries.filter(
      index => Number.isInteger(index) && index >= 0 && index < course.lessons.length
    ))].slice(0, course.lessons.length).sort((a, b) => a - b);
  }

  const candidate = value._meta && typeof value._meta === "object" && !Array.isArray(value._meta)
    ? value._meta : {};
  const lastCourse = courses.find(course => course.id === candidate.lastCourse);
  const lastLesson = lastCourse && Number.isInteger(candidate.lastLesson) &&
    candidate.lastLesson >= 0 && candidate.lastLesson < lastCourse.lessons.length
    ? candidate.lastLesson : 0;
  const updatedAt = typeof candidate.updatedAt === "string" &&
    candidate.updatedAt.length <= 40 && Number.isFinite(Date.parse(candidate.updatedAt))
    ? candidate.updatedAt : null;

  return {
    progress,
    meta: {
      lastCourse: lastCourse ? lastCourse.id : null,
      lastLesson,
      updatedAt
    }
  };
}

export function summarizeAcademyProgress(courses, progress) {
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  let completedLessons = 0;
  let startedCourses = 0;
  let completedCourses = 0;

  for (const course of courses) {
    const count = Array.isArray(progress[course.id])
      ? progress[course.id].filter(index => Number.isInteger(index) && index >= 0 && index < course.lessons.length).length
      : 0;
    completedLessons += count;
    if (count > 0) startedCourses += 1;
    if (course.lessons.length > 0 && count === course.lessons.length) completedCourses += 1;
  }

  return {
    totalLessons,
    completedLessons,
    percentage: totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0,
    startedCourses,
    completedCourses,
    remainingLessons: Math.max(0, totalLessons - completedLessons)
  };
}

export function resolveAcademyResume(courses, progress, meta = {}) {
  if (!courses.length) return null;
  const preferred = courses.find(course => course.id === meta.lastCourse);
  const fallback = courses.find(course => {
    const count = Array.isArray(progress[course.id]) ? progress[course.id].length : 0;
    return count > 0 && count < course.lessons.length;
  }) || courses[0];
  const course = preferred || fallback;
  const completed = new Set(Array.isArray(progress[course.id]) ? progress[course.id] : []);
  const allComplete = course.lessons.length > 0 && completed.size >= course.lessons.length;
  let lessonIndex = Number.isInteger(meta.lastLesson) &&
    meta.lastLesson >= 0 && meta.lastLesson < course.lessons.length
    ? meta.lastLesson : 0;

  if (allComplete) lessonIndex = Math.max(0, course.lessons.length - 1);
  else if (completed.has(lessonIndex)) {
    const next = course.lessons.findIndex((_lesson, index) => !completed.has(index));
    lessonIndex = next >= 0 ? next : 0;
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
    lessonIndex,
    lessonTitle: course.lessons[lessonIndex]?.[0] || "",
    isComplete: allComplete
  };
}

export function serializeAcademyProgress(progress, meta = {}) {
  return JSON.stringify({
    ...progress,
    _meta: {
      lastCourse: typeof meta.lastCourse === "string" ? meta.lastCourse : null,
      lastLesson: Number.isInteger(meta.lastLesson) && meta.lastLesson >= 0 ? meta.lastLesson : 0,
      updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : null
    }
  });
}
