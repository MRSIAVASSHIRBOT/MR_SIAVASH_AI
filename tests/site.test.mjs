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
  assert.match(app, /modules = Object\.freeze\(validateModuleRegistry\(registry\)\)/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v5"/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v5"/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v5"/);
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
