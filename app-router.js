/* MR_SIAVASH_AI — application routing core
 * Centralizes view switching, route parsing, history and menu state.
 * Legacy app.js delegates to this module to keep compatibility while migration proceeds.
 */
(() => {
  "use strict";
  const VALID_VIEWS = new Set(["home", "modules", "workspace", "identity", "about"]);
  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function closeMobileMenu() {
    const nav = select("#mainNav");
    const button = select("#mobileMenuButton");
    if (nav) nav.classList.remove("is-open");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "باز کردن ناوبری");
    }
  }

  function showView(viewName, options = {}) {
    if (!VALID_VIEWS.has(viewName)) return false;
    const target = select("#view-" + viewName);
    if (!target) return false;
    const currentView = select(".view.is-active");
    if (currentView && currentView !== target && window.MRSound) window.MRSound.play("navigate");
    selectAll(".view").forEach(view => {
      const active = view === target;
      view.classList.toggle("is-active", active);
      view.hidden = !active;
    });
    selectAll(".main-nav [data-view]").forEach(button => {
      const active = button.dataset.view === viewName;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (options.updateHistory !== false) {
      const nextHash = "#" + viewName;
      if (window.location.hash !== nextHash) window.history.pushState({ view: viewName }, "", nextHash);
    }
    if (options.scroll !== false) {
      const main = select("#main-content");
      if (main) main.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeMobileMenu();
    if (viewName === "modules" && typeof window.MRAppRenderCatalog === "function") window.MRAppRenderCatalog();
    return true;
  }

  function parseRoute(options = {}) {
    const hash = window.location.hash || "#home";
    const moduleMatch = hash.match(/^#module=([a-z0-9-]+)$/i);
    if (moduleMatch) {
      showView("modules", { updateHistory: false, scroll: false });
      if (typeof window.MRAppOpenModule === "function") window.MRAppOpenModule(moduleMatch[1], { updateHistory: false });
      return;
    }
    const viewName = hash.slice(1);
    if (viewName === "support") {
      showView("home", { updateHistory: false, scroll: false });
      const dialog = select("#supportDialog");
      if (dialog && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
      return;
    }
    if (VALID_VIEWS.has(viewName)) {
      const moduleDialog = select("#moduleDialog");
      if (moduleDialog && moduleDialog.open) moduleDialog.close();
      showView(viewName, { updateHistory: false, scroll: false });
    } else {
      showView("home", { updateHistory: false, scroll: false });
    }
  }

  window.MRAppRouter = Object.freeze({ showView, parseRoute, closeMobileMenu, validViews: VALID_VIEWS });
})();
