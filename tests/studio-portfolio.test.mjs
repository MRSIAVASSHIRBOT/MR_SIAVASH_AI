import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../studio.html", import.meta.url), "utf8");
const css = await readFile(new URL("../studio-portfolio.css", import.meta.url), "utf8");
const js = await readFile(new URL("../studio-portfolio.js", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const search = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));

test("studio page exposes profile, project, learning, lab, journal and status sections", () => {
  for (const id of ["profile", "projects", "learning", "lab", "journal", "status", "saved"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /MR_SIAVASH_HUB_AI/);
  assert.match(html, /MR_SIAVASH_AI/);
  assert.match(html, /Gshop/);
});

test("studio links point to known public project repositories", () => {
  for (const href of [
    "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI",
    "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI",
    "https://github.com/MRSIAVASSHIRBOT/Gshop"
  ]) assert.ok(html.includes(href));
});

test("studio bookmark storage is local and allowlisted", () => {
  assert.match(js, /mr-siavash-ai\.studio\.saved\.v1/);
  assert.match(js, /\["hub","site","gshop"\]/);
  assert.match(html, /فقط روی همین مرورگر/);
  assert.doesNotMatch(js, /fetch\s*\(|XMLHttpRequest|sendBeacon/);
});

test("studio code examples are copy-only and never evaluated", () => {
  assert.match(html, /این قطعه‌کد صرفاً نمایش داده می‌شود/);
  assert.match(js, /clipboard\.writeText/);
  assert.doesNotMatch(js, /\beval\s*\(|new Function|\bFunction\s*\(/);
  assert.doesNotMatch(html, /<script\s*>/i);
});

test("studio page remains self-hosted and included in the offline shell", () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /studio-portfolio\.css/);
  assert.match(html, /studio-portfolio\.js/);
  for (const asset of ["studio.html", "studio-portfolio.css", "studio-portfolio.js"]) {
    assert.ok(sw.includes('"./' + asset + '"'), "missing offline asset: " + asset);
  }
});

test("studio styles have balanced braces and responsive/accessibility fallbacks", () => {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
});

test("studio sections are discoverable through the bounded search index", () => {
  assert.equal(search.schema, "mr-siavash-ai-search-index");
  const ids = new Set(search.items.map(item => item.id));
  for (const id of ["page-studio", "page-projects", "page-learning-paths", "page-engineering-lab", "page-research-notes", "page-service-status"]) {
    assert.ok(ids.has(id), "missing search item: " + id);
  }
});
