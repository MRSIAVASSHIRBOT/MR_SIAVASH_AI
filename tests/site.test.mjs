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
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v2"/);
  assert.match(sw, /SHELL_FILES/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /request\.method !== "GET"/);
});
