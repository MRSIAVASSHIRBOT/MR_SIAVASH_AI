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
const workspaceSchemaText = await readFile(new URL("../schemas/workspace-backup.schema.json", import.meta.url), "utf8");
const workspaceSchema = JSON.parse(workspaceSchemaText);
const platformText = await readFile(new URL("../docs/PLATFORM_CONTRACTS.md", import.meta.url), "utf8");
const openapiText = await readFile(new URL("../docs/backend/openapi.yaml", import.meta.url), "utf8");
const openapiValidatorText = await readFile(new URL("../scripts/validate-openapi.rb", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workflowText = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
const dependabotText = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");

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
  assert.ok(views.has("identity"), "digital identity view must be present");
});

test("digital identity page exposes public social profiles and GitHub tools safely", () => {
  assert.match(html, /id="view-identity"/);
  assert.match(html, /data-view="identity"/);
  for (const href of [
    "https://www.instagram.com/MR_SIAVASH_AI/",
    "https://www.instagram.com/mr_siavash_ir_bot/",
    "https://www.youtube.com/@MR_SIAVASH_EL_IR_BOT",
    "https://t.me/MR_SIAVASH_IR_BOT",
    "https://t.me/MR_SIAVASH_AI",
    "https://t.me/MR_SIAVASH_IR_CIA_BOT",
    "https://github.com/MRSIAVASSHIRBOT",
    "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions",
    "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/pulls",
    "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues"
  ]) assert.ok(html.includes(href), "missing public profile or GitHub tool link: " + href);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /مرز حریم خصوصی/);
  assert.match(html, /OFFICIAL SOCIAL DIRECTORY/);
  assert.match(html, /شناسه‌هایی است که مالک حساب معرفی کرده/);
  assert.ok(!html.includes("@l.siavash.l"));
  assert.ok(html.includes("<strong>06</strong>"));
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
  assert.deepEqual([...ids].sort(), [
    "agents", "ai-hub", "creator", "developer", "identity",
    "knowledge", "network-linux", "secure", "workspace"
  ]);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v12"/);
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

test("D1 migrations persist verified identity mappings and enforce owner foreign keys", async () => {
  const first = await readFile(new URL("../cloudflare/gateway/migrations/0001_workspace_tasks.sql", import.meta.url), "utf8");
  const second = await readFile(new URL("../cloudflare/gateway/migrations/0002_principal_identity_foreign_keys.sql", import.meta.url), "utf8");
  const validator = await readFile(new URL("../scripts/test-d1-migrations.py", import.meta.url), "utf8");
  const decision = await readFile(new URL("../docs/decisions/0003-internal-principal-identity-mapping.md", import.meta.url), "utf8");
  assert.match(first, /CREATE TABLE workspace_tasks/);
  assert.match(second, /CREATE TABLE users/);
  assert.match(second, /CREATE TABLE auth_identities/);
  assert.ok(second.includes("UNIQUE (issuer, subject)"));
  assert.ok(second.includes("REFERENCES users(id) ON DELETE CASCADE"));
  assert.match(second, /INSERT INTO users/);
  assert.match(second, /ALTER TABLE workspace_tasks_v2 RENAME TO workspace_tasks/);
  assert.match(validator, /PRAGMA foreign_key_check/);
  assert.match(validator, /backfilled correctly/);
  assert.match(decision, /authentication provider remains undecided/);
  assert.match(decision, /does not authenticate requests/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v12"/);
});

test("workspace import rejects oversized backups and malformed task records", () => {
  assert.ok(app.includes("data.tasks.length > MAX_TASKS"));
  assert.ok(app.includes("ساختار کار شماره"));
  assert.ok(app.includes("data.favorites !== undefined"));
});

test("local workspace recovery reports repairs and never silently truncates task text", () => {
  const start = app.indexOf("  function normalizeLoadedTasks(rawTasks) {");
  const end = app.indexOf("\n  function loadWorkspace()", start);
  assert.ok(start >= 0 && end > start, "loaded task normalizer boundaries must exist");
  const normalize = vm.runInNewContext("(function() { const MAX_TASKS = 100; let nextId = 0; const createId = () => \"repaired-\" + (++nextId); return (" +
    app.slice(start, end).trim() + "); })()");
  const records = [
    { id: "stable-1", text: "  Learn   Linux  ", done: false },
    { id: "stable-1", text: "Duplicate ID", done: true },
    { text: "Missing ID", done: false },
    { id: "too-long", text: "x".repeat(121), done: false },
    null,
    { id: "stable-2", text: "Valid", done: false }
  ];
  const result = normalize(records);
  assert.deepEqual(JSON.parse(JSON.stringify(result.tasks)), [
    { id: "stable-1", text: "Learn Linux", done: false },
    { id: "repaired-1", text: "Duplicate ID", done: true },
    { id: "repaired-2", text: "Missing ID", done: false },
    { id: "stable-2", text: "Valid", done: false }
  ]);
  assert.equal(result.repairedIds, 2);
  assert.equal(result.discardedTasks, 2);
  assert.equal(result.excessTasks, 0);
  const overflow = normalize(Array.from({ length: 103 }, (_, index) => ({
    id: "task-" + index, text: "Task " + index, done: false
  })));
  assert.equal(overflow.tasks.length, 100);
  assert.equal(overflow.excessTasks, 3);
  assert.equal(normalize(null).invalidContainer, true);
  assert.match(app, /بازیابی داده‌ها با اصلاحات انجام شد/);
  assert.doesNotMatch(app, /task\.text\.trim\(\)\.replace\(\/\\s\+\/g, " "\)\.slice\(0, 120\)/);
});

test("workspace recovery blocks implicit overwrite until a validated backup is imported", () => {
  assert.ok(app.includes("let workspaceRecoveryBlocked = false"));
  assert.ok(app.includes("workspaceRecoveryBlocked = storageReadError ||"));
  assert.ok(app.includes("storageSnapshotInvalid = !parsed || typeof parsed !== \"object\""));
  assert.ok(app.includes("normalizedTasks.excessTasks > 0;"));
  assert.ok(app.includes("if (workspaceRecoveryBlocked && options.recover !== true)"));
  assert.ok(app.includes("saveWorkspace(nextTasks, { recover: true })"));
  assert.ok(app.includes("برای محافظت از داده‌های قبلی"));
});

test("workspace loading blocks malformed and unsupported storage envelopes", () => {
  const start = app.indexOf("  function loadWorkspace() {");
  const end = app.indexOf("\n  function saveWorkspace(", start);
  assert.ok(start >= 0 && end > start, "workspace loader boundaries must exist");
  const source = app.slice(start, end).trim();

  function load(entries) {
    const context = {
      STORAGE_KEY: "workspace",
      LEGACY_STORAGE_KEY: "legacy-workspace",
      FAVORITES_KEY: "favorites",
      localStorage: {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : null;
        }
      },
      storageAvailable: true,
      tasks: [],
      favorites: new Set(),
      workspaceRecoveryBlocked: false,
      modules: [],
      messages: [],
      normalizeLoadedTasks(rawTasks) {
        if (!Array.isArray(rawTasks)) {
          return { tasks: [], invalidContainer: true, repairedIds: 0, discardedTasks: 0, excessTasks: 0 };
        }
        return { tasks: rawTasks, repairedIds: 0, discardedTasks: 0, excessTasks: 0 };
      },
      normalizeFavoriteIds(ids) { return Array.isArray(ids) ? ids : []; },
      updateStorageNote() {},
      showToast(message) { context.messages.push(message); }
    };
    vm.runInNewContext("(" + source + ")", context)();
    return context;
  }

  assert.equal(load({ workspace: "null", favorites: "[]" }).workspaceRecoveryBlocked, true);
  assert.equal(load({ workspace: JSON.stringify({ version: 1, tasks: [] }), favorites: "[]" }).workspaceRecoveryBlocked, true);
  assert.equal(load({ workspace: JSON.stringify({ version: 2, tasks: [] }), favorites: "[]" }).workspaceRecoveryBlocked, false);
  assert.equal(load({ "legacy-workspace": "[]", favorites: "[]" }).workspaceRecoveryBlocked, false);
  assert.equal(load({ "legacy-workspace": "null", favorites: "[]" }).workspaceRecoveryBlocked, true);
  assert.equal(load({ workspace: "", "legacy-workspace": "[]", favorites: "[]" }).workspaceRecoveryBlocked, true);
});

test("workspace save guard rejects implicit writes and permits explicit validated recovery", () => {
  const start = app.indexOf("  function saveWorkspace(");
  const end = app.indexOf("\n  function renderTasks()", start);
  assert.ok(start >= 0 && end > start, "workspace save function boundaries must exist");
  const writes = [];
  const context = {
    workspaceRecoveryBlocked: true,
    STORAGE_KEY: "workspace-test-key",
    tasks: [],
    persist(key, value) { writes.push({ key, value }); return true; },
    showToast() {},
    updateStorageNote() {}
  };
  const saveWorkspace = vm.runInNewContext("(" + app.slice(start, end).trim() + ")", context);
  assert.equal(saveWorkspace([{ id: "task-1", text: "ordinary write", done: false }]), false);
  assert.equal(writes.length, 0, "ordinary writes must not replace a recovered partial snapshot");
  assert.equal(saveWorkspace([], { recover: true }), true);
  assert.equal(writes.length, 1);
  assert.equal(context.workspaceRecoveryBlocked, false);
  assert.equal(writes[0].key, "workspace-test-key");
});

test("recovery lock ignores cross-tab workspace writes and storage-clear events", () => {
  const start = app.indexOf("  function handleStorageChange(event) {");
  const end = app.indexOf("\n  function normalizeLoadedTasks(rawTasks)", start);
  assert.ok(start >= 0 && end > start, "storage event handler boundaries must exist");
  const initialTasks = [{ id: "kept-task", text: "Preserve this task", done: false }];
  const initialFavorites = new Set(["kept-module"]);
  const notices = [];
  const context = {
    workspaceRecoveryBlocked: true,
    STORAGE_KEY: "workspace-test-key",
    FAVORITES_KEY: "favorites-test-key",
    localStorage: {},
    tasks: initialTasks,
    favorites: initialFavorites,
    selectedModule: null,
    showToast(message) { notices.push(message); },
    renderTasks() { throw new Error("blocked storage events must not render changed tasks"); },
    renderFeatured() { throw new Error("blocked clear events must not reset favorites"); },
    renderCatalog() { throw new Error("blocked clear events must not render changed favorites"); },
    updateStorageNote() {},
    openModule() {},
    parseStoredTasks() { throw new Error("blocked workspace payload must not be parsed"); },
    parseStoredFavorites() { throw new Error("blocked favorite payload must not be parsed"); }
  };
  const handleStorageChange = vm.runInNewContext("(" + app.slice(start, end).trim() + ")", context);
  handleStorageChange({ storageArea: context.localStorage, key: "workspace-test-key", newValue: "{\"version\":2,\"tasks\":[]}" });
  handleStorageChange({ storageArea: context.localStorage, key: null, newValue: null });
  assert.equal(context.tasks, initialTasks);
  assert.equal(context.favorites, initialFavorites);
  assert.deepEqual(Array.from(context.favorites), ["kept-module"]);
  assert.equal(notices.length, 2);
  assert.ok(notices.every(message => message.includes("بازیابی فضای کار")));
});

test("workspace loading repairs missing and duplicate task IDs", () => {
  assert.ok(app.includes("const seenTaskIds = new Set()"));
  assert.ok(app.includes("seenTaskIds.has(id)"));
  assert.ok(app.includes("id = createId()"));
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v12"/);
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
  assert.match(app, /function saveWorkspace\(nextTasks = tasks, options = \{\}\)/);
  assert.match(app, /if \(!saveWorkspace\(nextTasks\)\) return false;[\s\S]{0,100}tasks = nextTasks/);
  assert.match(app, /if \(saveWorkspace\(nextTasks\)\) tasks = nextTasks/);
  assert.match(app, /if \(saveWorkspace\(nextTasks\)\) \{[\s\S]{0,100}tasks = nextTasks/);
});

test("workspace import commits task and favorite state only after persistence succeeds", () => {
  assert.match(app, /const nextTasks = \[\.\.\.accepted, \.\.\.tasks\]/);
  assert.match(app, /const nextFavorites = new Set\(favorites\)/);
  assert.match(app, /if \(!saveWorkspace\(nextTasks, \{ recover: true \}\)\) \{[\s\S]*?persist\(FAVORITES_KEY, Array\.from\(favorites\)\);[\s\S]*?return;/);
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


test("module IDs remain stable to protect favorites and cross-module references", () => {
  const ids = moduleRegistry.modules.map(module => module.id);
  assert.equal(ids.includes("workspace"), true);
  assert.equal(ids.includes("ai-hub"), true);
  assert.equal(ids.includes("network-linux"), true);
  assert.match(platformText, /Stable lowercase identifier; immutable after release/);
});


test("proposed backend contract has an executable CI validation gate", () => {
  assert.match(workflowText, /ruby scripts\/validate-openapi\.rb/);
  assert.match(openapiText, /openapi: 3\.1\.0/);
  assert.match(openapiText, /DESIGN CONTRACT ONLY/);
  assert.match(openapiValidatorText, /unresolved reference/);
  assert.match(openapiValidatorText, /must require bearerAuth/);
  assert.match(openapiValidatorText, /Idempotency-Key/);
  assert.match(openapiValidatorText, /TaskUpdate must reject empty patches/);
});


test("GitHub Actions are pinned to immutable commits and monitored by Dependabot", () => {
  const actionRefs = [...workflowText.matchAll(/^\s+uses:\s+([^\s]+)/gm)].map(match => match[1]);
  assert.ok(actionRefs.length >= 5);
  for (const reference of actionRefs) assert.match(reference, /^[^@]+@[a-f0-9]{40}$/);
  assert.match(dependabotText, /package-ecosystem: github-actions/);
  assert.match(dependabotText, /interval: weekly/);
});


test("cross-tab task synchronization strictly validates stored snapshots", () => {
  const start = app.indexOf("  function parseStoredTasks(raw) {");
  const end = app.indexOf("\n  function parseStoredFavorites(raw)", start);
  assert.ok(start >= 0 && end > start, "stored task parser boundaries must exist");
  const parse = vm.runInNewContext("(function() { const MAX_TASKS = 100; return (" +
    app.slice(start, end).trim() + "); })()");

  const valid = parse(JSON.stringify({
    version: 2,
    tasks: [{ id: "task-1", text: "  Learn   Linux  ", done: false }]
  }));
  assert.deepEqual(JSON.parse(JSON.stringify(valid)), [
    { id: "task-1", text: "Learn Linux", done: false }
  ]);
  assert.throws(() => parse(JSON.stringify({ version: 1, tasks: [] })));
  assert.throws(() => parse(JSON.stringify({ version: 2, tasks: [{ id: "x", text: "ok", done: "false" }] })));
  assert.throws(() => parse(JSON.stringify({ version: 2, tasks: [
    { id: "same", text: "first", done: false },
    { id: "same", text: "second", done: true }
  ] })));
  assert.throws(() => parse(JSON.stringify({ version: 2, tasks: [
    { id: " task-1 ", text: "first", done: false },
    { id: "task-1", text: "second", done: true }
  ] })));
  assert.throws(() => parse(JSON.stringify({ version: 2, tasks: [
    { id: "long", text: "x".repeat(121), done: false }
  ] })));
  assert.throws(() => parse(JSON.stringify({
    version: 2, tasks: Array.from({ length: 101 }, (_, i) => ({
      id: "task-" + i, text: "Task", done: false
    }))
  })));
});

test("workspace listens for same-origin storage changes and refreshes affected views", () => {
  assert.match(app, /function handleStorageChange\(event\)/);
  assert.match(app, /window\.addEventListener\("storage", handleStorageChange\)/);
  assert.match(app, /event\.key === STORAGE_KEY/);
  assert.match(app, /event\.key === FAVORITES_KEY/);
  assert.match(app, /event\.key === null/);
  assert.match(app, /دادهٔ کارها در تب دیگر نامعتبر بود؛ وضعیت فعلی حفظ شد/);
  assert.match(app, /دادهٔ نشان‌شده‌ها در تب دیگر نامعتبر بود؛ وضعیت فعلی حفظ شد/);
});

test("cross-tab synchronization remains active when workspace recovery is not blocked", () => {
  const start = app.indexOf("  function handleStorageChange(event) {");
  const end = app.indexOf("\n  function normalizeLoadedTasks(rawTasks)", start);
  assert.ok(start >= 0 && end > start, "storage event handler boundaries must exist");
  const nextTasks = [{ id: "remote-task", text: "Updated in another tab", done: true }];
  let taskRenders = 0;
  let favoriteRenders = 0;
  const context = {
    workspaceRecoveryBlocked: false,
    STORAGE_KEY: "workspace-test-key",
    FAVORITES_KEY: "favorites-test-key",
    localStorage: {},
    tasks: [{ id: "old-task", text: "Old", done: false }],
    favorites: new Set(["old-favorite"]),
    selectedModule: null,
    showToast() {},
    renderTasks() { taskRenders += 1; },
    renderFeatured() { favoriteRenders += 1; },
    renderCatalog() { favoriteRenders += 1; },
    updateStorageNote() {},
    openModule() {},
    parseStoredTasks() { return nextTasks; },
    parseStoredFavorites() { return []; }
  };
  const handleStorageChange = vm.runInNewContext("(" + app.slice(start, end).trim() + ")", context);
  handleStorageChange({ storageArea: context.localStorage, key: "workspace-test-key", newValue: "{}" });
  assert.equal(context.tasks, nextTasks);
  assert.equal(taskRenders, 1);
  handleStorageChange({ storageArea: context.localStorage, key: null, newValue: null });
  assert.equal(context.tasks.length, 0);
  assert.equal(Array.from(context.favorites).length, 0);
  assert.equal(taskRenders, 2);
  assert.equal(favoriteRenders, 2);
});

test("architecture and platform contracts describe browser-local cross-tab recovery semantics", async () => {
  const architecture = await readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8");
  const contracts = await readFile(new URL("../docs/PLATFORM_CONTRACTS.md", import.meta.url), "utf8");
  assert.match(architecture, /synchronize across same-origin tabs/);
  assert.match(architecture, /incoming task writes and storage-clear events are ignored/);
  assert.match(contracts, /storage-clear event resets both local views/);
  assert.match(contracts, /incoming task writes and storage-clear events are ignored/);
});

test("cross-tab favorites snapshots reject malformed or oversized values", () => {
  const start = app.indexOf("  function parseStoredFavorites(raw) {");
  const end = app.indexOf("\n  function handleStorageChange(event)", start);
  assert.ok(start >= 0 && end > start, "stored favorites parser boundaries must exist");
  const parse = vm.runInNewContext("(function() { const modules = []; const normalizeFavoriteIds = ids => Array.from(new Set(ids)); return (" +
    app.slice(start, end).trim() + "); })()");
  assert.deepEqual(Array.from(parse(JSON.stringify(["ai-hub", "agents", "ai-hub"]))), ["ai-hub", "agents"]);
  assert.throws(() => parse(JSON.stringify(["invalid id"])));
  assert.throws(() => parse(JSON.stringify(Array.from({ length: 51 }, (_, i) => "module-" + i))));
});


test("formal workspace backup JSON Schema matches the versioned import contract", () => {
  assert.equal(workspaceSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(workspaceSchema.additionalProperties, false);
  assert.deepEqual(workspaceSchema.required, ["schema", "version", "tasks"]);
  assert.equal(workspaceSchema.properties.schema.const, "mr-siavash-ai-workspace");
  assert.equal(workspaceSchema.properties.version.const, 1);
  assert.equal(workspaceSchema.properties.tasks.maxItems, 100);
  assert.equal(workspaceSchema.properties.favorites.maxItems, 50);
  assert.equal(workspaceSchema.$defs.task.additionalProperties, false);
  assert.deepEqual([...workspaceSchema.$defs.task.required].sort(), ["done", "text"]);
  assert.equal(workspaceSchema.$defs.task.properties.text.maxLength, 120);
  assert.equal(workspaceSchema.$defs.task.properties.text.pattern, "\\S");
  assert.equal(workspaceSchema.$defs.task.properties.done.type, "boolean");
});

test("workspace backup runtime validator rejects unknown fields and invalid nested records", () => {
  const start = app.indexOf("  function validateWorkspaceBackup(data) {");
  const end = app.indexOf("\n  async function importWorkspace(file)", start);
  assert.ok(start >= 0 && end > start, "workspace backup validator boundaries must exist");
  const validate = vm.runInNewContext("(function() { const MAX_TASKS = 100; return (" +
    app.slice(start, end).trim() + "); })()");
  const valid = {
    schema: "mr-siavash-ai-workspace",
    version: 1,
    exportedAt: "2026-11-06T00:00:00.000Z",
    tasks: [{ id: "task-1", text: "Learn Linux", done: false }],
    favorites: ["ai-hub", "workspace"]
  };
  assert.deepEqual(JSON.parse(JSON.stringify(validate(structuredClone(valid)))), valid);

  const unknownRoot = structuredClone(valid);
  unknownRoot.owner = "unexpected";
  assert.throws(() => validate(unknownRoot));
  const unknownTask = structuredClone(valid);
  unknownTask.tasks[0].html = "<script>";
  assert.throws(() => validate(unknownTask));
  const longText = structuredClone(valid);
  longText.tasks[0].text = "x".repeat(121);
  assert.throws(() => validate(longText));
  const duplicateFavorites = structuredClone(valid);
  duplicateFavorites.favorites = ["ai-hub", "ai-hub"];
  assert.throws(() => validate(duplicateFavorites));
  const tooManyFavorites = structuredClone(valid);
  tooManyFavorites.favorites = Array.from({ length: 51 }, (_, i) => "module-" + i);
  assert.throws(() => validate(tooManyFavorites));
  const invalidId = structuredClone(valid);
  invalidId.tasks[0].id = "id with spaces";
  assert.throws(() => validate(invalidId));
});


test("static document enforces a restrictive self-hosted Content Security Policy", () => {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(match, "a CSP meta policy must be present");
  const directives = new Map(match[1].split(";").map(part => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }));
  for (const name of ["default-src", "base-uri", "object-src", "script-src", "style-src",
    "img-src", "font-src", "connect-src", "manifest-src", "worker-src", "form-action", "frame-src"]) {
    assert.ok(directives.has(name), "missing CSP directive: " + name);
  }
  assert.deepEqual(directives.get("default-src"), ["'self'"]);
  assert.deepEqual(directives.get("script-src"), ["'self'"]);
  assert.deepEqual(directives.get("style-src"), ["'self'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("frame-src"), ["'none'"]);
  assert.ok(directives.has("upgrade-insecure-requests"));
  assert.doesNotMatch(match[1], /unsafe-inline|unsafe-eval|https?:\/\//i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "inline event handlers would violate the policy");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, "inline scripts would violate the policy");
  assert.doesNotMatch(html, /\sstyle\s*=/i, "inline style attributes would violate the policy");
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(css, /@import|url\(\s*["']?https?:/i, "stylesheets must not introduce remote resources");
});


test("GitHub Pages deployment is restricted to successful main-branch non-PR runs", () => {
  assert.match(workflowText, /if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(workflowText, /needs: quality/);
  assert.match(workflowText, /timeout-minutes: 10/);
  assert.match(workflowText, /pages: write/);
  assert.match(workflowText, /id-token: write/);
  assert.match(workflowText, /url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
  assert.doesNotMatch(workflowText, /if: github\.event_name != 'pull_request'/);
});
