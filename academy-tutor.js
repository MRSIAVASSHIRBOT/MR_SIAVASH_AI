(() => {
  "use strict";
  const ENDPOINT = "https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev/v1/assistant/chat";
  const form = document.querySelector("#academyTutorForm");
  const input = document.querySelector("#academyTutorMessage");
  const submit = document.querySelector("#academyTutorSubmit");
  const status = document.querySelector("#academyTutorStatus");
  const answer = document.querySelector("#academyTutorAnswer");
  const sources = document.querySelector("#academyTutorSources");
  if (!form || !input || !submit || !status || !answer || !sources) return;

  function safeSource(source) {
    if (!source || typeof source.title !== "string" || typeof source.href !== "string") return null;
    try {
      const url = new URL(source.href, location.href);
      if (url.protocol !== "https:" || url.origin !== location.origin) return null;
      return { title: source.title.slice(0, 120), href: url.href };
    } catch { return null; }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || message.length > 1200) {
      status.textContent = "پیام باید بین ۱ تا ۱۲۰۰ نویسه باشد.";
      return;
    }
    submit.disabled = true;
    status.textContent = "در حال بررسی منابع آموزشی و آماده‌سازی پاسخ...";
    answer.textContent = "";
    sources.replaceChildren();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || "سرویس آموزشی پاسخ نداد.");
      if (typeof data.answer !== "string" || data.answer.length > 12000) throw new Error("ساختار پاسخ سرویس معتبر نیست.");
      answer.textContent = data.answer;
      for (const item of Array.isArray(data.sources) ? data.sources.slice(0, 6) : []) {
        const source = safeSource(item);
        if (!source) continue;
        const link = document.createElement("a");
        link.href = source.href;
        link.textContent = source.title;
        link.rel = "noopener noreferrer";
        sources.append(link);
      }
      status.textContent = data.mode === "ai_grounded"
        ? "پاسخ با کمک هوش مصنوعی و بر پایه منابع تأییدشده سایت تولید شد."
        : "پاسخ از دانش تأییدشده سایت بازیابی شد؛ پاسخ حدسی ارائه نمی‌شود.";
      if (data.handoff) status.textContent += " برای این موضوع منبع کافی پیدا نشد.";
    } catch (error) {
      status.textContent = error.name === "AbortError"
        ? "زمان پاسخ‌گویی تمام شد؛ کمی بعد دوباره تلاش کن."
        : "دستیار فعلاً در دسترس نیست. " + (error.message || "اتصال را بررسی کن.");
    } finally {
      window.clearTimeout(timeout);
      submit.disabled = false;
    }
  });
})();
