(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const ASSISTANT_API = "https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev/v1/assistant/chat";
  const normalise = value => String(value || "").normalize("NFKC").toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  let knowledge = [], loaded = false, loading = null, assistantMode = "local";

  function message(text, role = "assistant", sources = []) {
    const paragraph = document.createElement("p");
    paragraph.className = "assistant-bubble" + (role === "user" ? " user" : "");
    paragraph.textContent = text;
    $("#assistantMessages").append(paragraph);
    if (role === "assistant" && sources.length) {
      const refs = document.createElement("div");
      refs.className = "assistant-sources";
      for (const source of sources.slice(0, 3)) {
        try {
          const url = new URL(source.href, location.href);
          if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) continue;
          const link = document.createElement("a");
          link.href = url.href;
          link.textContent = String(source.title || "منبع مرتبط");
          refs.append(link);
        } catch {}
      }
      if (refs.childElementCount) $("#assistantMessages").append(refs);
    }
    const container = $("#assistantMessages");
    container.scrollTop = container.scrollHeight;
  }

  function tab(name) {
    document.querySelectorAll("[data-support-tab]").forEach(button =>
      button.setAttribute("aria-selected", String(button.dataset.supportTab === name)));
    document.querySelectorAll("[data-support-pane]").forEach(pane => {
      const active = pane.dataset.supportPane === name;
      pane.classList.toggle("is-active", active);
      pane.hidden = !active;
    });
  }

  function setAssistantMode(mode) {
    if (mode !== "local" && mode !== "online") return;
    assistantMode = mode;
    document.querySelectorAll("[data-assistant-mode]").forEach(button =>
      button.setAttribute("aria-pressed", String(button.dataset.assistantMode === mode)));
    const consent = $("#assistantOnlineConsent");
    if (consent) consent.checked = false;
    const consentLabel = $("#assistantOnlineConsentLabel");
    if (consentLabel) consentLabel.hidden = mode !== "online";
    const notice = $("#assistantOnlineNotice");
    if (notice) notice.hidden = mode !== "online";
    const description = $("#assistantModeDescription");
    if (description) description.textContent = mode === "local"
      ? "راهنمای محلی سایت · پرسش در همین مرورگر جست‌وجو می‌شود و به سرور ارسال نمی‌شود."
      : "دستیار هوشمند آنلاین · فقط پس از تأیید جداگانه، متن سؤال جاری به Gateway و در صورت فعال‌بودن به Workers AI ارسال می‌شود.";
    const submit = $("#assistantForm")?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = mode === "local" ? "یافتن راهنما" : "ارسال سؤال به دستیار آنلاین";
    const status = $("#assistantOnlineStatus");
    if (status) status.textContent = "";
  }

  const readJson = (path, maxBytes) => window.MRSIAVASHReadJson(path, maxBytes);
  async function loadKnowledge() {
    if (loading) return loading;
    loading = (async () => {
      const [indexResult, moduleResult] = await Promise.allSettled([
        readJson("./search-index.json", 96 * 1024), readJson("./modules.json", 64 * 1024)
      ]);
      const items = [];
      if (indexResult.status === "fulfilled") {
        const index = indexResult.value;
        if (index?.schema === "mr-siavash-ai-search-index" && index.version === 1 &&
            Array.isArray(index.items) && index.items.length <= 100) {
          for (const item of index.items) {
            if (!item || typeof item.title !== "string" || typeof item.description !== "string" || item.type === "action") continue;
            const href = typeof item.href === "string" ? item.href :
              item.view === "home" ? "./index.html#home" : item.view === "modules" ? "./index.html#modules" :
              item.view === "workspace" ? "./index.html#workspace" : item.view === "identity" ? "./index.html#identity" :
              item.view === "about" ? "./index.html#about" : null;
            if (href && href.startsWith("./") && !href.startsWith("../") && !href.includes("://"))
              items.push({ title: item.title, description: item.description, href, terms: Array.isArray(item.terms) ? item.terms : [] });
          }
        }
      }
      if (moduleResult.status === "fulfilled") {
        const registry = moduleResult.value;
        if (registry?.schema === "mr-siavash-ai-module-registry" && registry.version === 1 && Array.isArray(registry.modules)) {
          for (const item of registry.modules) {
            if (typeof item?.title !== "string" || typeof item?.description !== "string") continue;
            items.push({ title: item.title, description: item.description, href: "./index.html#modules",
              terms: [item.id, item.categoryLabel, ...(Array.isArray(item.features) ? item.features : [])] });
          }
        }
      }
      knowledge = items;
      if (!knowledge.length) throw new Error("فهرست راهنمای محلی بارگذاری نشد.");
      loaded = true;
    })();
    try { return await loading; } finally { loading = null; }
  }

  function rank(query) {
    const q = normalise(query), terms = [...new Set(q.split(/\s+/).filter(Boolean))];
    if (!terms.length) return [];
    return knowledge.map(item => {
      const title = normalise(item.title), body = normalise([item.description, ...item.terms].join(" "));
      let score = title === q ? 100 : title.startsWith(q) ? 55 : title.includes(q) ? 35 : 0, matched = 0;
      for (const term of terms) {
        let hit = false;
        if (title.includes(term)) { score += title.startsWith(term) ? 14 : 10; hit = true; }
        if (body.includes(term)) { score += 4; hit = true; }
        if (hit) matched++;
      }
      if (matched === terms.length) score += 12;
      return { item, score };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  async function askOnline(query) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 15000) : null;
    let response, data = {};
    try {
      response = await window.fetch(ASSISTANT_API, {
        method: "POST", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
        ...(controller ? { signal: controller.signal } : {})
      });
      try { data = await response.json(); } catch (error) { if (error?.name === "AbortError") throw error; }
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("پاسخ آنلاین بیش از ۱۵ ثانیه طول کشید؛ اتصال را بررسی کن یا از راهنمای محلی استفاده کن.");
      }
      throw new Error("ارتباط آنلاین برقرار نشد؛ اتصال را بررسی کن یا از راهنمای محلی استفاده کن.");
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error("تعداد درخواست‌ها زیاد شده است؛ کمی بعد دوباره تلاش کن.");
      if (response.status === 503) throw new Error("سرویس هوشمند فعلاً آماده نیست. راهنمای محلی همچنان در دسترس است.");
      throw new Error("دریافت پاسخ آنلاین ناموفق بود. راهنمای محلی همچنان در دسترس است.");
    }
    if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("پاسخ معتبری از سرویس دریافت نشد.");
    const prefix = data.mode === "ai_grounded" ? "پاسخ دستیار هوشمند بر پایه محتوای تأییدشده سایت:\n" :
      data.handoff ? "در محتوای تأییدشده سایت پاسخ کافی پیدا نشد:\n" : "پاسخ از دانش تأییدشده سایت:\n";
    const sources = Array.isArray(data.sources) ? data.sources.filter(source =>
      source && typeof source.title === "string" && typeof source.href === "string") : [];
    message(prefix + data.answer, "assistant", sources);
  }

  async function ask(event) {
    event.preventDefault();
    const input = $("#assistantInput"), query = input.value.trim();
    if (!query) return;
    const requestMode = assistantMode;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const consent = $("#assistantOnlineConsent");
    if (requestMode === "online" && !consent?.checked) {
      const status = $("#assistantOnlineStatus");
      if (status) status.textContent = "برای ارسال این سؤال به سرور، ابتدا اطلاعیه را بخوان و تأیید کن.";
      consent?.focus();
      return;
    }
    input.value = "";
    message(query, "user");
    button.disabled = true;
    try {
      if (requestMode === "online") await askOnline(query);
      else {
        if (!loaded) await loadKnowledge();
        const found = rank(query);
        if (!found.length) {
          message("در محتوای منتشرشدهٔ سایت، پاسخ مرتبط و قابل اتکایی پیدا نکردم. می‌توانی با جست‌وجوی اصلی سایت عبارت دیگری را امتحان کنی.");
          return;
        }
        const first = found[0].item;
        message("نزدیک‌ترین راهنمای موجود: " + first.title + "\n" + first.description +
          "\n\nبرای جزئیات بیشتر، یکی از منابع مرتبط زیر را باز کن.", "assistant",
          found.map(result => ({ title: result.item.title, href: result.item.href })));
      }
    } catch (error) {
      const status = $("#assistantOnlineStatus");
      if (requestMode === "online" && status) status.textContent = error.message || "ارتباط آنلاین برقرار نشد.";
      else message("راهنمای محلی فعلاً بارگذاری نشد. لطفاً اتصال را بررسی و دوباره تلاش کن.");
    } finally {
      button.disabled = false;
      if (requestMode === "online" && consent) consent.checked = false;
      input.focus();
    }
  }

  function init() {
    const support = $("#supportDialog");
    if (!support) return;
    $("#supportLauncher").addEventListener("click", () => support.showModal());
    $("#supportClose").addEventListener("click", () => support.close());
    document.querySelectorAll("[data-support-tab]").forEach(button =>
      button.addEventListener("click", () => tab(button.dataset.supportTab)));
    document.querySelectorAll("[data-assistant-mode]").forEach(button =>
      button.addEventListener("click", () => setAssistantMode(button.dataset.assistantMode)));
    $("#assistantForm").addEventListener("submit", ask);
    setAssistantMode("local");
    loadKnowledge().catch(() => {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();