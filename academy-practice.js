import { getAcademyChallenges, getAcademyChallenge, normalizeAcademyPracticeState, gradeAcademyChallenge, recordAcademyPracticeAttempt, serializeAcademyPracticeState, getAcademyPracticeStorageKey } from "./academy-practice.mjs";

(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const root = $("#academyPractice");
  if (!root) return;
  const picker = $("#academyPracticeList");
  const title = $("#academyPracticeTitle");
  const brief = $("#academyPracticeBrief");
  const hint = $("#academyPracticeHint");
  const editor = $("#academyPracticeCode");
  const output = $("#academyPracticeOutput");
  const status = $("#academyPracticeStatus");
  const runButton = $("#academyPracticeRun");
  const frame = $("#academyPracticeRunner");
  const KEY = getAcademyPracticeStorageKey();
  let selected = getAcademyChallenges()[0]?.id;
  let pending = null;\n  let runnerReady = false;
  let timeout = 0;
  let state = normalizeAcademyPracticeState(readStored());

  function readStored() { try { return localStorage.getItem(KEY) || "{}"; } catch { return "{}"; } }
  function save() { try { localStorage.setItem(KEY, serializeAcademyPracticeState(state)); } catch { status.textContent = "ذخیره محلی در دسترس نیست؛ نتیجه فقط در همین نشست باقی می‌ماند."; } }
  function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
  function renderList() {
    picker.replaceChildren();
    for (const challenge of getAcademyChallenges()) {
      const button = el("button", "academy-practice-choice", challenge.title + (state.completed.includes(challenge.id) ? " · تکمیل‌شده" : ""));
      button.type = "button";
      button.setAttribute("aria-pressed", String(challenge.id === selected));
      button.addEventListener("click", () => select(challenge.id));
      picker.append(button);
    }
  }
  function select(id) {
    const challenge = getAcademyChallenge(id);
    if (!challenge) return;
    selected = id;
    title.textContent = challenge.title;
    brief.textContent = challenge.brief;
    hint.textContent = challenge.hint;
    editor.value = challenge.starter;
    output.textContent = "خروجی اجرا اینجا نمایش داده می‌شود.";
    status.textContent = (state.attempts[id] || 0) + " تلاش · " + (state.completed.includes(id) ? "تمرین تکمیل شده" : "در انتظار حل");
    renderList();
  }
  function resetRunner() {
    frame.src = "./academy-runner.html";
  }
  function run() {
    if (pending) { status.textContent = "یک اجرا در حال انجام است."; return; }
    const code = editor.value;
    if (!code.trim() || code.length > 4000) { status.textContent = "کد باید بین ۱ تا ۴۰۰۰ نویسه باشد."; return; }
    if (!runnerReady || !frame.contentWindow) { status.textContent = "محیط اجرا هنوز آماده نیست؛ کمی صبر کن."; return; }
    const requestId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    pending = { requestId, challengeId: selected };
    runButton.disabled = true;
    output.textContent = "در حال اجرا...";
    status.textContent = "کد در قاب جداشده و بدون دسترسی شبکه اجرا می‌شود.";
    timeout = window.setTimeout(() => {
      if (!pending || pending.requestId !== requestId) return;
      pending = null;
      runButton.disabled = false;
      output.textContent = "زمان اجرا از حد مجاز رابط بیشتر شد؛ محیط اجرا بازنشانی شد.";
      status.textContent = "اجرای طولانی متوقف شد. کد را بررسی کن.";
      resetRunner();
    }, 1800);
    frame.contentWindow.postMessage({ type: "academy-run", requestId, code }, "*");
  }
  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || !pending || !event.data || event.data.type !== "academy-result" || event.data.requestId !== pending.requestId) return;
    window.clearTimeout(timeout);
    const challengeId = pending.challengeId;
    pending = null;
    runButton.disabled = false;
    const lines = Array.isArray(event.data.output) ? event.data.output.slice(0, 20).map(value => String(value).slice(0, 500)) : [];
    output.textContent = (lines.length ? lines.join("\n") : "خروجی متنی تولید نشد.") + (event.data.error ? "\nخطا: " + String(event.data.error).slice(0, 500) : "");
    if (event.data.error) { status.textContent = "کد با خطا متوقف شد؛ پیام خطا را بررسی کن."; return; }
    const result = gradeAcademyChallenge(challengeId, lines);
    state = recordAcademyPracticeAttempt(state, challengeId, result.passed);
    save();
    status.textContent = result.message + " · " + state.attempts[challengeId] + " تلاش";
    renderList();
  });
  runButton.addEventListener("click", run);
  $("#academyPracticeReset").addEventListener("click", () => select(selected));
  frame.addEventListener("load", () => { runnerReady = true; if (!pending) runButton.disabled = false; });
  frame.addEventListener("error", () => { runButton.disabled = true; status.textContent = "بارگذاری محیط اجرای تمرین ناموفق بود."; });
  renderList();
  select(selected);
})();
