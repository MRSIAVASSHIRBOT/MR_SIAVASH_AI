import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const manifestText = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");
const moduleRegistryText = await readFile(new URL("../modules.json", import.meta.url), "utf8");
const moduleRegistry = JSON.parse(moduleRegistryText);
const moduleSchemaText = await readFile(new URL("../schemas/module-registry.schema.json", import.meta.url), "utf8");
const moduleSchema = JSON.parse(moduleSchemaText);
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("HTML references app assets and install manifest", () => {
  assert.match(html, /href="\.\/*styles\.css"/);
  assert.match(html, /src="\.\/*app\.js"/);
  assert.match(html, /rel="manifest"/);
  assert.match(html, /id="mainNav"/);
});

test("all HTML IDs are unique", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate element IDs found");
});

test("navigation buttons have real section targets", () => {
  const views = new Set([...html.matchAll(/\bid="view-([^"]+)"/g)].map(match => match[1]));
  const targets = [...html.matchAll(/data-view="([^"]+)"/g)].map(match => match[1]);
  for (const target of targets) assert.ok(views.has(target), "missing view: " + target);
});

test("all static DOM IDs used by the application exist in the HTML", () => {
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const referencedIds = [...app.matchAll(/\$\("#([A-Za-z][A-Za-z0-9_-]*)"/g)].map(match => match[1]).filter(id => !id.endsWith("-"));
  for (const id of referencedIds) assert.ok(htmlIds.has(id), "missing DOM element: " + id);
});

test("module detail dialog exposes its favorite control", () => {
  assert.match(html, /id="dialogFavorite"/);
});

test("versioned module registry contains nine unique, categorized modules", () => {
  assert.equal(moduleRegistry.schema, "mr-siavash-ai-module-registry");
  assert.equal(moduleRegistry.version, 1);
  assert.equal(moduleRegistry.modules.length, 9);
  const ids = moduleRegistry.modules.map(module => module.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const module of moduleRegistry.modules) {
    assert.match(module.id, /^[a-z0-9-]{2,64}$/);
    assert.ok(["ai", "dev", "learn", "create", "workspace"].includes(module.category));
    assert.ok(["ROADMAP", "LOCAL"].includes(module.type));
    assert.ok(Array.isArray(module.features) && module.features.length > 0);
    assert.equal(typeof module.featured, "boolean");
  }
  assert.equal(moduleRegistry.modules.filter(module => module.type === "LOCAL").length, 1);
  assert.equal(moduleRegistry.modules.find(module => module.id === "workspace").type, "LOCAL");
});

test("application validates and freezes the external module registry before initialization", () => {
  assert.match(app, /function validateModuleRegistry\(registry\)/);
  assert.match(app, /function loadModuleRegistry\(\)/);
  assert.match(app, /return Object\.freeze\(registry\.modules\.map\(module =>/);
  assert.match(app, /modules = validateModuleRegistry\(registry\)/);
  assert.match(app, /await loadModuleRegistry\(\);[\s\S]*?init\(\);/);
});

test("workspace import is bounded and schema-checked", () => {
  assert.match(app, /MAX_IMPORT_BYTES = 256 \* 1024/);
  assert.match(app, /data\.schema !== "mr-siavash-ai-workspace"/);
  assert.match(app, /MAX_TASKS = 100/);
});

test("client code does not contain a hard-coded provider secret", () => {
  assert.doesNotMatch(app, /\b(?:sk|ghp|github_pat)_[A-Za-z0-9]{20,}\b/);
});

test("stylesheet braces are balanced", () => {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});

test("web manifest is valid and scoped to the deployment path", () => {
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.dir, "rtl");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});

test("service worker caches the static shell and ignores non-GET requests", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v6"/);
  assert.match(sw, /SHELL_FILES/);
  assert.match(sw, /"\.\/modules\.json"/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /request\.method !== "GET"/);
});


test("proposed backend contract is explicitly design-only and versioned", async () => {
  const api = await readFile(new URL("../docs/backend/openapi.yaml", import.meta.url), "utf8");
  const backendGuide = await readFile(new URL("../docs/backend/README.md", import.meta.url), "utf8");
  assert.match(api, /openapi: 3\.1\.0/);
  assert.match(api, /version: 0\.1\.0/);
  assert.match(api, /DESIGN CONTRACT ONLY/);
  assert.match(api, /bearerAuth/);
  assert.match(api, /Idempotency-Key/);
  assert.match(api, /additionalProperties: false/);
  assert.match(backendGuide, /does not contain a running backend/);
});

test("security and roadmap docs define production gates", async () => {
  const threat = await readFile(new URL("../docs/THREAT_MODEL.md", import.meta.url), "utf8");
  const roadmap = await readFile(new URL("../docs/ROADMAP.md", import.meta.url), "utf8");
  assert.match(threat, /STRIDE review/);
  assert.match(threat, /cross-user isolation tests/);
  assert.match(threat, /secrets and tool permissions remain server-side/i);
  assert.match(roadmap, /parallel workstreams/);
  assert.match(roadmap, /No backend endpoints are live/);
});

test("workspace task controls are wired to accessible UI elements", () => {
  assert.match(html, /id="taskSearch"/);
  assert.match(html, /id="taskFilters"/);
  assert.match(html, /data-task-filter="all"/);
  assert.match(html, /data-task-filter="open"/);
  assert.match(html, /data-task-filter="done"/);
  assert.match(html, /id="taskOpenCount"/);
  assert.match(html, /id="taskDoneCount"/);
  assert.match(html, /id="clearCompletedTasks"/);
  assert.match(app, /function setTaskFilter/);
  assert.ok(app.includes('$$("#taskFilters [data-task-filter]").forEach'));
  assert.match(app, /toLocaleLowerCase\("fa"\)/);
  assert.match(app, /window\.confirm/);
});

test("service worker cache is versioned after front-end asset changes", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v6"/);
});

test("workspace import rejects oversized backups and malformed task records", () => {
  assert.ok(app.includes("data.tasks.length > MAX_TASKS"));
  assert.ok(app.includes("ساختار کار شماره"));
  assert.ok(app.includes("data.favorites !== undefined"));
});

test("workspace loading repairs missing and duplicate task IDs", () => {
  assert.ok(app.includes("const seenTaskIds = new Set()"));
  assert.ok(app.includes("seenTaskIds.has(id)"));
  assert.ok(app.includes("if (!id || seenTaskIds.has(id)) id = createId()"));
});

test("platform contracts define identity, AI, agent and production boundaries", async () => {
  const contracts = await readFile(new URL("../docs/PLATFORM_CONTRACTS.md", import.meta.url), "utf8");
  assert.match(contracts, /server-side for every protected operation/);
  assert.match(contracts, /Provider credentials stay in server-side secret storage/);
  assert.match(contracts, /human confirmation before external, destructive/);
  assert.match(contracts, /current site remains a static browser application/i);
});


test("service worker caches only exact allowlisted static shell URLs", () => {
  assert.match(sw, /const SHELL_URLS|const shellUrls = new Set\(SHELL_FILES\.map/);
  assert.match(sw, /if \(!shellUrls\.has\(requestUrl\.href\)\) return/);
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /contentType\.includes\("text\/html"\)/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v6"/);
});


test("security and repository guidance document the static-only service-worker boundary", async () => {
  const threat = await readFile(new URL("../docs/THREAT_MODEL.md", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const roadmap = await readFile(new URL("../docs/ROADMAP.md", import.meta.url), "utf8");
  assert.match(threat, /exact-URL allowlist for public static shell assets/);
  assert.match(threat, /not a general response cache/);
  assert.match(readme, /tests\/service-worker\.test\.mjs/);
  assert.match(roadmap, /private responses bypass the service-worker cache/);
});


test("workspace refuses to evict existing tasks when capacity is reached", () => {
  assert.match(app, /if \(tasks\.length >= MAX_TASKS\)/);
  assert.match(app, /ابتدا یک کار را حذف یا تکمیل کن/);
  assert.doesNotMatch(app, /tasks\.unshift\(\{ id: createId\(\), text: clean, done: false \}\);\s*tasks = tasks\.slice\(0, MAX_TASKS\)/);
});

test("workspace import reports accepted and skipped tasks at capacity", () => {
  assert.match(app, /const availableSlots = Math\.max\(0, MAX_TASKS - tasks\.length\)/);
  assert.match(app, /const accepted = unique\.slice\(0, availableSlots\)/);
  assert.match(app, /const skipped = unique\.length - accepted\.length/);
  assert.match(app, /هیچ کاری از پشتیبان اضافه نشد/);
});


test("workspace mutations persist before committing in-memory task state", () => {
  assert.match(app, /function saveWorkspace\(nextTasks = tasks\)/);
  assert.match(app, /if \(!saveWorkspace\(nextTasks\)\) return false;[\s\S]{0,100}tasks = nextTasks/);
  assert.match(app, /if \(saveWorkspace\(nextTasks\)\) tasks = nextTasks/);
  assert.match(app, /if \(saveWorkspace\(nextTasks\)\) \{[\s\S]{0,100}tasks = nextTasks/);
});

test("workspace import commits task and favorite state only after persistence succeeds", () => {
  assert.match(app, /const nextTasks = \[\.\.\.accepted, \.\.\.tasks\]/);
  assert.match(app, /const nextFavorites = new Set\(favorites\)/);
  assert.match(app, /if \(!saveWorkspace\(nextTasks\)\) \{[\s\S]*?persist\(FAVORITES_KEY, Array\.from\(favorites\)\);[\s\S]*?return;/);
  assert.match(app, /tasks = nextTasks;\s*favorites = nextFavorites;/);
});

test("favorite changes are persisted before replacing the in-memory set", () => {
  assert.match(app, /const nextFavorites = new Set\(favorites\);[\s\S]*?if \(!persist\(FAVORITES_KEY, Array\.from\(nextFavorites\)\)\) return false;\s*favorites = nextFavorites;/);
});


test("mobile navigation exposes an accurate accessible control relationship", () => {
  assert.match(html, /id="mobileMenuButton"[^>]*aria-controls="mainNav"/);
  assert.match(app, /button\.setAttribute\("aria-expanded", String\(open\)\)/);
  assert.match(app, /button\.setAttribute\("aria-label", open \? "بستن ناوبری" : "باز کردن ناوبری"\)/);
  assert.match(app, /button\.setAttribute\("aria-label", "باز کردن ناوبری"\)/);
});

test("global module search shortcut does not steal keystrokes from editors or dialogs", () => {
  assert.match(app, /event\.key\.toLowerCase\(\) === "k" &&\s*!typing && !\$\("#moduleDialog"\)\.open/);
});


test("module registry validator rejects malformed and ambiguous metadata at runtime", () => {
  const start = app.indexOf("  function validateModuleRegistry(registry) {");
  const end = app.indexOf("\n  async function loadModuleRegistry()", start);
  assert.ok(start >= 0 && end > start, "validator source boundaries must exist");
  const validate = vm.runInNewContext("(" + app.slice(start, end).trim() + ")");
  const accepted = validate(structuredClone(moduleRegistry));
  assert.equal(accepted.length, 9);
  assert.ok(Object.isFrozen(accepted));
  assert.ok(Object.isFrozen(accepted[0]));
  assert.ok(Object.isFrozen(accepted[0].features));

  const duplicate = structuredClone(moduleRegistry);
  duplicate.modules[1].id = duplicate.modules[0].id;
  assert.throws(() => validate(duplicate), /شناسه ماژول/);

  const unknownField = structuredClone(moduleRegistry);
  unknownField.modules[0].permissions = ["admin"];
  assert.throws(() => validate(unknownField), /فیلدهای مورد انتظار/);

  const invalidState = structuredClone(moduleRegistry);
  invalidState.modules[0].type = "LOCAL";
  assert.throws(() => validate(invalidState), /وضعیت پیاده‌سازی/);

  const oversized = structuredClone(moduleRegistry);
  oversized.modules[0].title = "x".repeat(81);
  assert.throws(() => validate(oversized), /فراداده/);
});


test("formal JSON Schema matches the runtime module registry contract", () => {
  assert.equal(moduleSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(moduleSchema.additionalProperties, false);
  assert.deepEqual(moduleSchema.required, ["schema", "version", "modules"]);
  assert.equal(moduleSchema.properties.schema.const, moduleRegistry.schema);
  assert.equal(moduleSchema.properties.version.const, moduleRegistry.version);
  const moduleContract = moduleSchema.$defs.module;
  assert.equal(moduleContract.additionalProperties, false);
  assert.deepEqual([...moduleContract.required].sort(), Object.keys(moduleRegistry.modules[0]).sort());
  assert.deepEqual(Object.keys(moduleContract.properties).sort(), Object.keys(moduleRegistry.modules[0]).sort());
  assert.equal(moduleContract.properties.id.pattern, "^[a-z0-9-]{2,64}$");
  assert.equal(moduleSchema.properties.modules.maxItems, 50);
  assert.equal(moduleContract.properties.features.maxItems, 8);
  assert.equal(moduleContract.properties.features.items.maxLength, 120);
  assert.equal(moduleContract.allOf[0].if.properties.type.const, "LOCAL");
  assert.equal(moduleContract.allOf[0].then.properties.status.const, "فعال در همین مرورگر");
  assert.equal(moduleContract.allOf[1].if.properties.type.const, "ROADMAP");
  assert.equal(moduleContract.allOf[1].then.properties.status.const, "در نقشه راه");
});


function createModuleLoaderHarness(fetchImpl, timer = callback => {
  callback();
  return 1;
}) {
  const start = app.indexOf("  async function loadModuleRegistry()");
  const end = app.indexOf("\n  function createId()", start);
  assert.ok(start >= 0 && end > start, "loader source boundaries must exist");
  const source = app.slice(start, end).trim();
  const context = {
    modules: [],
    MAX_REGISTRY_BYTES: 64 * 1024,
    fetch: fetchImpl,
    AbortController,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    validateModuleRegistry: registry => Object.freeze(registry.modules),
    window: { setTimeout: timer, clearTimeout() {} }
  };
  vm.runInNewContext(source + "\nglobalThis.runLoadModuleRegistry = loadModuleRegistry;", context);
  return context;
}

test("module registry loader omits credentials, validates JSON media type and clears its timeout", async () => {
  let requestOptions;
  let timeoutMs = 0;
  let timerCleared = false;
  const context = createModuleLoaderHarness(async (url, options) => {
    requestOptions = options;
    return {
      ok: true,
      headers: { get: name => name === "content-type" ? "application/json; charset=utf-8" : null },
      async text() { return JSON.stringify({ modules: [{ id: "test-module" }] }); }
    };
  }, (callback, delay) => {
    timeoutMs = delay;
    return 42;
  });
  context.window.clearTimeout = id => { timerCleared = id === 42; };
  await context.runLoadModuleRegistry();
  assert.equal(requestOptions.credentials, "omit");
  assert.equal(requestOptions.cache, "no-cache");
  assert.ok(requestOptions.signal instanceof AbortSignal);
  assert.equal(timeoutMs, 5000);
  assert.equal(timerCleared, true);
  assert.equal(context.modules.length, 1);
});

test("module registry loader rejects HTML fallback responses before parsing", async () => {
  let parsed = false;
  const context = createModuleLoaderHarness(async () => ({
    ok: true,
    headers: { get: name => name === "content-type" ? "text/html; charset=utf-8" : null },
    async text() { parsed = true; return JSON.stringify({ modules: [] }); }
  }), () => 1);
  await assert.rejects(context.runLoadModuleRegistry(), /نوع محتوای فهرست/);
  assert.equal(parsed, false);
});

test("module registry loader aborts an in-flight stalled request after its bounded timeout", async () => {
  let observedAbort = false;
  const context = createModuleLoaderHarness(async (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      observedAbort = true;
      reject(new Error("request aborted"));
    }, { once: true });
  }), callback => setTimeout(callback, 0));
  await assert.rejects(context.runLoadModuleRegistry(), /aborted/);
  assert.equal(observedAbort, true);
});


test("module registry failure has a persistent accessible recovery path", () => {
  assert.match(html, /id="registryStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="retryRegistryButton"/);
  assert.match(app, /async function retryModuleRegistry\(\)/);
  assert.match(app, /await loadModuleRegistry\(\);[\s\S]*?renderFeatured\(\);[\s\S]*?renderCatalog\(\);[\s\S]*?setRegistryStatus\("", false\)/);
  assert.match(app, /retryButton\.addEventListener\("click", retryModuleRegistry\)/);
  assert.match(css, /\.registry-status\[hidden\] \{ display: none; \}/);
});

test("registry recovery reports failure without replacing the local workspace", () => {
  assert.match(app, /setRegistryStatus\("بارگذاری ناموفق بود\. اتصال را بررسی کن و دوباره تلاش کن\.", true, false\)/);
  assert.match(app, /بخش‌های محلی همچنان در دسترس هستند/);
});


test("module registry loader rejects an oversized declared response before reading it", async () => {
  let bodyRead = false;
  const context = createModuleLoaderHarness(async () => ({
    ok: true,
    headers: { get: name => name === "content-type" ? "application/json" : name === "content-length" ? String(64 * 1024 + 1) : null },
    async text() { bodyRead = true; return "{}"; }
  }), () => 1);
  await assert.rejects(context.runLoadModuleRegistry(), /حجم فهرست/);
  assert.equal(bodyRead, false);
});

test("module registry loader enforces its byte limit while streaming without a content length", async () => {
  let cancelled = false;
  const oversizedChunk = new Uint8Array(64 * 1024 + 1);
  const context = createModuleLoaderHarness(async () => ({
    ok: true,
    headers: { get: name => name === "content-type" ? "application/json" : null },
    body: {
      getReader() {
        return {
          async read() { return { done: false, value: oversizedChunk }; },
          async cancel() { cancelled = true; },
          releaseLock() {}
        };
      }
    }
  }), () => 1);
  await assert.rejects(context.runLoadModuleRegistry(), /حجم فهرست/);
  assert.equal(cancelled, true);
});

test("module registry loader decodes a bounded streamed JSON response", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ modules: [{ id: "streamed-module" }] }));
  let read = false;
  const context = createModuleLoaderHarness(async () => ({
    ok: true,
    headers: { get: name => name === "content-type" ? "application/json" : null },
    body: {
      getReader() {
        return {
          async read() {
            if (read) return { done: true };
            read = true;
            return { done: false, value: bytes };
          },
          releaseLock() {}
        };
      }
    }
  }), () => 1);
  await context.runLoadModuleRegistry();
  assert.equal(context.modules.length, 1);
});


test("favorite identifiers survive temporary module registry outages and reconcile after recovery", () => {
  const start = app.indexOf("  function normalizeFavoriteIds(");
  const end = app.indexOf("\n  function reconcileFavorites()", start);
  assert.ok(start >= 0 && end > start);
  const context = { modules: [] };
  vm.runInNewContext(app.slice(start, end).trim() + "\nglobalThis.normalizeFavoriteIds = normalizeFavoriteIds;", context);
  const offline = context.normalizeFavoriteIds(["ai-hub", "future-module", "not valid!"], [], true);
  assert.deepEqual(Array.from(offline), ["ai-hub", "future-module"]);
  const recovered = context.normalizeFavoriteIds(offline, [{ id: "ai-hub" }, { id: "workspace" }], false);
  assert.deepEqual(Array.from(recovered), ["ai-hub"]);
  assert.match(app, /normalizeFavoriteIds\(parsedFavorites, modules, modules\.length === 0\)/);
  assert.match(app, /normalizeFavoriteIds\(data\.favorites, modules, modules\.length === 0\)/);
  assert.match(app, /await loadModuleRegistry\(\);\s*reconcileFavorites\(\);/);
});

test("saved module count excludes unresolved favorite IDs", () => {
  assert.match(app, /const knownFavoriteCount = modules\.filter\(module => favorites\.has\(module\.id\)\)\.length/);
});
