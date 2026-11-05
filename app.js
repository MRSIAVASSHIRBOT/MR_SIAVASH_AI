(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const modules = [
    { id: "ai-hub", category: "ai", categoryLabel: "هوش مصنوعی", symbol: "✳", title: "AI Hub", description: "مرکز یکپارچه برای دسترسی و مدیریت ابزارها و سرویس‌های هوش مصنوعی.", status: "در نقشه راه", type: "ROADMAP", features: ["فهرست سرویس‌ها و مدل‌ها", "مدیریت تنظیمات و اتصال‌ها", "مقایسه خروجی‌ها با معیارهای مشخص"], featured: true },
    { id: "agents", category: "ai", categoryLabel: "هوش مصنوعی", symbol: "◈", title: "Agents Lab", description: "محیط طراحی و هماهنگی عامل‌های هوشمند با وظایف و محدوده دسترسی مشخص.", status: "در نقشه راه", type: "ROADMAP", features: ["تعریف وظایف و گردش کار", "هماهنگی چند عامل", "ثبت رویدادها و کنترل مجوزها"], featured: true },
    { id: "developer", category: "dev", categoryLabel: "توسعه", symbol: "</>", title: "Developer Studio", description: "فضایی برای برنامه‌نویسی، مستندسازی، ابزارهای توسعه و مدیریت پروژه‌های فنی.", status: "در نقشه راه", type: "ROADMAP", features: ["مستندات و قطعه‌کدها", "مدیریت پروژه و وظایف فنی", "اتصال‌های توسعه و مخزن کد"], featured: true },
    { id: "secure", category: "learn", categoryLabel: "یادگیری", symbol: "⌘", title: "Secure Lab", description: "مسیر آموزشی امنیت سایبری با تمرکز بر دفاع، تحلیل، حریم خصوصی و آزمایشگاه‌های مجاز.", status: "در نقشه راه", type: "ROADMAP", features: ["مبانی شبکه و سیستم‌عامل", "تحلیل لاگ و پایش دفاعی", "تمرین‌های ایمن در محیط مجاز"], featured: true },
    { id: "knowledge", category: "learn", categoryLabel: "یادگیری", symbol: "▤", title: "Knowledge Library", description: "کتابخانه‌ای ساختاریافته برای یادداشت‌ها، منابع آموزشی و دانش قابل جست‌وجو.", status: "در نقشه راه", type: "ROADMAP", features: ["دسته‌بندی و برچسب‌گذاری", "جست‌وجوی دانش", "مسیر یادگیری و مرور"], featured: true },
    { id: "creator", category: "create", categoryLabel: "تولید محتوا", symbol: "✧", title: "Creator Studio", description: "محیط برنامه‌ریزی و تولید محتوای آموزشی و رسانه‌ای در قالب‌های مختلف.", status: "در نقشه راه", type: "ROADMAP", features: ["ایده‌پردازی و سناریونویسی", "تقویم محتوا", "مدیریت خروجی‌های تصویری و ویدیویی"], featured: true },
    { id: "identity", category: "workspace", categoryLabel: "هویت دیجیتال", symbol: "◎", title: "Digital Identity", description: "نمایه دیجیتال و هویت حرفه‌ای یکپارچه با کنترل روشن بر اطلاعات عمومی و خصوصی.", status: "در نقشه راه", type: "ROADMAP", features: ["نمایه حرفه‌ای", "تنظیمات نمایش عمومی و خصوصی", "مدیریت ترجیحات و دسترسی‌ها"], featured: false },
    { id: "workspace", category: "workspace", categoryLabel: "فضای کار", symbol: "▣", title: "Personal Workspace", description: "فضای شخصی سبک برای نگهداری کارهای بعدی؛ نسخه فعلی این ماژول در مرورگر فعال است.", status: "دموی محلی فعال", type: "LOCAL", features: ["افزودن و تکمیل کارها", "ذخیره در حافظه همین مرورگر", "ارسال ماژول‌ها به فهرست کارها"], featured: false }
  ];

  const categoryNames = { all: "همه", ai: "هوش مصنوعی", dev: "توسعه", learn: "یادگیری", create: "تولید محتوا", workspace: "فضای کار" };
  let activeFilter = "all";
  let selectedModule = null;
  let toastTimer = null;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function showView(viewName) {
    const target = $("#view-" + viewName);
    if (!target) return;
    $$(".view").forEach(view => {
      const active = view === target;
      view.classList.toggle("is-active", active);
      view.hidden = !active;
    });
    $$("[data-view]").forEach(button => {
      if (button.classList.contains("nav-link")) {
        button.classList.toggle("is-active", button.dataset.view === viewName);
        button.setAttribute("aria-current", button.dataset.view === viewName ? "page" : "false");
      }
    });
    $("#main-content").scrollIntoView({ behavior: "smooth", block: "start" });
    closeMobileMenu();
  }

  function closeMobileMenu() {
    $("#mainNav")?.classList.remove("is-open");
    const button = $("#mobileMenuButton");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function makeCard(module) {
    const article = document.createElement("article");
    article.className = "module-card";
    article.innerHTML =
      '<div class="card-top"><span class="module-icon" aria-hidden="true"></span><span class="module-status"></span></div>' +
      '<h3></h3><p></p><div class="card-bottom"><span></span><span class="card-open" aria-hidden="true">↙</span></div>';
    $(".module-icon", article).textContent = module.symbol;
    $(".module-status", article).textContent = module.status;
    if (module.type === "LOCAL") $(".module-status", article).classList.add("local");
    $("h3", article).textContent = module.title;
    $("p", article).textContent = module.description;
    $(".card-bottom span", article).textContent = module.categoryLabel;
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", "مشاهده جزئیات " + module.title);
    article.addEventListener("click", () => openModule(module.id));
    article.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModule(module.id);
      }
    });
    return article;
  }

  function renderFeatured() {
    const container = $("#featuredGrid");
    container.replaceChildren();
    modules.filter(item => item.featured).slice(0, 6).forEach(item => container.append(makeCard(item)));
  }

  function renderCatalog() {
    const container = $("#catalogGrid");
    const query = ($("#moduleSearch").value || "").trim().toLocaleLowerCase("fa");
    const filtered = modules.filter(item => {
      const matchesCategory = activeFilter === "all" || item.category === activeFilter;
      const haystack = [item.title, item.description, item.categoryLabel, ...item.features].join(" ").toLocaleLowerCase("fa");
      return matchesCategory && (!query || haystack.includes(query));
    });
    container.replaceChildren();
    filtered.forEach(item => container.append(makeCard(item)));
    $("#catalogEmpty").hidden = filtered.length !== 0;
  }

  function setFilter(filter) {
    activeFilter = filter;
    $$("#filterList [data-filter]").forEach(button => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    renderCatalog();
  }

  function openModule(id) {
    const module = modules.find(item => item.id === id);
    if (!module) return;
    selectedModule = module;
    $("#dialogSymbol").textContent = module.symbol;
    $("#dialogCategory").textContent = module.categoryLabel.toUpperCase();
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
    $("#addModuleTask").textContent = "افزودن به فضای کار ＋";
    if (typeof $("#moduleDialog").showModal === "function") $("#moduleDialog").showModal();
    else showToast("جزئیات ماژول: " + module.title);
  }

  function closeDialog() {
    const dialog = $("#moduleDialog");
    if (dialog.open) dialog.close();
  }

  const STORAGE_KEY = "mr-siavash-ai.workspace.tasks.v1";
  let storageAvailable = true;
  let tasks = [];

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      tasks = Array.isArray(parsed) ? parsed.filter(task =>
        task && typeof task.id === "string" && typeof task.text === "string" &&
        typeof task.done === "boolean"
      ).slice(0, 100) : [];
    } catch (error) {
      storageAvailable = false;
      tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      showToast("ذخیره‌سازی مرورگر در دسترس نیست؛ این فهرست موقت خواهد بود.");
    }
    $("#storageNote").textContent = storageAvailable
      ? "اطلاعات این فهرست فقط در حافظه مرورگر همین دستگاه ذخیره می‌شود و به حساب ابری ارسال نمی‌شود."
      : "ذخیره‌سازی محلی در این مرورگر در دسترس نیست؛ با بستن صفحه ممکن است کارها از دست بروند.";
  }

  function renderTasks() {
    const list = $("#taskList");
    list.replaceChildren();
    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " is-done" : "");
      li.dataset.taskId = task.id;
      const checkbox = document.createElement("input");
      checkbox.className = "task-check";
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", "تغییر وضعیت کار");
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
    $("#taskCount").textContent = new Intl.NumberFormat("fa-IR").format(pending) + " کار باز";
    $("#taskEmpty").hidden = tasks.length !== 0;
  }

  function addTask(text) {
    const clean = text.trim().replace(/\s+/g, " ").slice(0, 120);
    if (!clean) return;
    tasks.unshift({ id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7), text: clean, done: false });
    tasks = tasks.slice(0, 100);
    saveTasks();
    renderTasks();
    showToast("به فضای کار اضافه شد.");
  }

  function initNavigation() {
    $$("[data-view]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault();
      showView(button.dataset.view);
      if (button.dataset.view === "modules") renderCatalog();
    }));
    $("#mobileMenuButton").addEventListener("click", () => {
      const nav = $(".main-nav");
      const open = nav.classList.toggle("is-open");
      $("#mobileMenuButton").setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        showView("modules");
        $("#moduleSearch").focus();
      }
      if (event.key === "Escape") closeMobileMenu();
    });
  }

  function initCatalog() {
    $("#moduleSearch").addEventListener("input", renderCatalog);
    $("#filterList").addEventListener("click", event => {
      const button = event.target.closest("[data-filter]");
      if (button) setFilter(button.dataset.filter);
    });
    $("#dialogClose").addEventListener("click", closeDialog);
    $("#dialogDone").addEventListener("click", closeDialog);
    $("#moduleDialog").addEventListener("click", event => {
      if (event.target === $("#moduleDialog")) closeDialog();
    });
    $("#addModuleTask").addEventListener("click", () => {
      if (!selectedModule) return;
      addTask("بررسی و برنامه‌ریزی ماژول " + selectedModule.title);
      closeDialog();
      showView("workspace");
    });
  }

  function initWorkspace() {
    loadTasks();
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
        saveTasks();
        renderTasks();
      }
    });
    $("#taskList").addEventListener("click", event => {
      const remove = event.target.closest(".task-remove");
      if (!remove) return;
      const item = remove.closest("[data-task-id]");
      tasks = tasks.filter(task => task.id !== item?.dataset.taskId);
      saveTasks();
      renderTasks();
      showToast("کار حذف شد.");
    });
  }

  renderFeatured();
  initNavigation();
  initCatalog();
  initWorkspace();
  renderCatalog();
})();