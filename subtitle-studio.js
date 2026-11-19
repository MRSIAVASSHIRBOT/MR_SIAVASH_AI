import {
  MAX_SUBTITLE_FILE_BYTES,
  MAX_CUE_TEXT_CHARS,
  parseSubtitles,
  serializeSrt,
  serializeVtt,
  shiftCueTimings,
  validateCues
} from "./subtitle-studio-core.mjs";

const $ = selector => document.querySelector(selector);
const cueList = $("#cueList");
const status = $("#studioStatus");
const emptyState = $("#emptyState");
const previewVideo = $("#previewVideo");
const subtitleOverlay = $("#subtitleOverlay");
const qualitySummary = $("#qualitySummary");
const state = { cues: [], videoUrl: null, videoDuration: null, undoCues: null };

function announce(message) {
  status.textContent = message;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cueCard(cue, index) {
  const card = document.createElement("article");
  card.className = "cue-card";
  card.dataset.cueId = cue.id;

  const heading = document.createElement("div");
  heading.className = "cue-heading";
  const title = document.createElement("strong");
  title.textContent = "زیرنویس " + String(index + 1);
  const actions = document.createElement("div");
  actions.className = "cue-actions";

  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "mini-button";
  jump.dataset.action = "jump";
  jump.textContent = "رفتن به زمان";
  jump.setAttribute("aria-label", "رفتن به زمان زیرنویس " + String(index + 1));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mini-button danger";
  remove.dataset.action = "remove";
  remove.textContent = "حذف";
  remove.setAttribute("aria-label", "حذف زیرنویس " + String(index + 1));
  actions.append(jump, remove);
  heading.append(title, actions);

  const metadata = [];
  if (cue.vttIdentifier) metadata.push("شناسه WebVTT: " + String(cue.vttIdentifier));
  if (Array.isArray(cue.vttSettings) && cue.vttSettings.length) {
    metadata.push("تنظیمات: " + cue.vttSettings.join(" "));
  }
  if (metadata.length) {
    const details = document.createElement("p");
    details.className = "muted";
    details.textContent = metadata.join(" · ");
    card.append(details);
  }

  const times = document.createElement("div");
  times.className = "cue-times";
  for (const [field, labelText, value] of [
    ["start", "شروع (ثانیه)", cue.start],
    ["end", "پایان (ثانیه)", cue.end]
  ]) {
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.001";
    input.required = true;
    input.value = Number(value).toFixed(3);
    input.dataset.field = field;
    input.setAttribute("aria-label", labelText + " زیرنویس " + String(index + 1));
    label.append(input);
    times.append(label);
  }

  const textLabel = document.createElement("label");
  textLabel.className = "cue-text-label";
  textLabel.textContent = "متن زیرنویس";
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.maxLength = MAX_CUE_TEXT_CHARS;
  textarea.value = cue.text;
  textarea.dataset.field = "text";
  textarea.setAttribute("aria-label", "متن زیرنویس " + String(index + 1));
  textLabel.append(textarea);

  card.append(heading, times, textLabel);
  return card;
}

function updateQuality() {
  const report = validateCues(state.cues, { videoDurationSeconds: state.videoDuration });
  qualitySummary.replaceChildren();

  const headline = document.createElement("p");
  headline.className = report.valid ? "quality-good" : "quality-error";
  headline.textContent = report.valid
    ? "ساختار زیرنویس قابل خروجی است."
    : String(report.errors.length) + " خطای ساختاری باید اصلاح شود.";
  qualitySummary.append(headline);

  const count = document.createElement("p");
  count.textContent = String(report.cueCount) + " زیرنویس · " +
    String(report.warnings.length) + " هشدار کیفیت";
  qualitySummary.append(count);

  const issues = [...report.errors, ...report.warnings];
  if (issues.length) {
    const list = document.createElement("ul");
    list.className = "quality-issues";
    for (const issue of issues.slice(0, 30)) {
      const item = document.createElement("li");
      item.className = issue.code;
      item.textContent = issue.message;
      list.append(item);
    }
    qualitySummary.append(list);
  } else if (state.cues.length) {
    const success = document.createElement("p");
    success.textContent = "هم‌پوشانی، سرعت خواندن و طول خطوط در محدوده بررسی‌شده مشکلی ندارند.";
    qualitySummary.append(success);
  }

  $("#cueCount").textContent = String(state.cues.length) + " زیرنویس";
  $("#exportSrt").disabled = !state.cues.length || !report.valid;
  $("#exportVtt").disabled = !state.cues.length || !report.valid;
  $("#shiftCues").disabled = state.cues.length === 0;
  $("#undoShift").disabled = !state.undoCues;
  emptyState.hidden = state.cues.length > 0;
}

function renderCues() {
  cueList.replaceChildren();
  state.cues.forEach((cue, index) => cueList.append(cueCard(cue, index)));
  updateQuality();
  updateOverlay();
}

function updateOverlay() {
  if (!state.cues.length || previewVideo.hidden || !Number.isFinite(previewVideo.currentTime)) {
    subtitleOverlay.textContent = "برای نمایش هم‌زمان، یک ویدئو انتخاب کن.";
    return;
  }
  const now = previewVideo.currentTime;
  const active = state.cues.find(cue => now >= Number(cue.start) && now < Number(cue.end));
  subtitleOverlay.textContent = active ? String(active.text) : "";
}

function addCue() {
  state.undoCues = null;
  const previousEnd = state.cues.length
    ? Math.max(...state.cues.map(cue => Number(cue.end) || 0))
    : 0;
  const start = Math.max(0, previousEnd);
  state.cues.push({
    id: "cue-" + String(Date.now()) + "-" + String(state.cues.length + 1),
    start,
    end: start + 2,
    text: ""
  });
  renderCues();
  const last = cueList.lastElementChild;
  last?.querySelector("textarea")?.focus();
  announce("زیرنویس جدید اضافه شد.");
}

$("#cueList").addEventListener("input", event => {
  const field = event.target.dataset.field;
  if (!field) return;
  const card = event.target.closest("[data-cue-id]");
  const cue = state.cues.find(item => item.id === card?.dataset.cueId);
  if (!cue) return;
  cue[field] = field === "text" ? event.target.value : Number(event.target.value);
  state.undoCues = null;
  updateQuality();
  updateOverlay();
});

$("#cueList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest("[data-cue-id]");
  const cue = state.cues.find(item => item.id === card?.dataset.cueId);
  if (!cue) return;
  if (button.dataset.action === "remove") {
    state.cues = state.cues.filter(item => item.id !== cue.id);
    state.undoCues = null;
    renderCues();
    announce("زیرنویس حذف شد.");
  } else if (button.dataset.action === "jump" && !previewVideo.hidden) {
    previewVideo.currentTime = Math.max(0, Number(cue.start) || 0);
    previewVideo.focus();
    updateOverlay();
  }
});

$("#importFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_SUBTITLE_FILE_BYTES) throw new Error("حجم فایل زیرنویس از سقف ۲ مگابایت بیشتر است.");
    const format = file.name.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
    state.cues = parseSubtitles(await file.text(), format);
    state.undoCues = null;
    renderCues();
    announce(String(state.cues.length) + " زیرنویس با موفقیت وارد شد.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "خواندن فایل زیرنویس ناموفق بود.");
  } finally {
    event.target.value = "";
  }
});

$("#videoFile").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("video/") && !/\\.(mp4|mov|webm|m4v|ogv)$/i.test(file.name)) {
    announce("فقط فایل ویدئویی محلی قابل انتخاب است.");
    event.target.value = "";
    return;
  }
  if (file.size > 500 * 1024 * 1024) {
    announce("برای پیش‌نمایش محلی، فایل ویدئو باید حداکثر ۵۰۰ مگابایت باشد.");
    event.target.value = "";
    return;
  }
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoDuration = null;
  state.videoUrl = URL.createObjectURL(file);
  previewVideo.src = state.videoUrl;
  previewVideo.hidden = false;
  subtitleOverlay.textContent = "";
  announce("ویدئو فقط در همین مرورگر پیش‌نمایش می‌شود و بارگذاری شبکه‌ای ندارد.");
});

previewVideo.addEventListener("loadedmetadata", () => {
  state.videoDuration = Number.isFinite(previewVideo.duration) ? previewVideo.duration : null;
  updateQuality();
});
previewVideo.addEventListener("timeupdate", updateOverlay);
previewVideo.addEventListener("seeked", updateOverlay);

$("#shiftCues").addEventListener("click", () => {
  const rawOffset = $("#offsetSeconds").value.trim();
  if (!rawOffset) {
    announce("مقدار جابه‌جایی را وارد کن.");
    return;
  }
  const offset = Number(rawOffset);
  if (!Number.isFinite(offset) || offset === 0) {
    announce(offset === 0 ? "مقدار صفر تغییری ایجاد نمی‌کند." : "مقدار جابه‌جایی معتبر نیست.");
    return;
  }
  try {
    const previous = state.cues.map(cue => ({ ...cue }));
    const shifted = shiftCueTimings(state.cues, offset);
    state.undoCues = previous;
    state.cues = shifted;
    renderCues();
    announce("همه " + String(state.cues.length) + " زیرنویس به اندازه " + String(offset) + " ثانیه جابه‌جا شدند.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "جابه‌جایی گروهی انجام نشد.");
  }
});

$("#undoShift").addEventListener("click", () => {
  if (!state.undoCues) return;
  state.cues = state.undoCues;
  state.undoCues = null;
  renderCues();
  announce("آخرین جابه‌جایی گروهی بازگردانی شد.");
});

$("#offsetSeconds").addEventListener("keydown", event => {
  if (event.key === "Enter" && !$("#shiftCues").disabled) {
    $("#shiftCues").click();
  }
});

$("#addCue").addEventListener("click", addCue);
$("#clearCues").addEventListener("click", () => {
  state.cues = [];
  state.undoCues = null;
  renderCues();
  announce("فهرست زیرنویس‌ها پاک شد.");
});
$("#exportSrt").addEventListener("click", () => {
  try {
    downloadText("subtitles.srt", serializeSrt(state.cues), "application/x-subrip;charset=utf-8");
    announce("فایل SRT آماده شد.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "خروجی SRT ساخته نشد.");
  }
});
$("#exportVtt").addEventListener("click", () => {
  try {
    downloadText("subtitles.vtt", serializeVtt(state.cues), "text/vtt;charset=utf-8");
    announce("فایل WebVTT آماده شد.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "خروجی WebVTT ساخته نشد.");
  }
});

window.addEventListener("pagehide", () => {
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
});
renderCues();
