(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = "mr-siavash-ai.workspace.v2";
  const LEGACY_STORAGE_KEY = "mr-siavash-ai.workspace.tasks.v1";
  const FAVORITES_KEY = "mr-siavash-ai.favorites.v1";
  const MAX_TASKS = 100;
  const MAX_REGISTRY_BYTES = 64 * 1024;
  const MAX_IMPORT_BYTES = 256 * 1024;

  let modules = [];

  let activeFilter = "all";
  let activeTaskFilter = "all";
  let selectedModule = null;
  let toastTimer = null;
  let installPrompt = null;
  let storageAvailable = true;
  let tasks = [];
  let favorites = new Set();

  function validateModuleRegistry(registry) {
    const rootKeys = new Set(["schema", "version", "modules"]);
    if (!registry || typeof registry !== "object" || Array.isArray(registry) ||
        Object.keys(registry).some(key => !rootKeys.has(key)) ||
        Object.keys(registry).length !== rootKeys.size ||
        registry.schema !== "mr-siavash-ai-module-registry" || registry.version !== 1 ||
        !Array.isArray(registry.modules) || registry.modules.length < 1 || registry.modules.length > 50) {
      throw new Error("ساختار فهرست ماژول‌ها معتبر نیست.");
    }

    const allowedFields = new Set([
      "id", "category", "categoryLabel", "symbol", "title", "description",
      "status", "type", "features", "featured"
    ]);
    const allowedCategories = new Set(["ai", "dev", "learn", "create", "workspace"]);
    const seenIds = new Set();

    return Object.freeze(registry.modules.map(module => {
      if (!module || typeof module !== "object" || Array.isArray(module) ||
          Object.keys(module).some(key => !allowedFields.has(key)) ||
          Object.keys(module).length !== allowedFields.size) {
        throw new Error("یکی از ماژول‌ها فیلدهای مورد انتظار را ندارد.");
      }
      if (typeof module.id !== "string" || !/^[a-z0-9-]{2,64}$/.test(module.id) || seenIds.has(module.id)) {
        throw new Error("شناسه ماژول نامعتبر یا تکراری است.");
      }
      seenIds.add(module.id);
      if (!allowedCategories.has(module.category) ||
          typeof module.categoryLabel !== "string" || !module.categoryLabel.trim() || module.categoryLabel.length > 40 ||
          typeof module.symbol !== "string" || !module.symbol.trim() || module.symbol.length > 8 ||
          typeof module.title !== "string" || !module.title.trim() || module.title.length > 80 ||
          typeof module.description !== "string" || !module.description.trim() || module.description.length > 280 ||
          typeof module.featured !== "boolean" || !Array.isArray(module.features) ||
          module.features.length < 1 || module.features.length > 8 ||
          module.features.some(feature => typeof feature !== "string" || !feature.trim() || feature.length > 120)) {
        throw new Error("فراداده یکی از ماژول‌ها خارج از محدوده مجاز است.");
      }
      const validRoadmap = module.type === "ROADMAP" && module.status === "در نقشه راه";
      const validLocal = module.type === "LOCAL" && module.status === "فعال در همین مرورگر";
      if (!validRoadmap && !validLocal) throw new Error("وضعیت پیاده‌سازی ماژول معتبر نیست.");
      return Object.freeze({ ...module, features: Object.freeze([...module.features]) });
    }));
  }

  async function loadModuleRegistry() {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 5000) : null;
    try {
      const options = { credentials: "omit", cache: "no-cache" };
      if (controller) options.signal = controller.signal;
      const response = await fetch("./modules.json", options);
      if (!response.ok) throw new Error("دریافت فهرست ماژول‌ها ناموفق بود.");
      const contentType = response.headers && response.headers.get("content-type") || "";
      if (!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(contentType)) {
        throw new Error("نوع محتوای فهرست ماژول‌ها معتبر نیست.");
      }

      const declaredLength = Number(response.headers && response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_REGISTRY_BYTES) {
        throw new Error("حجم فهرست ماژول‌ها از حد مجاز بیشتر است.");
      }

      let payload;
      if (response.body && typeof response.body.getReader === "function") {
        const reader = response.body.getReader();
        const chunks = [];
        let totalBytes = 0;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            totalBytes += result.value.byteLength;
            if (totalBytes > MAX_REGISTRY_BYTES) {
              await reader.cancel();
              throw new Error("حجم فهرست ماژول‌ها از حد مجاز بیشتر است.");
            }
            chunks.push(result.value);
          }
        } finally {
          if (typeof reader.releaseLock === "function") reader.releaseLock();
        }
        const bytes = new Uint8Array(totalBytes);
        let offset = 0;
        chunks.forEach(chunk => {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        });
        payload = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else {
        payload = await response.text();
        if (new TextEncoder().encode(payload).byteLength > MAX_REGISTRY_BYTES) {
          throw new Error("حجم فهرست ماژول‌ها از حد مجاز بیشتر است.");
        }
      }

      const registry = JSON.parse(payload);
      modules = validateModuleRegistry(registry);
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  function setRegistryStatus(message, visible, loading = false) {
    const panel = $("#registryStatus");
    const detail = $("#registryStatusMessage");
    const button = $("#retryRegistryButton");
    if (!panel || !detail || !button) return;
    detail.textContent = message;
    panel.hidden = !visible;
    button.disabled = loading;
    button.textContent = loading ? "در حال بررسی..." : "تلاش دوباره";
  }

  async function retryModuleRegistry() {
    const button = $("#retryRegistryButton");
    if (!button || button.disabled) return;
    setRegistryStatus("در حال دریافت و اعتبارسنجی فهرست ماژول‌ها...", true, true);
    try {
      await loadModuleRegistry();
      renderFeatured();
      renderCatalog();
      setRegistryStatus("", false);
      showToast("فهرست ماژول‌ها با موفقیت بارگذاری شد.");
    } catch (error) {
      console.error("Module registry retry failed:", error);
      setRegistryStatus("بارگذاری ناموفق بود. اتصال را بررسی کن و دوباره تلاش کن.", true, false);
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function persist(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      showToast("ذخیره‌سازی مرورگر در دسترس نیست؛ تغییرات ممکن است موقت باشند.");
      updateStorageNote();
      return false;
    }
  }

  function updateStorageNote() {
    const note = $("#storageNote");
    if (!note) return;
    note.textContent = storageAvailable
      ? "کارها و نشان‌ها فقط در حافظه همین مرورگر ذخیره می‌شوند. برای انتقال، خروجی پشتیبان بگیر."
      : "ذخیره‌سازی محلی در دسترس نیست؛ تغییرات تا زمان بسته‌شدن صفحه ممکن است موقت بمانند.";
  }

  function showView(viewName, options = {}) {
    const target = $("#view-" + viewName);
    if (!target) return;
    $$(".view").forEach(view => {
      const active = view === target;
      view.classList.toggle("is-active", active);
      view.hidden = !active;
    });
    $$(".main-nav [data-view]").forEach(button => {
      const active = button.dataset.view === viewName;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (options.updateHistory !== false) {
      const nextHash = "#" + viewName;
      if (window.location.hash !== nextHash) window.history.pushState({ view: viewName }, "", nextHash);
    }
    if (options.scroll !== false) $("#main-content").scrollIntoView({ behavior: "smooth", block: "start" });
    closeMobileMenu();
    if (viewName === "modules") renderCatalog();
  }

  function closeMobileMenu() {
    const nav = $("#mainNav");
    const button = $("#mobileMenuButton");
    if (nav) nav.classList.remove("is-open");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "باز کردن ناوبری");
    }
  }

  function parseRoute() {
    const hash = window.location.hash || "#home";
    const moduleMatch = hash.match(/^#module=([a-z0-9-]+)$/i);
    if (moduleMatch) {
      showView("modules", { updateHistory: false, scroll: false });
      openModule(moduleMatch[1], { updateHistory: false });
      return;
    }
    const viewName = hash.slice(1);
    if (["home", "modules", "workspace", "about"].includes(viewName)) {
      if ($("#moduleDialog").open) $("#moduleDialog").close();
      showView(viewName, { updateHistory: false, scroll: false });
    } else {
      showView("home", { updateHistory: false, scroll: false });
    }
  }

  function makeCard(module) {
    const article = document.createElement("article");
    article.className = "module-card";
    article.dataset.moduleId = module.id;

    const top = document.createElement("div");
    top.className = "card-top";
    const icon = document.createElement("span");
    icon.className = "module-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = module.symbol;
    const status = document.createElement("span");
    status.className = "module-status" + (module.type === "LOCAL" ? " local" : "");
    status.textContent = module.status;
    top.append(icon, status);

    const title = document.createElement("h3");
    title.textContent = module.title;
    const description = document.createElement("p");
    description.textContent = module.description;

    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = module.categoryLabel;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "card-save" + (favorites.has(module.id) ? " is-saved" : "");
    save.dataset.favoriteId = module.id;
    save.setAttribute("aria-pressed", String(favorites.has(module.id)));
    save.setAttribute("aria-label", favorites.has(module.id) ? "حذف از نشان‌شده‌ها" : "افزودن به نشان‌شده‌ها");
    save.title = favorites.has(module.id) ? "حذف از نشان‌شده‌ها" : "افزودن به نشان‌شده‌ها";
    save.textContent = favorites.has(module.id) ? "★" : "☆";

    const details = document.createElement("button");
    details.type = "button";
    details.className = "card-details";
    details.dataset.openModule = module.id;
    details.textContent = "جزئیات ↙";
    actions.append(save, details);
    bottom.append(category, actions);
    article.append(top, title, description, bottom);
    return article;
  }

  function renderFeatured() {
    const container = $("#featuredGrid");
    container.replaceChildren();
    modules.filter(item => item.featured).forEach(item => container.append(makeCard(item)));
  }

  function renderCatalog() {
    const container = $("#catalogGrid");
    const query = ($("#moduleSearch").value || "").trim().toLocaleLowerCase("fa");
    const filtered = modules.filter(item => {
      const matchesCategory = activeFilter === "all" || (activeFilter === "saved" ? favorites.has(item.id) : item.category === activeFilter);
      const searchable = [item.title, item.description, item.categoryLabel, ...item.features].join(" ").toLocaleLowerCase("fa");
      return matchesCategory && (!query || searchable.includes(query));
    });
    container.replaceChildren();
    filtered.forEach(item => container.append(makeCard(item)));
    $("#catalogEmpty").hidden = filtered.length !== 0;
    const count = $("#savedCount");
    if (count) count.textContent = new Intl.NumberFormat("fa-IR").format(favorites.size);
  }

  function setFilter(filter) {
    activeFilter = filter;
    $$("#filterList [data-filter]").forEach(button => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderCatalog();
  }

  function openModule(id, options = {}) {
    const module = modules.find(item => item.id === id);
    if (!module) {
      showToast("این ماژول در فهرست فعلی پیدا نشد.");
      return;
    }
    selectedModule = module;
    $("#dialogSymbol").textContent = module.symbol;
    $("#dialogCategory").textContent = module.categoryLabel.toLocaleUpperCase("fa");
    $("#dialogTitle").textContent = module.title;
    $("#dialogDescription").textContent = module.description;
    $("#dialogStatus").textContent = module.status;
    const list = $("#dialogFeatures");
    list.replaceChildren();
    module.features.forEach(feature => {
      const li = document.createElement("li");
      li.textContent = feature;
      list.append(li);
    });
    const favoriteButton = $("#dialogFavorite");
    favoriteButton.textContent = favorites.has(module.id) ? "★ نشان‌شده" : "☆ نشان‌کردن";
    favoriteButton.setAttribute("aria-pressed", String(favorites.has(module.id)));
    if (options.updateHistory !== false) {
      const nextHash = "#module=" + encodeURIComponent(module.id);
      if (window.location.hash !== nextHash) window.history.pushState({ module: module.id }, "", nextHash);
    }
    const dialog = $("#moduleDialog");
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else showToast("جزئیات ماژول: " + module.title);
  }

  function toggleFavorite(id) {
    const nextFavorites = new Set(favorites);
    if (nextFavorites.has(id)) nextFavorites.delete(id);
    else nextFavorites.add(id);
    if (!persist(FAVORITES_KEY, Array.from(nextFavorites))) return false;
    favorites = nextFavorites;
    renderFeatured();
    renderCatalog();
    if (selectedModule && selectedModule.id === id) {
      const button = $("#dialogFavorite");
      button.textContent = favorites.has(id) ? "★ نشان‌شده" : "☆ نشان‌کردن";
      button.setAttribute("aria-pressed", String(favorites.has(id)));
    }
    showToast(favorites.has(id) ? "ماژول به نشان‌شده‌ها اضافه شد." : "ماژول از نشان‌شده‌ها حذف شد.");
    return true;
  }

  function closeDialog() {
    const dialog = $("#moduleDialog");
    if (dialog.open) dialog.close();
  }

  function loadWorkspace() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
      else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const oldTasks = JSON.parse(legacy);
          parsed = { version: 2, tasks: Array.isArray(oldTasks) ? oldTasks : [] };
        }
      }
    } catch (error) {
      storageAvailable = false;
      parsed = null;
    }
    const rawTasks = parsed && Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const seenTaskIds = new Set();
    tasks = rawTasks.filter(task => task && typeof task.text === "string" && typeof task.done === "boolean")
      .slice(0, MAX_TASKS)
      .map(task => {
        const text = task.text.trim().replace(/\s+/g, " ").slice(0, 120);
        let id = typeof task.id === "string" ? task.id.trim() : "";
        if (!id || seenTaskIds.has(id)) id = createId();
        seenTaskIds.add(id);
        return { id, text, done: task.done };
      })
      .filter(task => task.text.length > 0);
    try {
      const rawFavorites = localStorage.getItem(FAVORITES_KEY);
      const parsedFavorites = rawFavorites ? JSON.parse(rawFavorites) : [];
      favorites = new Set(Array.isArray(parsedFavorites) ? parsedFavorites.filter(id => modules.some(module => module.id === id)) : []);
    } catch (error) {
      favorites = new Set();
      storageAvailable = false;
    }
    updateStorageNote();
  }

  function saveWorkspace(nextTasks = tasks) {
    const saved = persist(STORAGE_KEY, { version: 2, updatedAt: new Date().toISOString(), tasks: nextTasks });
    updateStorageNote();
    return saved;
  }

  function renderTasks() {
    const list = $("#taskList");
    list.replaceChildren();
    const query = ($("#taskSearch").value || "").trim().toLocaleLowerCase("fa");
    const visibleTasks = tasks.filter(task => {
      const matchesStatus = activeTaskFilter === "all" ||
        (activeTaskFilter === "open" && !task.done) ||
        (activeTaskFilter === "done" && task.done);
      return matchesStatus && (!query || task.text.toLocaleLowerCase("fa").includes(query));
    });
    visibleTasks.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " is-done" : "");
      li.dataset.taskId = task.id;
      const checkbox = document.createElement("input");
      checkbox.className = "task-check";
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", task.done ? "علامت‌گذاری به‌عنوان باز" : "علامت‌گذاری به‌عنوان انجام‌شده");
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const remove = document.createElement("button");
      remove.className = "task-remove";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "حذف کار");
      li.append(checkbox, text, remove);
      list.append(li);
    });
    const pending = tasks.filter(task => !task.done).length;
    const completed = tasks.length - pending;
    const format = value => new Intl.NumberFormat("fa-IR").format(value);
    $("#taskCount").textContent = format(pending) + " کار باز";
    $("#taskOpenCount").textContent = format(pending);
    $("#taskDoneCount").textContent = format(completed);
    $("#taskEmpty").hidden = tasks.length !== 0;
    $("#taskNoResults").hidden = tasks.length === 0 || visibleTasks.length !== 0;
    $("#clearCompletedTasks").hidden = completed === 0;
  }

  function setTaskFilter(filter) {
    activeTaskFilter = filter;
    $$("#taskFilters [data-task-filter]").forEach(button => {
      const selected = button.dataset.taskFilter === filter;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderTasks();
  }

  function addTask(text) {
    const clean = String(text || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (!clean) return;
    if (tasks.some(task => task.text.toLocaleLowerCase("fa") === clean.toLocaleLowerCase("fa") && !task.done)) {
      showToast("این کار از قبل در فهرست کارهای باز وجود دارد.");
      return;
    }
    if (tasks.length >= MAX_TASKS) {
      showToast("فضای کار به سقف ۱۰۰ کار رسیده است؛ ابتدا یک کار را حذف یا تکمیل کن.");
      return;
    }
    const nextTasks = [{ id: createId(), text: clean, done: false }, ...tasks];
    if (!saveWorkspace(nextTasks)) return false;
    tasks = nextTasks;
    renderTasks();
    showToast("به فضای کار اضافه شد.");
    return true;
  }

  function exportWorkspace() {
    const data = {
      schema: "mr-siavash-ai-workspace",
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      favorites: Array.from(favorites)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mr-siavash-ai-workspace-backup.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("فایل پشتیبان آماده شد.");
  }

  async function importWorkspace(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast("حجم فایل بیشتر از حد مجاز ۲۵۶ کیلوبایت است.");
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.schema !== "mr-siavash-ai-workspace" || data.version !== 1 || !Array.isArray(data.tasks)) {
        throw new Error("فرمت فایل پشتیبان معتبر نیست.");
      }
      if (data.tasks.length > MAX_TASKS) {
        throw new Error("فایل پشتیبان بیش از ۱۰۰ کار دارد؛ آن را به چند فایل کوچک‌تر تقسیم کن.");
      }
      if (data.favorites !== undefined && (!Array.isArray(data.favorites) ||
          data.favorites.some(id => typeof id !== "string"))) {
        throw new Error("ساختار نشان‌شده‌ها در فایل پشتیبان معتبر نیست.");
      }
      const incoming = data.tasks.map((task, index) => {
        if (!task || typeof task.text !== "string" || typeof task.done !== "boolean" ||
            !task.text.trim()) {
          throw new Error("ساختار کار شماره " + (index + 1) + " معتبر نیست؛ هیچ داده‌ای وارد نشد.");
        }
        return {
          id: createId(),
          text: task.text.trim().replace(/\s+/g, " ").slice(0, 120),
          done: task.done
        };
      });
      const existing = new Set(tasks.map(task => task.text.toLocaleLowerCase("fa")));
      const unique = incoming.filter(task => {
        const key = task.text.toLocaleLowerCase("fa");
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      const availableSlots = Math.max(0, MAX_TASKS - tasks.length);
      const accepted = unique.slice(0, availableSlots);
      const skipped = unique.length - accepted.length;
      const nextTasks = [...accepted, ...tasks];
      const nextFavorites = new Set(favorites);
      const importsFavorites = Array.isArray(data.favorites);
      if (importsFavorites) {
        data.favorites.filter(id => modules.some(module => module.id === id)).forEach(id => nextFavorites.add(id));
        if (!persist(FAVORITES_KEY, Array.from(nextFavorites))) return;
      }
      if (!saveWorkspace(nextTasks)) {
        if (importsFavorites) persist(FAVORITES_KEY, Array.from(favorites));
        return;
      }
      tasks = nextTasks;
      favorites = nextFavorites;
      renderTasks();
      renderCatalog();
      if (accepted.length) {
        const suffix = skipped ? "؛ " + skipped + " کار به‌دلیل تکمیل ظرفیت وارد نشد." : "";
        showToast(accepted.length + " کار بازیابی شد" + suffix);
      } else if (skipped) {
        showToast("فضای کار ظرفیت خالی ندارد؛ هیچ کاری از پشتیبان اضافه نشد.");
      } else {
        showToast("اطلاعات جدیدی برای افزودن وجود نداشت.");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "خواندن فایل پشتیبان ناموفق بود.");
    }
  }

  function updateNetworkStatus() {
    const element = $("#networkStatus");
    if (!element) return;
    const online = navigator.onLine;
    element.classList.toggle("is-offline", !online);
    const label = $("span:last-child", element);
    if (label) label.textContent = online ? "اتصال مرورگر: آنلاین" : "اتصال مرورگر: آفلاین";
    element.setAttribute("aria-label", online ? "مرورگر اتصال شبکه را گزارش می‌کند" : "مرورگر بدون اتصال شبکه است");
  }

  async function registerOfflineShell() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      registration.addEventListener("updatefound", () => showToast("نسخه جدید برنامه برای نصب آماده می‌شود."));
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  }

  function initInstallPrompt() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      $("#installButton").hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      $("#installButton").hidden = true;
      showToast("برنامه به دستگاه اضافه شد.");
    });
    $("#installButton").addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $("#installButton").hidden = true;
    });
  }

  function initNavigation() {
    $$("[data-view]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault();
      showView(button.dataset.view);
    }));
    $("#mobileMenuButton").addEventListener("click", () => {
      const nav = $("#mainNav");
      const button = $("#mobileMenuButton");
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "بستن ناوبری" : "باز کردن ناوبری");
    });
    window.addEventListener("popstate", parseRoute);
    window.addEventListener("hashchange", parseRoute);
    document.addEventListener("keydown", event => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" &&
          !typing && !$("#moduleDialog").open) {
        event.preventDefault();
        showView("modules");
        $("#moduleSearch").focus();
      } else if (event.key === "/" && !typing && !$("#moduleDialog").open) {
        event.preventDefault();
        showView("modules");
        $("#moduleSearch").focus();
      } else if (event.key === "Escape") {
        closeMobileMenu();
      }
    });
  }

  function initCatalog() {
    $("#moduleSearch").addEventListener("input", renderCatalog);
    $("#filterList").addEventListener("click", event => {
      const button = event.target.closest("[data-filter]");
      if (button) setFilter(button.dataset.filter);
    });
    $("#featuredGrid").addEventListener("click", handleModuleAction);
    $("#catalogGrid").addEventListener("click", handleModuleAction);
    $("#dialogClose").addEventListener("click", closeDialog);
    $("#dialogDone").addEventListener("click", closeDialog);
    $("#moduleDialog").addEventListener("click", event => {
      if (event.target === $("#moduleDialog")) closeDialog();
    });
    $("#moduleDialog").addEventListener("close", () => {
      selectedModule = null;
      if (window.location.hash.startsWith("#module=")) window.history.replaceState(null, "", "#modules");
    });
    $("#addModuleTask").addEventListener("click", () => {
      if (!selectedModule) return;
      if (addTask("بررسی و برنامه‌ریزی ماژول " + selectedModule.title)) {
        closeDialog();
        showView("workspace");
      }
    });
    $("#dialogFavorite").addEventListener("click", () => {
      if (selectedModule) toggleFavorite(selectedModule.id);
    });
  }

  function handleModuleAction(event) {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.favoriteId);
      return;
    }
    const detailsButton = event.target.closest("[data-open-module]");
    if (detailsButton) openModule(detailsButton.dataset.openModule);
  }

  function initWorkspace() {
    loadWorkspace();
    renderTasks();
    $("#taskForm").addEventListener("submit", event => {
      event.preventDefault();
      const input = $("#taskInput");
      if (addTask(input.value)) input.value = "";
      input.focus();
    });
    $("#taskList").addEventListener("change", event => {
      if (!event.target.matches(".task-check")) return;
      const item = event.target.closest("[data-task-id]");
      const task = tasks.find(entry => entry.id === item?.dataset.taskId);
      if (task) {
        const nextTasks = tasks.map(entry => entry.id === task.id
          ? { ...entry, done: event.target.checked }
          : entry);
        if (saveWorkspace(nextTasks)) tasks = nextTasks;
        renderTasks();
      }
    });
    $("#taskList").addEventListener("click", event => {
      const remove = event.target.closest(".task-remove");
      if (!remove) return;
      const item = remove.closest("[data-task-id]");
      const nextTasks = tasks.filter(task => task.id !== item?.dataset.taskId);
      if (nextTasks.length === tasks.length) return;
      if (saveWorkspace(nextTasks)) {
        tasks = nextTasks;
        renderTasks();
        showToast("کار حذف شد.");
      } else {
        renderTasks();
      }
    });
    $("#taskSearch").addEventListener("input", renderTasks);
    $("#taskFilters").addEventListener("click", event => {
      const button = event.target.closest("[data-task-filter]");
      if (button) setTaskFilter(button.dataset.taskFilter);
    });
    $("#clearCompletedTasks").addEventListener("click", () => {
      const completed = tasks.filter(task => task.done).length;
      if (!completed || !window.confirm("آیا از حذف " + completed + " کار انجام‌شده مطمئنی؟")) return;
      const nextTasks = tasks.filter(task => !task.done);
      if (saveWorkspace(nextTasks)) {
        tasks = nextTasks;
        renderTasks();
        showToast("کارهای انجام‌شده پاک شدند.");
      } else {
        renderTasks();
      }
    });
    $("#exportWorkspace").addEventListener("click", exportWorkspace);
    $("#importWorkspace").addEventListener("click", () => $("#importWorkspaceFile").click());
    $("#importWorkspaceFile").addEventListener("change", async event => {
      await importWorkspace(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
  }

  function init() {
    const retryButton = $("#retryRegistryButton");
    if (retryButton) retryButton.addEventListener("click", retryModuleRegistry);
    renderFeatured();
    initNavigation();
    initCatalog();
    initWorkspace();
    initInstallPrompt();
    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    renderCatalog();
    registerOfflineShell();
    if (window.location.hash) parseRoute();
    else showView("home", { updateHistory: false, scroll: false });
  }

  async function start() {
    let registryReady = false;
    try {
      await loadModuleRegistry();
      registryReady = true;
    } catch (error) {
      console.error("Module registry could not be loaded:", error);
    }
    init();
    if (!registryReady) {
      setRegistryStatus("فهرست ماژول‌ها بارگذاری نشد. بخش‌های محلی همچنان در دسترس هستند؛ پس از بررسی اتصال می‌توانی دوباره تلاش کنی.", true);
    }
  }

  start();
})();