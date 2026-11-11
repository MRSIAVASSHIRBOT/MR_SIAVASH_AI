import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import vm from "node:vm";
import { supportGate, supportTrackingGate, validTicketCredentials } from "../support-tickets.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const experienceCss = await readFile(new URL("../experience.css", import.meta.url), "utf8");
const experienceNextCss = await readFile(new URL("../experience-next.css", import.meta.url), "utf8");
const studioCss = await readFile(new URL("../studio.css", import.meta.url), "utf8");
const atelierCss = await readFile(new URL("../atelier.css", import.meta.url), "utf8");
const fieldNotesCss = await readFile(new URL("../field-notes.css", import.meta.url), "utf8");
const uiSounds = await readFile(new URL("../ui-sounds.js", import.meta.url), "utf8");
const supportCss = await readFile(new URL("../support.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const support = await readFile(new URL("../support.js", import.meta.url), "utf8");
const privacyText = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
const supportTickets = await readFile(new URL("../support-tickets.mjs", import.meta.url), "utf8");
const boundedJson = await readFile(new URL("../bounded-json.js", import.meta.url), "utf8");
const searchSource = await readFile(new URL("../site-search.js", import.meta.url), "utf8");
const manifestText = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");
const moduleRegistryText = await readFile(new URL("../modules.json", import.meta.url), "utf8");
const moduleRegistry = JSON.parse(moduleRegistryText);
const moduleSchemaText = await readFile(new URL("../schemas/module-registry.schema.json", import.meta.url), "utf8");
const moduleSchema = JSON.parse(moduleSchemaText);
const workspaceSchemaText = await readFile(new URL("../schemas/workspace-backup.schema.json", import.meta.url), "utf8");
const workspaceSchema = JSON.parse(workspaceSchemaText);
const hubStatusText = await readFile(new URL("../hub-status.json", import.meta.url), "utf8");
const hubStatus = JSON.parse(hubStatusText);
const hubStatusSchemaText = await readFile(new URL("../schemas/hub-public-status.schema.json", import.meta.url), "utf8");
const hubStatusSchema = JSON.parse(hubStatusSchemaText);
const platformText = await readFile(new URL("../docs/PLATFORM_CONTRACTS.md", import.meta.url), "utf8");
const openapiText = await readFile(new URL("../docs/backend/openapi.yaml", import.meta.url), "utf8");
const openapiValidatorText = await readFile(new URL("../scripts/validate-openapi.rb", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workflowText = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
const gatewaySmokeWorkflowText = await readFile(new URL("../.github/workflows/gateway-smoke.yml", import.meta.url), "utf8");
const dependabotText = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");

test("Cloudflare gateway runtime smoke checks live health and exact-origin CORS", () => {
  assert.match(gatewaySmokeWorkflowText, /workflow_dispatch/);
  assert.match(gatewaySmokeWorkflowText, /GATEWAY_BASE_URL: https:\/\/mr-siavash-ai-gateway\.mrsiavashirbot\.workers\.dev/);
  assert.match(gatewaySmokeWorkflowText, /ALLOWED_ORIGIN: https:\/\/mrsiavasshirbot\.github\.io/);
  assert.match(gatewaySmokeWorkflowText, /\/v1\/health\/live/);
  assert.match(gatewaySmokeWorkflowText, /\/v1\/health\/ready/);
  assert.match(gatewaySmokeWorkflowText, /dependencies\?\.database!==\"ready\"/);
  assert.match(gatewaySmokeWorkflowText, /Access-Control-Request-Method: GET/);
  assert.match(gatewaySmokeWorkflowText, /https:\/\/untrusted\.invalid/);
  assert.match(gatewaySmokeWorkflowText, /case "\$status" in/);
  assert.match(gatewaySmokeWorkflowText, /204\|403/);
  assert.match(gatewaySmokeWorkflowText, /--dump-header "\$headers_file"/);
  assert.match(gatewaySmokeWorkflowText, /access-control-allow-origin:/);
  assert.doesNotMatch(gatewaySmokeWorkflowText, /(?:CF_API_TOKEN|CLOUDFLARE_API_TOKEN|Authorization: Bearer)/i);
});

test("HTML references app assets and install manifest", () => {
  assert.match(html, /href="\.\/*styles\.css"/);
  assert.match(html, /href="\.\/*experience\.css"/);
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
  assert.match(html, /href="\.\/studio\.html"/, "digital studio must be reachable from the main site");
});

test("administrator console navigation uses the reviewed production entry page, not Preview", async () => {
  const adminEntry = await readFile(new URL("../admin-support.html", import.meta.url), "utf8");
  assert.match(html, /href="\.\/admin-support\.html"/);
  assert.match(html, /پنل مدیریت/);
  assert.match(html, /target="_blank" rel="noopener noreferrer" aria-label="ورود به مرکز مدیریت پشتیبانی MR_SIAVASH_AI؛ نیازمند احراز هویت"/);
  assert.match(adminEntry, /https:\/\/mr-siavash-ai-gateway\.mrsiavashirbot\.workers\.dev\/admin/);
  assert.doesNotMatch(html, /mr-siavash-ai-gateway-preview/);
});

test("support deep links open the existing support center", () => {
  assert.match(app, /if \(viewName === "support"\)[\s\S]*?supportDialog\.showModal\(\)/);
  assert.match(html, /id="supportDialog"/);
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

test("Field Notes design system is loaded as a local responsive layer", () => {
  assert.equal((fieldNotesCss.match(/\{/g) || []).length, (fieldNotesCss.match(/\}/g) || []).length);
  assert.match(html, /href="\.\/field-notes\.css"/);
  assert.match(fieldNotesCss, /prefers-reduced-motion: reduce/);
  assert.match(fieldNotesCss, /forced-colors: active/);
  assert.match(fieldNotesCss, /\.project-card:nth-child\(1\)/);
});

test("stylesheet braces are balanced", () => {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  assert.equal((supportCss.match(/\{/g) || []).length, (supportCss.match(/\}/g) || []).length);
});

test("support stylesheet has valid line endings and assistant source styles", () => {
  assert.equal(supportCss.includes("\\n"), false, "literal backslash-n sequences must not appear in CSS");
  assert.match(supportCss, /\.assistant-sources\s*\{/);
  assert.match(supportCss, /safe-area-inset-bottom/);
});

test("cross-page interaction refinements include keyboard and reduced-motion support", () => {
  assert.match(css, /:where\(button,a,input,select,textarea,\[tabindex\]\):focus-visible/);
  assert.match(css, /@media\(forced-colors:active\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(max-width:420px\)/);
});

test("web manifest is valid and scoped to the deployment path", () => {
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.dir, "rtl");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});

test("service worker caches the static shell and ignores non-GET requests", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
  assert.match(sw, /SHELL_FILES/);
  assert.match(sw, /"\.\/modules\.json"/);
  assert.match(sw, /"\.\/python\.html"/);
  assert.match(sw, /"\.\/python-course\.js"/);
  assert.match(sw, /"\.\/python-course\.css"/);
  assert.match(sw, /"\.\/studio\.html"/);
  assert.match(sw, /"\.\/studio-portfolio\.css"/);
  assert.match(sw, /"\.\/studio-portfolio\.js"/);
  assert.match(sw, /"\.\/field-notes\.css"/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /request\.method !== "GET"/);
});


test("proposed backend contract is explicitly design-only and versioned", async () => {
  const api = await readFile(new URL("../docs/backend/openapi.yaml", import.meta.url), "utf8");
  const backendGuide = await readFile(new URL("../docs/backend/README.md", import.meta.url), "utf8");
  assert.match(api, /openapi: 3\.1\.0/);
  assert.match(api, /version: 0\.1\.0/);
  assert.match(api, /API design contract and partial route contract/);
  assert.match(api, /bearerAuth/);
  assert.match(api, /Idempotency-Key/);
  assert.match(api, /additionalProperties: false/);
  assert.match(backendGuide, /separate from the static GitHub Pages frontend/);
  assert.match(backendGuide, /production Worker is `mr-siavash-ai-gateway`/);
  assert.match(backendGuide, /Preview smoke checks passed for liveness, D1 readiness/);
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
  assert.match(roadmap, /^# Product roadmap — parallel workstreams/m);
  assert.doesNotMatch(roadmap, /^#\s*$/m);
  assert.doesNotMatch(roadmap, /source\.Product roadmap/);
  assert.match(roadmap, /parallel workstreams/);
  assert.match(roadmap, /main commit `971a5e702876a0bc78b19c55b8b0daf358471c5b`/);
  assert.match(roadmap, /Production release workflow run `42801780384` completed successfully/);
  assert.match(roadmap, /Worker version `146709f7-8158-40c8-aa80-b8b0772787f1` receiving 100% of traffic/);
  assert.match(roadmap, /58\/58 Node tests/);
  assert.match(roadmap, /real Workers AI request that returned `mode: ai_grounded` with non-empty sources/);
  assert.match(roadmap, /daily `0 3 \* \* \*` cleanup schedule/);
  assert.match(roadmap, /does not by itself prove that a cleanup execution has occurred/);
  assert.match(roadmap, /end-to-end administrator ticket workflow acceptance and Preview sign-in remain separate checks/);
  assert.doesNotMatch(roadmap, /Preview traffic remains rolled back to v3/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
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
  assert.match(openapiText, /API design contract and partial route contract/);
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
  assert.deepEqual(directives.get("connect-src"), ["'self'", "https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev"]);
  const nonConnectSources = [...directives.entries()].filter(([name]) => name !== "connect-src").flatMap(([, values]) => values).join(" ");
  assert.equal(nonConnectSources.includes("https://"), false);
  assert.equal(nonConnectSources.includes("unsafe-inline"), false);
  assert.equal(nonConnectSources.includes("unsafe-eval"), false);
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


test("hero experience includes accessible 3D motion controls and reduced-motion support", () => {
  assert.match(html, /class="hero-visual[^"]*"[^>]*data-motion-paused="false"/);
  assert.match(html, /id="motionToggle"[^>]*aria-pressed="false"/);
  assert.match(html, /توقف حرکت/);
  assert.match(app, /function initMotionControls\(\)/);
  assert.match(app, /visual\.dataset\.motionPaused = String\(paused\)/);
  assert.match(app, /button\.setAttribute\("aria-pressed", String\(paused\)\)/);
  assert.match(app, /initMotionControls\(\)/);
  assert.match(atelierCss, /perspective:1000px/);
  assert.match(atelierCss, /transform-style:preserve-3d/);
  assert.match(atelierCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(atelierCss, /\.hero-visual:hover \.atelier-paper/);
});

test("hero pointer tilt is bounded, frame-throttled, and reset on pause or pointer exit", () => {
  const start = app.indexOf("  function initMotionControls() {");
  const end = app.indexOf("  function initScrollReveal()", start);
  assert.ok(start >= 0 && end > start, "motion control function boundaries must exist");
  const source = app.slice(start, end);
  const visualEvents = {};
  const buttonEvents = {};
  const documentEvents = {};
  const styles = {};
  const attributes = {};
  let frameCallback = null;
  let frameId = 0;
  const scene = {
    dataset: {},
    style: { setProperty(name, value) { styles[name] = value; } }
  };
  const visual = {
    dataset: {},
    addEventListener(name, callback) { visualEvents[name] = callback; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 100 }; },
    querySelector(selector) { return selector === ".hero-scene" ? scene : null; }
  };
  const button = {
    disabled: false,
    textContent: "",
    addEventListener(name, callback) { buttonEvents[name] = callback; },
    setAttribute(name, value) { attributes[name] = value; }
  };
  const motionPreference = { matches: false, addEventListener(name, callback) { this.listener = callback; } };
  const pointerPreference = { matches: true };
  const windowStub = {
    matchMedia(query) { return query.includes("prefers-reduced-motion") ? motionPreference : pointerPreference; },
    requestAnimationFrame(callback) { frameCallback = callback; return ++frameId; },
    cancelAnimationFrame() { frameCallback = null; }
  };
  const documentStub = {
    visibilityState: "visible",
    addEventListener(name, callback) { documentEvents[name] = callback; }
  };
  const init = vm.runInNewContext("(() => { " + source + "; return initMotionControls; })()", {
    $: (selector, root) => selector === ".hero-visual" ? visual : selector === ".hero-scene" ? root.querySelector(selector) : button, window: windowStub, document: documentStub
  });

  init();
  assert.equal(typeof visualEvents.pointermove, "function");
  visualEvents.pointermove({ pointerType: "mouse", clientX: 200, clientY: 0 });
  assert.equal(typeof frameCallback, "function");
  const renderFrame = frameCallback;
  frameCallback = null;
  renderFrame();
  assert.equal(styles["--hero-tilt-x"], "4.00deg");
  assert.equal(styles["--hero-tilt-y"], "4.00deg");
  assert.equal(scene.dataset.tilting, "true");

  visualEvents.pointerleave();
  assert.equal(styles["--hero-tilt-x"], "0deg");
  assert.equal(styles["--hero-tilt-y"], "0deg");
  assert.equal(scene.dataset.tilting, "false");

  visualEvents.pointermove({ pointerType: "mouse", clientX: 200, clientY: 0 });
  buttonEvents.click();
  assert.equal(visual.dataset.motionPaused, "true");
  assert.equal(attributes["aria-pressed"], "true");
  assert.equal(styles["--hero-tilt-x"], "0deg");
  frameCallback = null;
  visualEvents.pointermove({ pointerType: "mouse", clientX: 200, clientY: 0 });
  assert.equal(frameCallback, null);

  buttonEvents.click();
  assert.equal(visual.dataset.motionPaused, "false");
  motionPreference.matches = true;
  motionPreference.listener();
  assert.equal(visual.dataset.motionPaused, "true");
  assert.equal(button.disabled, true);
  motionPreference.matches = false;
  motionPreference.listener();
  assert.equal(visual.dataset.motionPaused, "false");
  assert.equal(button.disabled, false);
  documentStub.visibilityState = "hidden";
  documentEvents.visibilitychange();
  assert.equal(visual.dataset.pageHidden, "true");
  assert.equal(styles["--hero-tilt-y"], "0deg");
});

test("hero pointer tilt is not enabled for reduced-motion or coarse-pointer users", () => {
  const start = app.indexOf("  function initMotionControls() {");
  const end = app.indexOf("  function initScrollReveal()", start);
  const source = app.slice(start, end);
  const visualEvents = {};
  const buttonEvents = {};
  const attributes = {};
  const scene = { dataset: {}, style: { setProperty() {} } };
  const visual = {
    dataset: {},
    addEventListener(name, callback) { visualEvents[name] = callback; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    querySelector(selector) { return selector === ".hero-scene" ? scene : null; }
  };
  const button = {
    addEventListener(name, callback) { buttonEvents[name] = callback; },
    setAttribute(name, value) { attributes[name] = value; }
  };
  const motionPreference = { matches: true, addEventListener() {} };
  const pointerPreference = { matches: false };
  const windowStub = {
    matchMedia(query) { return query.includes("prefers-reduced-motion") ? motionPreference : pointerPreference; },
    requestAnimationFrame() { throw new Error("RAF must not be requested"); }
  };
  const documentStub = { visibilityState: "visible", addEventListener() {} };
  const init = vm.runInNewContext("(() => { " + source + "; return initMotionControls; })()", {
    $: (selector, root) => selector === ".hero-visual" ? visual : selector === ".hero-scene" ? root.querySelector(selector) : button, window: windowStub, document: documentStub
  });
  init();
  assert.equal(button.disabled, true);
  assert.equal(attributes["aria-pressed"], "true");
  assert.equal(visual.dataset.motionPaused, "true");
  assert.equal(visualEvents.pointermove, undefined);
});

test("coarse-pointer devices keep the hero scene static", () => {
  const start = app.indexOf("  function initMotionControls() {");
  const end = app.indexOf("  function initScrollReveal()", start);
  const source = app.slice(start, end);
  const visualEvents = {};
  const scene = { dataset: {}, style: { setProperty() {} } };
  const visual = {
    dataset: {},
    addEventListener(name, callback) { visualEvents[name] = callback; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    querySelector(selector) { return selector === ".hero-scene" ? scene : null; }
  };
  const button = {
    addEventListener() {},
    setAttribute() {}
  };
  const motionPreference = { matches: false, addEventListener() {} };
  const pointerPreference = { matches: false };
  const windowStub = {
    matchMedia(query) { return query.includes("prefers-reduced-motion") ? motionPreference : pointerPreference; },
    requestAnimationFrame() { throw new Error("Coarse pointers must not request animation frames"); }
  };
  const documentStub = { visibilityState: "visible", addEventListener() {} };
  const init = vm.runInNewContext("(() => { " + source + "; return initMotionControls; })()", {
    $: (selector, root) => selector === ".hero-visual" ? visual : selector === ".hero-scene" ? root.querySelector(selector) : button,
    window: windowStub,
    document: documentStub
  });
  init();
  assert.equal(visualEvents.pointermove, undefined);
  assert.equal(button.disabled, false);
  assert.equal(visual.dataset.motionPaused, "false");
});

test("decorative 3D illustration layers are hidden from assistive technology", () => {
  assert.match(html, /class="hero-scene atelier-scene" aria-hidden="true"/);
  assert.match(html, /class="atelier-paper"/);
  assert.match(html, /class="atelier-orbit-label atelier-label-one"/);
});


test("scroll reveal is progressive enhancement and respects reduced motion", () => {
  assert.match(html, /data-reveal="up"/);
  assert.match(app, /function initScrollReveal\(\)/);
  assert.match(app, /const targets = \$\$\("\[data-reveal\]"\)/);
  assert.match(app, /typeof window\.IntersectionObserver !== "function"/);
  assert.match(app, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(app, /entry\.target\.classList\.add\("is-revealed"\)/);
  assert.match(app, /document\.documentElement\.classList\.add\("reveal-ready"\)/);
  assert.match(app, /initScrollReveal\(\)/);
  assert.match(css, /html\.reveal-ready \[data-reveal="up"\]/);
  assert.match(css, /html\.reveal-ready \[data-reveal="up"\]\.is-revealed/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /opacity:1;\s*transform:none;\s*transition:none;/);
});

test("hero animation pauses while the browser document is hidden", () => {
  assert.match(app, /const syncVisibility = \(\) =>/);
  assert.match(app, /document\.visibilityState === "hidden"/);
  assert.match(app, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(css, /hero-visual\[data-page-hidden="true"\]/);
  assert.match(css, /animation-play-state:paused/);
});


test("scroll reveal observes target collections and reveals intersecting elements", () => {
  const start = app.indexOf("  function initScrollReveal() {");
  const end = app.indexOf(String.fromCharCode(10) + "  function init()", start);
  assert.ok(start >= 0 && end > start, "scroll reveal function boundaries must exist");
  const source = app.slice(start, end);
  const targets = [
    { classList: { values: [], add(value) { this.values.push(value); } } },
    { classList: { values: [], add(value) { this.values.push(value); } } }
  ];
  let callback;
  let observed = [];
  let unobserved = [];
  const rootClasses = [];
  function FakeObserver(handler, options) {
    callback = handler;
    this.options = options;
    this.observe = target => observed.push(target);
    this.unobserve = target => unobserved.push(target);
  }
  const windowStub = {
    IntersectionObserver: FakeObserver,
    matchMedia: () => ({ matches: false })
  };
  const documentStub = {
    documentElement: { classList: { add(value) { rootClasses.push(value); } } }
  };
  const init = vm.runInNewContext("(() => { " + source + "; return initScrollReveal; })()", {
    window: windowStub,
    document: documentStub,
    $$: selector => {
      assert.equal(selector, "[data-reveal]");
      return targets;
    }
  });

  init();
  assert.deepEqual(observed, targets);
  assert.equal(typeof callback, "function");
  assert.equal(rootClasses[0], "reveal-ready");
  assert.equal(callback.length, 2);
  callback([
    { isIntersecting: false, target: targets[0] },
    { isIntersecting: true, target: targets[1] }
  ], { unobserve: target => unobserved.push(target) });
  assert.deepEqual(targets[0].classList.values, []);
  assert.deepEqual(targets[1].classList.values, ["is-revealed"]);
  assert.deepEqual(unobserved, [targets[1]]);
});

test("scroll reveal leaves content untouched without observer support or when motion is reduced", () => {
  const start = app.indexOf("  function initScrollReveal() {");
  const end = app.indexOf(String.fromCharCode(10) + "  function init()", start);
  const source = app.slice(start, end);
  const rootClasses = [];
  const documentStub = {
    documentElement: { classList: { add(value) { rootClasses.push(value); } } }
  };
  const run = windowStub => vm.runInNewContext(
    "(() => { " + source + "; return initScrollReveal; })()",
    { window: windowStub, document: documentStub, $$: () => [{ classList: { add() {} } }] }
  );

  run({}).call();
  assert.deepEqual(rootClasses, []);
  run({ IntersectionObserver: function () {}, matchMedia: () => ({ matches: true }) }).call();
  assert.deepEqual(rootClasses, []);
});


test("global search and support center are wired without inline script execution", () => {
  assert.match(html, /id="globalSearchButton"/);
  assert.match(html, /id="siteSearchDialog"/);
  assert.match(html, /id="supportLauncher"/);
  assert.match(html, /id="supportDialog"/);
  assert.match(html, /id="ticketTrackForm"/);
  assert.match(html, /support\.js/);
  assert.match(html, /support\.css/);
  assert.match(sw, /"\.\/support\.js"/);
  assert.match(sw, /"\.\/support\.css"/);
  assert.doesNotMatch(support, /innerHTML\s*=/);
});

test("global search indexes primary destinations and the support center", async () => {
  const index = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));
  const search = await readFile(new URL("../site-search.js", import.meta.url), "utf8");
  assert.ok(index.items.some(item => item.title === "مرکز پشتیبانی" && item.action === "support"));
  assert.match(search, /mr-siavash-ai-search-index/);
  assert.match(search, /ALLOWED_VIEWS/);
});


test("flagship styles and interface audio are loaded on both entry points and offline shell", async () => {
  const pythonHtml = await readFile(new URL("../python.html", import.meta.url), "utf8");
  assert.match(html, /href="\.\/studio\.css"/);
  assert.match(html, /src="\.\/ui-sounds\.js"/);
  assert.match(pythonHtml, /href="\.\/experience\.css"/);
  assert.match(pythonHtml, /href="\.\/studio\.css"/);
  assert.match(pythonHtml, /src="\.\/ui-sounds\.js"/);
  assert.match(sw, /"\.\/experience\.css"/);
  assert.match(sw, /"\.\/studio\.css"/);
  assert.match(sw, /"\.\/ui-sounds\.js"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
});

test("homepage experience additions are present and versioned", () => {
  assert.match(html, /class="hero-proof-row"/);
  assert.match(html, /class="hero-readout"/);
  assert.match(html, /class="experience-strip"/);
  assert.match(html, /نسخه ۱\.۰/);
});

test("experience stylesheet has balanced syntax and responsive accessibility contracts", () => {
  assert.equal((experienceCss.match(/\{/g) || []).length, (experienceCss.match(/\}/g) || []).length);
  assert.match(experienceCss, /--experience-accent/);
  assert.match(experienceCss, /@media\s*\(max-width:\s*1024px\)/);
  assert.match(experienceCss, /@media\s*\(max-width:\s*760px\)/);
  assert.match(experienceCss, /@media\s*\(max-width:\s*480px\)/);
  assert.match(experienceCss, /prefers-reduced-motion/);
  assert.match(experienceCss, /forced-colors/);
  assert.match(experienceCss, /:focus-visible/);
  assert.match(experienceCss, /content-visibility/);
});


test("flagship design system is layered after legacy styles and covers all breakpoints", () => {
  assert.ok(html.indexOf("experience.css") < html.indexOf("studio.css"));
  assert.match(studioCss, /--bg:#080b14/);
  assert.match(studioCss, /#9c8cff/);
  assert.match(studioCss, /@media\(max-width:760px\)/);
  assert.match(studioCss, /@media\(max-width:480px\)/);
  assert.match(studioCss, /prefers-reduced-motion:reduce/);
  assert.match(studioCss, /forced-colors:active/);
  assert.equal((studioCss.match(/\{/g)||[]).length,(studioCss.match(/\}/g)||[]).length);
});
test("interface sounds are opt-in, locally synthesized and never autoplay", () => {
  assert.match(html, /id="soundToggle"/);
  assert.match(uiSounds, /AudioContext/);
  assert.match(uiSounds, /localStorage/);
  assert.match(uiSounds, /if\(!enabled\)return/);
  assert.match(uiSounds, /addEventListener\("click"/);
  assert.match(uiSounds, /let enabled=false/);
  assert.doesNotMatch(uiSounds, /<audio\\b[^>]*autoplay/i);
  assert.ok(sw.includes('"./ui-sounds.js"'));
});


test("multi-course academy is linked from the home page and cached offline", async () => {
  const academyHtml = await readFile(new URL("../academy.html", import.meta.url), "utf8");
  const academyJs = await readFile(new URL("../academy.js", import.meta.url), "utf8");
  const academyCss = await readFile(new URL("../academy.css", import.meta.url), "utf8");
  assert.match(html, /href="\.\/academy\.html">آکادمی آموزش/);
  assert.match(academyHtml, /studio\.css/);
  assert.match(academyHtml, /ui-sounds\.js/);
  assert.match(academyJs, /id:"html"/);
  assert.match(academyJs, /id:"css"/);
  assert.match(academyJs, /id:"javascript"/);
  assert.match(academyJs, /id:"web-security"/);
  assert.match(academyCss, /#152019/);
  assert.match(academyCss, /#75c58d/);
  assert.match(academyCss, /#a8e2b7/);
  assert.doesNotMatch(academyCss, /#9c8cff|#68dff5|#b7aaff/);
  assert.match(sw, /"\.\/academy\.js"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
});


test("global search indexes every academy chapter and Python lesson with safe deep links", async () => {
  const index = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));
  const search = await readFile(new URL("../site-search.js", import.meta.url), "utf8");
  const academy = await readFile(new URL("../academy.js", import.meta.url), "utf8");
  const python = await readFile(new URL("../python-course.js", import.meta.url), "utf8");
  const academyLessons = index.items.filter(item => item.type === "lesson");
  const pythonLessons = index.items.filter(item => item.type === "python-lesson");
  assert.equal(index.schema, "mr-siavash-ai-search-index");
  assert.equal(index.version, 1);
  assert.equal(academyLessons.length, 30);
  assert.equal(pythonLessons.length, 12);
  assert.equal(new Set(index.items.map(item => item.id)).size, index.items.length);
  for (const item of [...academyLessons, ...pythonLessons]) {
    assert.ok(item.href.startsWith("./"));
    assert.ok(!item.href.startsWith("//"));
    assert.ok(item.title.length > 0 && item.description.length > 0);
  }
  assert.match(academy, /params\.get\("course"\)/);
  assert.match(academy, /params\.get\("lesson"\)/);
  assert.match(python, /params\.get\("lesson"\)/);
  assert.match(search, /ArrowDown/);
  assert.match(search, /ArrowUp/);
  assert.match(search, /aria-activedescendant/);
  assert.match(search, /textContent=item\.title/);
  assert.doesNotMatch(search, /\.innerHTML\s*=/);
  assert.match(html, /src="\.\/bounded-json\.js" defer/);
  assert.ok(html.indexOf("./bounded-json.js") < html.indexOf("./support.js"));
  assert.ok(html.indexOf("./bounded-json.js") < html.indexOf("./site-search.js"));
  assert.match(sw, /"\.\/bounded-json\.js"/);
  assert.match(sw, /"\.\/site-search\.js"/);
  assert.match(sw, /"\.\/search-index\.json"/);
});

test("local support guide stays private and ticket APIs fail closed behind retention readiness", () => {
  assert.match(html, /راهنمای محلی سایت، ثبت درخواست و پیگیری امن گفتگو/);
  assert.match(html, />ثبت درخواست<\/button>/);
  assert.match(html, />پیگیری<\/button>/);
  assert.match(html, /support-tickets\.mjs/);
  assert.match(html, /support-privacy-note/);
  assert.match(html, /id="supportConsent"[^>]*disabled/);
  assert.match(html, /id="supportRequestForm"[^>]*method="post"/);
  assert.match(html, /id="ticketTrackForm"[^>]*method="post"/);
  assert.match(html, /privacy\.html/);
  assert.match(html, /type="password"/);
  assert.match(support, /readJson\("\.\/search-index\.json"/);
  assert.match(boundedJson, /credentials:"omit"/);
  assert.match(support, /ASSISTANT_API/);
  assert.doesNotMatch(support, /Authorization|\/v1\/support/);
  assert.match(supportTickets, /supportGate\(health\)/);
  assert.match(supportTickets, /features\?\.publicSupport/);
  assert.match(supportTickets, /supportTrackingGate\(health\)/);
  assert.match(supportTickets, /اطلاعیهٔ حریم خصوصی/);
  assert.match(supportTickets, /credentials: "omit"/);
  assert.match(supportTickets, /Authorization: "Bearer "/);
  assert.match(supportTickets, /consent: \$\("#supportConsent"\)\.checked/);
  assert.doesNotMatch(supportTickets, /localStorage|sessionStorage|innerHTML\s*=/);
  assert.match(sw, /"\.\/support-tickets\.mjs"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
});

test("local support guide retries loading its index after an initial offline failure", async () => {
  let fetchCalls = 0;
  let ready;
  let submit;
  const rendered = [];
  const button = { disabled: false };
  const input = { value: "پایتون", focus() {} };
  const messages = {
    children: [],
    scrollHeight: 0,
    append(...items) { this.children.push(...items); },
    get childElementCount() { return this.children.length; }
  };
  const makeElement = () => ({
    children: [],
    append(...items) { this.children.push(...items); },
    get childElementCount() { return this.children.length; },
    setAttribute() {},
    addEventListener(name, callback) { if (name === "submit") submit = callback; },
    querySelector() { return button; },
    querySelectorAll() { return []; },
    focus() {},
    close() {},
    showModal() {}
  });
  const elements = new Map([
    ["#supportDialog", makeElement()],
    ["#supportLauncher", makeElement()],
    ["#supportClose", makeElement()],
    ["#assistantForm", makeElement()],
    ["#assistantInput", input],
    ["#assistantMessages", messages],
    ["#supportRequestForm", makeElement()],
    ["#ticketTrackForm", makeElement()],
    ["#supportRequestStatus", { textContent: "" }],
    ["#ticketTrackResult", { textContent: "" }],
    ["#handoffButton", { hidden: false }]
  ]);
  const document = {
    readyState: "loading",
    addEventListener(name, callback) { if (name === "DOMContentLoaded") ready = callback; },
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll() { return []; },
    createElement() {
      const element = makeElement();
      Object.defineProperty(element, "textContent", { value: "", writable: true });
      return element;
    }
  };
  const index = {
    schema: "mr-siavash-ai-search-index",
    version: 1,
    items: [{
      id: "python-guide",
      type: "page",
      title: "راهنمای پایتون",
      description: "آموزش مقدماتی پایتون و درس‌های کاربردی.",
      href: "./python.html",
      terms: ["پایتون", "آموزش"]
    }]
  };
  const modules = { schema: "mr-siavash-ai-module-registry", version: 1, modules: [] };
  const window = {
    MRSIAVASHReadJson: async path => {
      fetchCalls++;
      if (fetchCalls <= 2) throw new Error("simulated offline failure");
      return path.includes("search-index") ? index : modules;
    }
  };
  vm.runInNewContext(support, {
    document,
    window,
    URL,
    TextEncoder,
    location: { href: "https://example.test/" }
  });
  ready();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(fetchCalls, 2, "initial background load should fail once");
  assert.equal(typeof submit, "function");
  await submit({
    preventDefault() {},
    currentTarget: elements.get("#assistantForm")
  });
  assert.equal(fetchCalls, 4, "submitting after recovery should retry both public indexes");
  assert.ok(messages.children.some(node => String(node.textContent).includes("راهنمای پایتون")));
  assert.equal(button.disabled, false);
});

test("online support sends only the current question after per-question consent", async () => {
  let ready;
  let submit;
  let chooseOnline;
  let fetchCalls = 0;
  let requestUrl = "";
  let requestOptions;
  let timeoutCallback = null;
  let clearedTimeouts = 0;
  let simulateTimeout = false;
  const submitButton = { disabled: false, textContent: "" };
  const input = { value: "آموزش پایتون", focus() {} };
  const consent = { checked: false, focus() {} };
  const status = { textContent: "" };
  const messages = {
    children: [],
    scrollHeight: 100,
    append(...items) { this.children.push(...items); },
    get childElementCount() { return this.children.length; }
  };
  const makeElement = () => ({
    children: [],
    hidden: false,
    textContent: "",
    className: "",
    dataset: {},
    append(...items) { this.children.push(...items); },
    get childElementCount() { return this.children.length; },
    setAttribute() {},
    classList: { toggle() {} },
    addEventListener(name, callback) {
      if (name === "submit") submit = callback;
      if (name === "click" && this.dataset.assistantMode === "online") chooseOnline = callback;
    },
    querySelector() { return submitButton; },
    focus() {},
    close() {},
    showModal() {}
  });
  const localMode = makeElement();
  localMode.dataset.assistantMode = "local";
  const onlineMode = makeElement();
  onlineMode.dataset.assistantMode = "online";
  const form = makeElement();
  const elements = new Map([
    ["#supportDialog", makeElement()],
    ["#supportLauncher", makeElement()],
    ["#supportClose", makeElement()],
    ["#assistantForm", form],
    ["#assistantInput", input],
    ["#assistantMessages", messages],
    ["#assistantOnlineConsent", consent],
    ["#assistantOnlineConsentLabel", makeElement()],
    ["#assistantOnlineNotice", makeElement()],
    ["#assistantOnlineStatus", status],
    ["#assistantModeDescription", makeElement()]
  ]);
  const document = {
    readyState: "loading",
    addEventListener(name, callback) { if (name === "DOMContentLoaded") ready = callback; },
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === "[data-assistant-mode]") return [localMode, onlineMode];
      return [];
    },
    createElement() { return makeElement(); }
  };
  const window = {
    MRSIAVASHReadJson: async path => path.includes("search-index")
      ? { schema: "mr-siavash-ai-search-index", version: 1, items: [] }
      : { schema: "mr-siavash-ai-module-registry", version: 1, modules: [] },
    fetch: async (url, options) => {
      fetchCalls++;
      requestUrl = url;
      requestOptions = options;
      if (simulateTimeout) {
        timeoutCallback();
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          answer: "دوره پایتون در سایت موجود است.",
          mode: "ai_grounded",
          sources: [{ title: "آموزش پایتون", href: "./python.html" }]
        })
      };
    },
    setTimeout(callback, delay) {
      assert.equal(delay, 15000);
      timeoutCallback = callback;
      return 42;
    },
    clearTimeout(id) {
      assert.equal(id, 42);
      clearedTimeouts++;
    }
  };
  vm.runInNewContext(support, {
    document, window, URL, TextEncoder, AbortController, location: { href: "https://example.test/" }
  });
  ready();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(typeof submit, "function");
  assert.equal(typeof chooseOnline, "function");
  assert.equal(localMode.getAttribute?.("aria-pressed"), undefined);
  chooseOnline();
  assert.equal(consent.checked, false);
  await submit({ preventDefault() {}, currentTarget: form });
  assert.equal(fetchCalls, 0, "online request must not run without explicit consent");
  assert.match(status.textContent, /تأیید/);
  assert.equal(input.value, "آموزش پایتون", "the unanswered question remains available for editing");

  consent.checked = true;
  await submit({ preventDefault() {}, currentTarget: form });
  assert.equal(fetchCalls, 1);
  assert.equal(requestUrl, "https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev/v1/assistant/chat");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.credentials, "omit");
  assert.equal(requestOptions.referrerPolicy, "no-referrer");
  assert.equal(typeof requestOptions.signal?.aborted, "boolean", "online requests must support cancellation");
  assert.equal(requestOptions.signal.aborted, false);
  assert.deepEqual(Object.keys(JSON.parse(requestOptions.body)), ["message"]);
  assert.equal(JSON.parse(requestOptions.body).message, "آموزش پایتون");
  assert.equal(consent.checked, false, "consent is reset after each online request");
  assert.equal(clearedTimeouts, 1, "the request timeout is cleared after a response");
  assert.ok(messages.children.some(node => String(node.textContent).includes("دوره پایتون")));
  assert.equal(submitButton.disabled, false);

  input.value = "سؤال دوم";
  consent.checked = true;
  simulateTimeout = true;
  await submit({ preventDefault() {}, currentTarget: form });
  assert.equal(fetchCalls, 2);
  assert.match(status.textContent, /۱۵ ثانیه/);
  assert.equal(clearedTimeouts, 2, "the timeout is cleared after an aborted request");
  assert.equal(consent.checked, false, "consent is reset after a timed-out request");
  assert.equal(submitButton.disabled, false, "the form is usable again after a timeout");
});

test("support assistant defaults to local search and gates optional online AI behind explicit consent", () => {
  assert.match(html, /راهنمای محلی/);
  assert.match(html, /دستیار هوشمند آنلاین/);
  assert.match(html, /id="assistantOnlineConsent"/);
  assert.match(html, /متن سؤال فعلی پس از تأیید تو به Gateway ارسال می‌شود/);
  assert.match(support, /assistantMode = "local"/);
  assert.match(support, /requestMode === "online" && !consent\?\.checked/);
  assert.match(support, /body: JSON\.stringify\(\{ message: query \}\)/);
  assert.match(support, /credentials: "omit"/);
  assert.match(support, /referrerPolicy: "no-referrer"/);
  assert.match(support, /ASSISTANT_API/);
  assert.ok(support.includes("window.MRSIAVASHReadJson"));
  assert.match(privacyText, /برای هر سؤال، تأیید صریح لازم است/);
  assert.match(privacyText, /شناسهٔ مشتق‌شده از IP و به‌صورت هش/);
});

test("support and global search delegate public JSON reads to the shared bounded loader", () => {
  assert.ok(support.includes("window.MRSIAVASHReadJson"));
  assert.ok(searchSource.includes("window.MRSIAVASHReadJson"));
  assert.match(boundedJson, /reader.cancel/);
  assert.match(boundedJson, /controller.abort/);
  assert.match(boundedJson, /credentials:"omit"/);
  assert.match(support, /window\.fetch\(ASSISTANT_API/);
  assert.equal(searchSource.includes("fetch("), false);
});

test("public support gate requires healthy D1 and an explicit safe retention period", () => {
  const base = {
    status: "ready",
    dependencies: { database: "ready" },
    features: { publicSupport: true, supportRetentionDays: 90 }
  };
  assert.equal(supportGate(base), true);
  assert.equal(supportGate({ ...base, status: "not_ready" }), false);
  assert.equal(supportGate({ ...base, dependencies: { database: "unavailable" } }), false);
  assert.equal(supportGate({ ...base, features: { publicSupport: false, supportRetentionDays: 90 } }), false);
  assert.equal(supportGate({ ...base, features: { publicSupport: true, supportRetentionDays: 7 } }), false);
  assert.equal(supportGate({ ...base, features: { publicSupport: true, supportRetentionDays: 366 } }), false);
  assert.equal(supportGate({ ...base, features: { publicSupport: true } }), false);
});

test("public ticket tracking validates one-time code and bearer-token formats", () => {
  assert.equal(validTicketCredentials("MS-0123456789ABCDEF", "a".repeat(64)), true);
  assert.equal(validTicketCredentials("MS-0123456789ABCDE", "a".repeat(64)), false);
  assert.equal(validTicketCredentials("MS-0123456789ABCDEF", "a".repeat(63)), false);
  assert.equal(validTicketCredentials("MS-0123456789ABCDEF", "g".repeat(64)), false);
  assert.equal(validTicketCredentials("https://example.test/?token=secret", "a".repeat(64)), false);
});

test("ticket tracking remains available without enabling new ticket intake", () => {
  const healthy = { status: "ready", dependencies: { database: "ready" } };
  assert.equal(supportTrackingGate(healthy), true);
  assert.equal(supportGate(healthy), false);
  assert.equal(supportTrackingGate({ ...healthy, status: "not_ready" }), false);
  assert.ok(supportTickets.includes("health.features.supportRetentionDays"));
});

test("public privacy notice describes ticket data, one-time credentials and inactivity retention", async () => {
  const privacy = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
  assert.match(privacy, /کلید خصوصی به‌صورت هش‌شده ذخیره می‌شود/);
  assert.match(privacy, /مدت نگهداری فعال تیکت‌های پشتیبانی در محیط Production برابر ۹۰ روز/);
  assert.match(privacy, /۹۰ روز از آخرین به‌روزرسانی/);
  assert.match(privacy, /رمز عبور، کلید API/);
  assert.match(privacy, /فضای ذخیره‌سازی مرورگر/);
});


test("emerald design text tokens meet WCAG AA contrast on dark surfaces", () => {
  const token = name => {
    const match = experienceNextCss.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{6})"));
    assert.ok(match, "missing color token --" + name);
    return match[1];
  };
  const luminance = hex => {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const ratio = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const foreground of ["text", "muted", "dim", "green", "green-bright", "experience-muted"]) {
    for (const background of ["bg", "bg-soft", "surface", "surface-2"]) {
      assert.ok(ratio(token(foreground), token(background)) >= 4.5, "--" + foreground + " on --" + background + " must meet WCAG AA");
    }
  }
});

test("emerald flagship experience layer overrides the conflicting studio palette", async () => {
  const pythonHtml = await readFile(new URL("../python.html", import.meta.url), "utf8");
  const academyHtml = await readFile(new URL("../academy.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("studio.css") < html.indexOf("experience-next.css"));
  assert.ok(pythonHtml.indexOf("studio.css") < pythonHtml.indexOf("experience-next.css"));
  assert.ok(academyHtml.indexOf("academy.css") < academyHtml.indexOf("experience-next.css"));
  assert.match(experienceNextCss, /--experience-accent:#8debad/);
  assert.match(experienceNextCss, /--bg:#07110b/);
  assert.match(experienceNextCss, /\.hero-visual/);
  assert.match(experienceNextCss, /\.module-card:hover/);
  assert.match(experienceNextCss, /\.registry-status/);
  assert.match(experienceNextCss, /@media\(max-width:760px\)/);
  assert.match(experienceNextCss, /@media\(max-width:480px\)/);
  assert.match(experienceNextCss, /prefers-reduced-motion:reduce/);
  assert.match(experienceNextCss, /forced-colors:active/);
  assert.match(experienceNextCss, /:focus-visible/);
  assert.equal((experienceNextCss.match(/\{/g)||[]).length,(experienceNextCss.match(/\}/g)||[]).length);
  assert.match(sw, /"\.\/experience-next\.css"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
});


test("public pages expose unique canonical URLs and social metadata", async () => {
  const pages = [
    ["index.html", "https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/"],
    ["studio.html", "https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/studio.html"],
    ["academy.html", "https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/academy.html"],
    ["python.html", "https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/python.html"]
  ];
  const canonicalUrls = [];
  for (const [path, expected] of pages) {
    const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
    const canonicals = [...source.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)].map(match => match[1]);
    assert.equal(canonicals.length, 1, path + " must have exactly one canonical URL");
    assert.equal(canonicals[0], expected, path + " canonical URL must match its public URL");
    assert.match(source, /<meta\s+name="robots"\s+content="index,follow/i, path + " must declare indexability");
    assert.match(source, /<meta\s+property="og:url"\s+content=/i, path + " must expose its Open Graph URL");
    assert.match(source, /<meta\s+name="twitter:card"\s+content="summary"/i, path + " must declare a social card type");
    assert.doesNotMatch(source, /\\n\s*<(?:meta|link)\b/i, path + " must not contain escaped newline text in the document head");
    canonicalUrls.push(canonicals[0]);
  }
  assert.equal(new Set(canonicalUrls).size, pages.length, "canonical URLs must be unique");
});

test("crawler directives and sitemap only advertise public site routes", async () => {
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.ok(robots.startsWith("User-agent: *\nAllow: /"), "robots.txt must allow public crawling");
  assert.ok(robots.includes("Sitemap: https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/sitemap.xml"));
  assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  for (const route of ["/", "/studio.html", "/academy.html", "/python.html", "/privacy.html"]) {
    assert.ok(sitemap.includes("https://mrsiavasshirbot.github.io/MR_SIAVASH_AI" + route), "missing sitemap route " + route);
  }
  assert.ok(!/localhost|127\.0\.0\.1|workers\.dev/.test(sitemap), "sitemap must not expose development or API hosts");
});


test("public pages keep install metadata and browser chrome colors consistent", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  const pages = ["index.html", "studio.html", "academy.html", "python.html"];
  for (const page of pages) {
    const source = await readFile(new URL("../" + page, import.meta.url), "utf8");
    assert.match(source, /<link\s+rel="manifest"\s+href="\.\/manifest\.webmanifest"/i, page + " must expose the install manifest");
    const theme = source.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/i);
    assert.ok(theme, page + " must declare a browser theme color");
    assert.equal(theme[1], manifest.theme_color, page + " theme must match the installed app");
  }
  assert.equal(manifest.background_color, manifest.theme_color, "installed app launch and browser chrome should use one coherent canvas color");
  assert.equal(manifest.lang, "fa");
  assert.equal(manifest.dir, "rtl");
});

test("privacy page has the same defensive browser policy and discoverability metadata", async () => {
  const source = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
  assert.match(source, /Content-Security-Policy/i);
  assert.match(source, /default-src 'self'/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /script-src 'self'/);
  assert.match(source, /style-src 'self'/);
  assert.doesNotMatch(source, /unsafe-inline|unsafe-eval/);
  assert.match(source, /name="referrer" content="strict-origin-when-cross-origin"/);
  assert.match(source, /rel="canonical" href="https:\/\/mrsiavasshirbot\.github\.io\/MR_SIAVASH_AI\/privacy\.html"/);
  assert.match(source, /property="og:url"/);
});

test("all local assets referenced by public HTML pages exist and core routes are offline-cached", async () => {
  const pages = ["index.html", "studio.html", "academy.html", "python.html", "privacy.html"];
  const localAssets = new Set();
  for (const page of pages) {
    const source = await readFile(new URL("../" + page, import.meta.url), "utf8");
    const tags = source.match(/<(?:script|link|img|source)\b[^>]*>/gi) || [];
    for (const tag of tags) {
      for (const match of tag.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
        const raw = match[1];
        if (!raw.startsWith("./") && !raw.startsWith("../")) continue;
        const resolved = new URL(raw, "https://site.test/" + page);
        if (resolved.origin !== "https://site.test") continue;
        let path = decodeURIComponent(resolved.pathname.replace(/^\//, ""));
        if (!path || path.endsWith("/")) path += "index.html";
        await access(new URL("../" + path, import.meta.url));
        localAssets.add(path);
      }
    }
  }
  const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  const shellMatch = worker.match(/const SHELL_FILES = \[([\s\S]*?)\];/);
  assert.ok(shellMatch, "service worker must declare its offline shell");
  const shell = new Set([...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1].replace(/^\.\//, "")));
  for (const route of pages) assert.ok(shell.has(route), route + " must be available offline");
  for (const asset of localAssets) {
    if (["index.html", "studio.html", "academy.html", "python.html", "privacy.html"].includes(asset)) continue;
    assert.ok(shell.has(asset), asset + " is referenced by a public page but missing from the offline shell");
  }
  assert.match(worker, /CACHE_NAME = CACHE_PREFIX \+ "v42"/);
});


test("curated knowledge library is searchable and included in the offline shell", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const index = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));
  const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.ok(html.includes('id="knowledge-library"'));
  assert.ok(html.includes('id="knowledge-learning"'));
  assert.ok(html.includes('id="knowledge-ai"'));
  assert.equal(index.items.filter(item => item.id.startsWith("knowledge-")).length, 8);
  for (const item of index.items.filter(entry => entry.id.startsWith("knowledge-"))) {
    assert.ok(html.includes('id="' + item.id + '"'));
    assert.equal(item.type, "page");
    assert.ok(item.href.startsWith("./index.html#"));
  }
  assert.ok(worker.includes('CACHE_NAME = CACHE_PREFIX + "v42"'));
});

test("Hub integration is documented as separate until the security gates pass", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const architecture = await readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8");
  const contracts = await readFile(new URL("../docs/PLATFORM_CONTRACTS.md", import.meta.url), "utf8");
  const decision = await readFile(new URL("../docs/decisions/0004-hub-integration-boundary.md", import.meta.url), "utf8");

  assert.match(readme, /no direct API connection to the Hub runtime, shared identity, private-data sync/i);
  assert.match(architecture, /no shared identity, database, API session or live runtime connection/i);
  assert.match(contracts, /Exact-origin CORS is necessary but is not authentication/i);
  assert.match(decision, /public tunnel to a developer machine/i);
  assert.match(decision, /short-lived, narrowly scoped credentials/i);
  assert.match(decision, /human approval/i);
  assert.match(decision, /not connected/i);
});


test("public Hub status contract exposes only repository metadata and never claims runtime health", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.equal(hubStatus.schema, "mr-siavash-hub-public-status");
  assert.equal(hubStatus.version, 1);
  assert.equal(hubStatus.runtime.state, "not_connected");
  assert.equal(hubStatus.repository.state, "unavailable");
  assert.equal(hubStatus.quality.state, "unavailable");
  assert.equal(hubStatusSchema.properties.runtime.properties.state.const, "not_connected");
  assert.ok(new RegExp(hubStatusSchema.properties.repository.properties.latest_commit.properties.url.pattern).test("https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/commit/" + "a".repeat(40)));
  assert.deepEqual(
    Object.keys(hubStatus).sort(),
    ["generated_at", "project", "quality", "repository", "runtime", "schema", "source", "version"].sort()
  );
  assert.match(readme, /build-time snapshot of public GitHub commit and CI metadata only/i);
});
