(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = "mr-siavash-ai.workspace.v2";
  const LEGACY_STORAGE_KEY = "mr-siavash-ai.workspace.tasks.v1";
  const FAVORITES_KEY = "mr-siavash-ai.favorites.v1";
  const MAX_TASKS = 100;
  const MAX_IMPORT_BYTES = 256 * 1024;

  const modules = [
    { id: "ai-hub", category: "ai", categoryLabel: "هوش مصنوعی", symbol: "✳", title: "AI Hub", description: "مرکز سامان‌دهی ابزارها و سرویس‌های هوش مصنوعی، مدل‌ها و جریان‌های کاری مختلف.", status: "در نقشه راه", type: "ROADMAP", features: ["فهرست و مقایسه مدل‌ها و سرویس‌ها", "مدیریت تنظیمات اتصال‌ها از سمت امن سرور", "آزمون و ارزیابی خروجی‌ها با معیارهای روشن"], featured: true },
    { id: "agents", category: "ai", categoryLabel: "هوش مصنوعی", symbol: "◈", title: "Agents Lab", description: "محیط طراحی و هماهنگی عامل‌های هوشمند با وظایف، ابزارها و محدوده دسترسی مشخص.", status: "در نقشه راه", type: "ROADMAP", features: ["تعریف مأموریت و گردش کار", "هماهنگی چند عامل با قرارداد مشخص", "ثبت رویدادها، محدودیت اجرا و تأیید انسانی"], featured: true },
    { id: "developer", category: "dev", categoryLabel: "توسعه", symbol: "</>", title: "Developer Studio", description: "فضایی برای برنامه‌نویسی، مستندسازی، Git، طراحی نرم‌افزار و مدیریت پروژه‌های فنی.", status: "در نقشه راه", type: "ROADMAP", features: ["مدیریت پروژه و مستندات فنی", "تحلیل کد و کنترل کیفیت", "اتصال امن به مخزن‌ها و ابزارهای توسعه"], featured: true },
    { id: "secure", category: "learn", categoryLabel: "امنیت دفاعی", symbol: "⌘", title: "Secure Lab", description: "مسیر یادگیری امنیت سایبری با تمرکز بر دفاع، تحلیل، حریم خصوصی و آزمایشگاه‌های مجاز.", status: "در نقشه راه", type: "ROADMAP", features: ["تحلیل لاگ و پایش دفاعی", "مبانی امنیت وب و سخت‌سازی سیستم‌ها", "تمرین‌های ایمن در محیط‌های آزمایشگاهی مجاز"], featured: true },
    { id: "network-linux", category: "learn", categoryLabel: "شبکه و لینوکس", symbol: "⌁", title: "Network & Linux Lab", description: "مسیر یادگیری شبکه، لینوکس، مدیریت سیستم و عیب‌یابی مرحله‌به‌مرحله.", status: "در نقشه راه", type: "ROADMAP", features: ["مفاهیم شبکه و عیب‌یابی اتصال", "خط فرمان و مدیریت لینوکس", "تمرین‌های آزمایشگاهی و مستندسازی"], featured: true },
    { id: "knowledge", category: "learn", categoryLabel: "یادگیری", symbol: "▤", title: "Knowledge Library", description: "کتابخانه‌ای ساختاریافته برای یادداشت‌ها، منابع آموزشی و دانش قابل جست‌وجو.", status: "در نقشه راه", type: "ROADMAP", features: ["دسته‌بندی و برچسب‌گذاری منابع", "جست‌وجوی دانش و یادداشت‌ها", "مسیر یادگیری و مرور دوره‌ای"], featured: true },
    { id: "creator", category: "create", categoryLabel: "تولید محتوا", symbol: "✧", title: "Creator Studio", description: "محیط برنامه‌ریزی و تولید محتوای آموزشی و رسانه‌ای در قالب‌های مختلف.", status: "در نقشه راه", type: "ROADMAP", features: ["ایده‌پردازی و سناریونویسی", "تقویم و گردش انتشار محتوا", "مدیریت خروجی‌های تصویری و ویدیویی"], featured: true },
    { id: "identity", category: "workspace", categoryLabel: "هویت دیجیتال", symbol: "◎", title: "Digital Identity", description: "نمایه دیجیتال و هویت حرفه‌ای یکپارچه با کنترل روشن بر اطلاعات عمومی و خصوصی.", status: "در نقشه راه", type: "ROADMAP", features: ["نمایه حرفه‌ای و قابل مدیریت", "تفکیک اطلاعات عمومی از خصوصی", "تنظیمات حریم خصوصی و سطح دسترسی"], featured: false },
    { id: "workspace", category: "workspace", categoryLabel: "فضای کار", symbol: "▣", title: "Personal Workspace", description: "فضای شخصی سبک برای مدیریت کارها؛ نسخه فعلی این ماژول در مرورگر فعال است.", status: "فعال در همین مرورگر", type: "LOCAL", features: ["افزودن، تکمیل و حذف کارها", "ذخیره محلی در همین مرورگر", "خروجی و بازیابی پشتیبان JSON"], featured: false }
  ];

  let activeFilter = "all";
  let activeTaskFilter = "all";
  let selectedModule = null;
  let toastTimer = null;
  let installPrompt = null;
  let storageAvailable = true;
  let tasks = [];
  let favorites = new Set();

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
    if (button) button.setAttribute("aria-expanded", "false");
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
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    persist(FAVORITES_KEY, Array.from(favorites));
    renderFeatured();
    renderCatalog();
    if (selectedModule && selectedModule.id === id) {
      const button = $("#dialogFavorite");
      button.textContent = favorites.has(id) ? "★ نشان‌شده" : "☆ نشان‌کردن";
      button.setAttribute("aria-pressed", String(favorites.has(id)));
    }
    showToast(favorites.has(id) ? "ماژول به نشان‌شده‌ها اضافه شد." : "ماژول از نشان‌شده‌ها حذف شد.");
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

  function saveWorkspace() {
    persist(STORAGE_KEY, { version: 2, updatedAt: new Date().toISOString(), tasks });
    updateStorageNote();
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
    tasks.unshift({ id: createId(), text: clean, done: false });
    tasks = tasks.slice(0, MAX_TASKS);
    saveWorkspace();
    renderTasks();
    showToast("به فضای کار اضافه شد.");
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
      tasks = [...unique, ...tasks].slice(0, MAX_TASKS);
      if (Array.isArray(data.favorites)) {
        data.favorites.filter(id => modules.some(module => module.id === id)).forEach(id => favorites.add(id));
        persist(FAVORITES_KEY, Array.from(favorites));
      }
      saveWorkspace();
      renderTasks();
      renderCatalog();
      showToast(unique.length ? unique.length + " کار بازیابی شد." : "اطلاعات جدیدی برای افزودن وجود نداشت.");
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
      const open = nav.classList.toggle("is-open");
      $("#mobileMenuButton").setAttribute("aria-expanded", String(open));
    });
    window.addEventListener("popstate", parseRoute);
    window.addEventListener("hashchange", parseRoute);
    document.addEventListener("keydown", event => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
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
      addTask("بررسی و برنامه‌ریزی ماژول " + selectedModule.title);
      closeDialog();
      showView("workspace");
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
      addTask(input.value);
      input.value = "";
      input.focus();
    });
    $("#taskList").addEventListener("change", event => {
      if (!event.target.matches(".task-check")) return;
      const item = event.target.closest("[data-task-id]");
      const task = tasks.find(entry => entry.id === item?.dataset.taskId);
      if (task) {
        task.done = event.target.checked;
        saveWorkspace();
        renderTasks();
      }
    });
    $("#taskList").addEventListener("click", event => {
      const remove = event.target.closest(".task-remove");
      if (!remove) return;
      const item = remove.closest("[data-task-id]");
      tasks = tasks.filter(task => task.id !== item?.dataset.taskId);
      saveWorkspace();
      renderTasks();
      showToast("کار حذف شد.");
    });
    $("#taskSearch").addEventListener("input", renderTasks);
    $("#taskFilters").addEventListener("click", event => {
      const button = event.target.closest("[data-task-filter]");
      if (button) setTaskFilter(button.dataset.taskFilter);
    });
    $("#clearCompletedTasks").addEventListener("click", () => {
      const completed = tasks.filter(task => task.done).length;
      if (!completed || !window.confirm("آیا از حذف " + completed + " کار انجام‌شده مطمئنی؟")) return;
      tasks = tasks.filter(task => !task.done);
      saveWorkspace();
      renderTasks();
      showToast("کارهای انجام‌شده پاک شدند.");
    });
    $("#exportWorkspace").addEventListener("click", exportWorkspace);
    $("#importWorkspace").addEventListener("click", () => $("#importWorkspaceFile").click());
    $("#importWorkspaceFile").addEventListener("change", async event => {
      await importWorkspace(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
  }

  function init() {
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

  init();
})();