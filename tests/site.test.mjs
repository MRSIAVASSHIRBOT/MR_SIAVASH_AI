import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const manifestText = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");
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

test("module registry contains nine unique module identifiers", () => {
  const ids = [...app.matchAll(/\{ id: "([^"]+)", category:/g)].map(match => match[1]);
  assert.equal(ids.length, 9);
  assert.equal(new Set(ids).size, ids.length);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v3"/);
  assert.match(sw, /SHELL_FILES/);
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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v3"/);
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
