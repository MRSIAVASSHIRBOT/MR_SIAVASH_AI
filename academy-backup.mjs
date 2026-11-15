import { normalizeAcademyProgress } from "./academy-progress.mjs";
import { normalizeAcademyAssessmentState } from "./academy-assessments.mjs";

export const MAX_ACADEMY_BACKUP_BYTES = 64 * 1024;
const BACKUP_FORMAT = "mr-siavash-ai-academy-backup";
const BACKUP_VERSION = 1;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTimestamp(value) {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

export function createAcademyBackup({
  courses,
  progress,
  meta,
  assessments,
  exportedAt = new Date().toISOString()
}) {
  if (!Array.isArray(courses) || !validTimestamp(exportedAt)) {
    throw new TypeError("Academy backup input is invalid");
  }
  const normalizedProgress = normalizeAcademyProgress({
    ...(isRecord(progress) ? progress : {}),
    _meta: isRecord(meta) ? meta : {}
  }, courses);
  const normalizedAssessments = normalizeAcademyAssessmentState(assessments);
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: new Date(exportedAt).toISOString(),
    progress: normalizedProgress.progress,
    meta: normalizedProgress.meta,
    assessments: normalizedAssessments
  };
  const serialized = JSON.stringify(backup, null, 2);
  if (new TextEncoder().encode(serialized).byteLength > MAX_ACADEMY_BACKUP_BYTES) {
    throw new RangeError("Academy backup exceeds the size limit");
  }
  return serialized;
}

export function parseAcademyBackup(raw, courses) {
  if (typeof raw !== "string" ||
      new TextEncoder().encode(raw).byteLength > MAX_ACADEMY_BACKUP_BYTES) {
    throw new RangeError("Academy backup is missing or exceeds the size limit");
  }
  if (!Array.isArray(courses)) throw new TypeError("Academy course catalog is invalid");

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new TypeError("Academy backup is not valid JSON");
  }
  if (!isRecord(value) || value.format !== BACKUP_FORMAT ||
      value.version !== BACKUP_VERSION || !validTimestamp(value.exported_at) ||
      !isRecord(value.progress) || !isRecord(value.meta) ||
      !isRecord(value.assessments)) {
    throw new TypeError("Academy backup format or version is not supported");
  }

  const normalizedProgress = normalizeAcademyProgress({
    ...value.progress,
    _meta: value.meta
  }, courses);
  const assessmentState = normalizeAcademyAssessmentState(value.assessments);
  return {
    progress: normalizedProgress.progress,
    meta: normalizedProgress.meta,
    assessmentState,
    exportedAt: new Date(value.exported_at).toISOString()
  };
}
