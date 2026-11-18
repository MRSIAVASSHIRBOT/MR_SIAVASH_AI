export const MAX_SUBTITLE_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SUBTITLE_CUES = 1000;
export const MAX_CUE_TEXT_CHARS = 1000;

function parseTimestamp(value) {
  const match = /^(\d{1,6}:)?(\d{2}):(\d{2})[,.](\d{3})$/.exec(String(value).trim());
  if (!match) throw new Error("قالب زمان نامعتبر است؛ از HH:MM:SS,mmm یا MM:SS.mmm استفاده کن.");
  const prefix = match[1];
  const middle = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  let hours = 0;
  let minutes = middle;
  if (prefix) {
    hours = Number(prefix.slice(0, -1));
    minutes = middle;
  }
  if (!Number.isSafeInteger(hours) || hours < 0 || minutes > 59 || seconds > 59) {
    throw new Error("مقدار ساعت، دقیقه یا ثانیه خارج از محدوده است.");
  }
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function timestampLine(line) {
  const match = /^\s*(\S+)\s*-->\s*(\S+)(?:\s+.*)?$/.exec(line);
  if (!match) throw new Error("خط زمان زیرنویس معتبر نیست.");
  return { start: parseTimestamp(match[1]), end: parseTimestamp(match[2]) };
}

export function parseSubtitles(source, format = "srt") {
  if (typeof source !== "string") throw new TypeError("محتوای زیرنویس باید متن باشد.");
  if (new TextEncoder().encode(source).byteLength > MAX_SUBTITLE_FILE_BYTES) {
    throw new Error("حجم فایل زیرنویس از سقف ۲ مگابایت بیشتر است.");
  }
  const kind = String(format).toLowerCase().replace(/^\./, "");
  if (kind !== "srt" && kind !== "vtt") throw new Error("فقط قالب‌های SRT و WebVTT پشتیبانی می‌شوند.");
  let text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (kind === "vtt") {
    if (!/^WEBVTT(?:\s|$)/.test(text)) throw new Error("سرآیند WEBVTT پیدا نشد.");
    text = text.slice(text.indexOf("\n") + 1);
  }

  const blocks = text.split(/\n[ \t]*\n+/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = (lines[0] || "").trim();
    if (kind === "vtt" && /^(NOTE|STYLE|REGION)(?:\s|$)/.test(first)) continue;
    const timeIndex = lines.findIndex(line => line.includes("-->"));
    if (timeIndex < 0) continue;
    const timing = timestampLine(lines[timeIndex]);
    if (timing.end <= timing.start) throw new Error("زمان پایان هر زیرنویس باید بعد از زمان شروع باشد.");
    const cueText = lines.slice(timeIndex + 1).join("\n").trim();
    if (!cueText) throw new Error("یکی از زیرنویس‌ها متن خالی دارد.");
    if (cueText.length > MAX_CUE_TEXT_CHARS) throw new Error("متن یک زیرنویس بیش از ۱۰۰۰ نویسه است.");
    cues.push({
      id: "cue-" + String(cues.length + 1),
      start: timing.start,
      end: timing.end,
      text: cueText
    });
    if (cues.length > MAX_SUBTITLE_CUES) throw new Error("تعداد زیرنویس‌ها از سقف ۱۰۰۰ مورد بیشتر است.");
  }
  if (cues.length === 0) throw new Error("هیچ زیرنویس زمان‌بندی‌شده‌ای در فایل پیدا نشد.");
  return cues;
}

export function validateCues(cues, options = {}) {
  const errors = [];
  const warnings = [];
  const duration = Number(options.videoDurationSeconds);
  const ordered = [...cues].sort((a, b) => Number(a.start) - Number(b.start) || Number(a.end) - Number(b.end));
  const seen = new Set();
  let previous = null;

  for (const cue of ordered) {
    const id = String(cue?.id ?? "unknown");
    const start = Number(cue?.start);
    const end = Number(cue?.end);
    const value = String(cue?.text ?? "");
    const label = "زیرنویس " + id;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      errors.push({ code: "invalid_interval", cueId: id, message: label + ": بازه زمانی معتبر نیست." });
      previous = cue;
      continue;
    }
    if (!value.trim()) errors.push({ code: "empty_text", cueId: id, message: label + ": متن خالی است." });
    if (value.length > MAX_CUE_TEXT_CHARS) errors.push({ code: "text_too_long", cueId: id, message: label + ": متن بیش از حد طولانی است." });

    const fingerprint = start.toFixed(3) + "|" + end.toFixed(3) + "|" + value.trim();
    if (seen.has(fingerprint)) warnings.push({ code: "duplicate_cue", cueId: id, message: label + ": زیرنویس تکراری است." });
    seen.add(fingerprint);

    const seconds = end - start;
    if (seconds < 0.7) warnings.push({ code: "short_duration", cueId: id, message: label + ": زمان نمایش کمتر از ۰٫۷ ثانیه است." });
    const visibleCharacters = value.replace(/\s/g, "").length;
    if (visibleCharacters / seconds > 20) warnings.push({ code: "reading_speed", cueId: id, message: label + ": سرعت خواندن از ۲۰ نویسه در ثانیه بیشتر است." });
    const lines = value.split("\n");
    if (lines.length > 2) warnings.push({ code: "too_many_lines", cueId: id, message: label + ": بیش از دو خط دارد." });
    if (lines.some(line => line.length > 42)) warnings.push({ code: "long_line", cueId: id, message: label + ": دست‌کم یک خط بیش از ۴۲ نویسه دارد." });
    if (Number.isFinite(duration) && duration > 0 && end > duration + 0.05) {
      warnings.push({ code: "beyond_video", cueId: id, message: label + ": از پایان ویدئو عبور می‌کند." });
    }
    if (previous && Number(previous.end) > start + 0.001) {
      warnings.push({ code: "overlap", cueId: id, message: label + ": با زیرنویس قبلی هم‌پوشانی دارد." });
    }
    previous = cue;
  }

  return {
    errors,
    warnings,
    cueCount: cues.length,
    valid: errors.length === 0
  };
}

function formatTimestamp(value, separator) {
  const total = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("زمان زیرنویس معتبر نیست.");
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const milliseconds = total % 1000;
  const pad = number => String(number).padStart(2, "0");
  return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds) + separator + String(milliseconds).padStart(3, "0");
}

function orderedExport(cues) {
  const report = validateCues(cues);
  if (!report.valid) throw new Error("ابتدا خطاهای ساختاری زیرنویس را برطرف کن.");
  return [...cues].sort((a, b) => Number(a.start) - Number(b.start) || Number(a.end) - Number(b.end));
}

export function serializeSrt(cues) {
  return orderedExport(cues).map((cue, index) =>
    String(index + 1) + "\n" +
    formatTimestamp(cue.start, ",") + " --> " + formatTimestamp(cue.end, ",") + "\n" +
    String(cue.text).trim()
  ).join("\n\n") + "\n";
}

export function serializeVtt(cues) {
  return "WEBVTT\n\n" + orderedExport(cues).map((cue, index) =>
    "cue-" + String(index + 1) + "\n" +
    formatTimestamp(cue.start, ".") + " --> " + formatTimestamp(cue.end, ".") + "\n" +
    String(cue.text).trim()
  ).join("\n\n") + "\n";
}

/**
 * Apply one atomic timing offset to every cue without mutating the input.
 * The operation is bounded to one day in either direction and refuses to
 * move any cue before zero.
 */
export function shiftCueTimings(cues, offsetSeconds) {
  if (!Array.isArray(cues) || cues.length > MAX_SUBTITLE_CUES) {
    throw new TypeError("فهرست زیرنویس‌ها معتبر نیست.");
  }
  if (
    typeof offsetSeconds !== "number" ||
    !Number.isFinite(offsetSeconds) ||
    Math.abs(offsetSeconds) > 86400
  ) {
    throw new Error("مقدار جابه‌جایی باید عددی بین منفی و مثبت ۸۶۴۰۰ ثانیه باشد.");
  }

  const offsetMilliseconds = Math.round(offsetSeconds * 1000);
  if (!Number.isSafeInteger(offsetMilliseconds)) {
    throw new Error("مقدار جابه‌جایی خارج از محدوده امن است.");
  }

  return cues.map((cue, index) => {
    const start = Number(cue?.start);
    const end = Number(cue?.end);
    const startMilliseconds = Math.round(start * 1000);
    const endMilliseconds = Math.round(end * 1000);
    if (
      !Number.isSafeInteger(startMilliseconds) ||
      !Number.isSafeInteger(endMilliseconds) ||
      startMilliseconds < 0 ||
      endMilliseconds <= startMilliseconds
    ) {
      throw new Error("زمان زیرنویس " + String(index + 1) + " معتبر نیست.");
    }

    const shiftedStart = startMilliseconds + offsetMilliseconds;
    const shiftedEnd = endMilliseconds + offsetMilliseconds;
    if (
      !Number.isSafeInteger(shiftedStart) ||
      !Number.isSafeInteger(shiftedEnd) ||
      shiftedStart < 0 ||
      shiftedEnd <= shiftedStart
    ) {
      throw new Error("این جابه‌جایی حداقل یک زیرنویس را قبل از زمان صفر می‌برد.");
    }
    return {
      ...cue,
      start: shiftedStart / 1000,
      end: shiftedEnd / 1000
    };
  });
}
