/* MR_SIAVASH_AI — storage data contracts
 * Pure parsing and normalization helpers. Browser persistence and UI remain in app.js.
 */
(() => {
  "use strict";
  function parseStoredTasks(raw, maxTasks = 100) {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== 2 ||
        !Array.isArray(parsed.tasks) || parsed.tasks.length > maxTasks) {
      throw new Error("ساختار کارهای ذخیره‌شده معتبر نیست.");
    }
    const seenIds = new Set();
    return parsed.tasks.map(task => {
      const id = typeof task?.id === "string" ? task.id.trim() : "";
      if (!task || typeof task !== "object" || !id || id.length > 128 || seenIds.has(id) ||
          typeof task.text !== "string" || typeof task.done !== "boolean") {
        throw new Error("یکی از کارهای ذخیره‌شده معتبر نیست.");
      }
      seenIds.add(id);
      const text = task.text.trim().replace(/\s+/g, " ");
      if (!text || text.length > 120) throw new Error("متن یکی از کارها خارج از محدوده است.");
      return { id, text, done: task.done };
    });
  }
  function parseStoredFavorites(raw, normalizeFavoriteIds, modules) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 50 ||
        parsed.some(id => typeof id !== "string" || !/^[a-z0-9-]{2,64}$/.test(id))) {
      throw new Error("ساختار نشان‌شده‌های ذخیره‌شده معتبر نیست.");
    }
    return normalizeFavoriteIds(parsed, modules, modules.length === 0);
  }
  function normalizeLoadedTasks(rawTasks, createId, maxTasks = 100) {
    const result = { tasks: [], repairedIds: 0, discardedTasks: 0, excessTasks: 0 };
    if (!Array.isArray(rawTasks)) {
      result.invalidContainer = true;
      return result;
    }
    result.excessTasks = Math.max(0, rawTasks.length - maxTasks);
    const seenTaskIds = new Set();
    rawTasks.slice(0, maxTasks).forEach(task => {
      if (!task || typeof task !== "object" || Array.isArray(task) ||
          typeof task.text !== "string" || typeof task.done !== "boolean") {
        result.discardedTasks += 1;
        return;
      }
      const text = task.text.trim().replace(/\s+/g, " ");
      if (!text || text.length > 120) {
        result.discardedTasks += 1;
        return;
      }
      let id = typeof task.id === "string" ? task.id.trim() : "";
      if (!/^[A-Za-z0-9-]{1,128}$/.test(id) || seenTaskIds.has(id)) {
        id = createId();
        result.repairedIds += 1;
      }
      seenTaskIds.add(id);
      result.tasks.push({ id, text, done: task.done });
    });
    return result;
  }
  function validateWorkspaceBackup(data, maxTasks = 100) {
    const allowedRootFields = new Set(["schema", "version", "exportedAt", "tasks", "favorites"]);
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        Object.keys(data).some(key => !allowedRootFields.has(key)) ||
        data.schema !== "mr-siavash-ai-workspace" || data.version !== 1 ||
        !Array.isArray(data.tasks)) {
      throw new Error("فرمت فایل پشتیبان معتبر نیست.");
    }
    if (data.exportedAt !== undefined &&
        (typeof data.exportedAt !== "string" || data.exportedAt.length > 40)) {
      throw new Error("زمان ساخت فایل پشتیبان معتبر نیست.");
    }
    if (data.tasks.length > maxTasks) {
      throw new Error("فایل پشتیبان بیش از ۱۰۰ کار دارد؛ آن را به چند فایل کوچک‌تر تقسیم کن.");
    }
    if (data.favorites !== undefined &&
        (!Array.isArray(data.favorites) || data.favorites.length > 50 ||
         new Set(data.favorites).size !== data.favorites.length ||
         data.favorites.some(id => typeof id !== "string" || !/^[a-z0-9-]{2,64}$/.test(id)))) {
      throw new Error("ساختار نشان‌شده‌ها در فایل پشتیبان معتبر نیست.");
    }

    const allowedTaskFields = new Set(["id", "text", "done"]);
    data.tasks.forEach((task, index) => {
      if (!task || typeof task !== "object" || Array.isArray(task) ||
          Object.keys(task).some(key => !allowedTaskFields.has(key)) ||
          (task.id !== undefined &&
            (typeof task.id !== "string" || !/^[A-Za-z0-9-]{1,128}$/.test(task.id))) ||
          typeof task.text !== "string" || !task.text.trim() || task.text.length > 120 ||
          typeof task.done !== "boolean") {
        throw new Error("ساختار کار شماره " + (index + 1) + " معتبر نیست؛ هیچ داده‌ای وارد نشد.");
      }
    });
    return data;
  }
  window.MRAppStorage = Object.freeze({ parseStoredTasks, parseStoredFavorites, normalizeLoadedTasks, validateWorkspaceBackup });
})();
