import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../brand-refresh.css", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("unified editorial palette replaces emerald dominance with graphite and blue", () => {
  for (const token of ["--bg:#0b1018", "--surface:#151f2c", "--text:#edf2f8", "--experience-accent:#83b4ff", "--amber:#d8a879"]) {
    assert.ok(css.includes(token), `missing palette token: ${token}`);
  }
  assert.match(css, /body\{[^}]*background:[^}]*#0b1018/s);
});

test("shared stylesheet is linked after page-specific CSS on all primary surfaces", async () => {
  for (const file of ["index.html", "studio.html", "academy.html", "python.html", "subtitle-studio.html", "admin-support.html", "academy-content-studio.html", "privacy.html"]) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /<link rel="stylesheet" href="\.\/brand-refresh\.css">/);
    const stylesheets = [...html.matchAll(/<link[^>]+href="[^"]+\.css"[^>]*>/g)].map(match => match[0]);
    const expectedLast = file === "index.html" ? "home-v2.css" : "brand-refresh.css";
    assert.ok(stylesheets.at(-1)?.includes(expectedLast), `${file}: expected final stylesheet ${expectedLast}`);
  }
});

test("shared design system preserves mobile, reduced-motion, focus and forced-colors support", () => {
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(forced-colors:active\)/);
});

test("offline shell precaches shared and homepage stylesheets and advances to cache v66", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v66"/);
  assert.match(sw, /"\.\/brand-refresh\.css"/);
});


test("browser and installed-app theme colors match the graphite surface on every main route", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.theme_color, "#0b1018");
  assert.equal(manifest.background_color, "#0b1018");
  for (const file of ["index.html", "studio.html", "academy.html", "python.html", "subtitle-studio.html", "admin-support.html", "academy-content-studio.html", "privacy.html"]) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /<meta\s+name="theme-color"\s+content="#0b1018"/i, `${file}: browser chrome must use the shared graphite theme`);
  }
});

test("legacy support, practice and portfolio surfaces use the shared neutral component system", () => {
  for (const selector of [
    ".support-launcher{",
    ".search-dialog,.support-dialog{",
    ".python-page .practice-lab,",
    ".admin-status{",
    ".academy-practice,.academy-tutor",
    ".resource-card,.snippet-panel",
    ".hub-status-grid>div{"
  ]) {
    assert.ok(css.includes(selector), `missing shared UI override: ${selector}`);
  }
  assert.match(css, /\.support-launcher\{[^}]*#29476a/s);
  assert.match(css, /\.admin-status::before\{[^}]*#83b4ff/s);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, "shared stylesheet braces must balance");
});
