import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../brand-refresh.css", import.meta.url), "utf8");
const editorial = await readFile(new URL("../editorial-rebuild.css", import.meta.url), "utf8");
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
    const stylesheets = [...html.matchAll(/<link[^>]+href="[^"]+\.css"[^>]*>/g)].map(match => match[0]);
    if (file === "index.html") {
      assert.match(html, /<link rel="stylesheet" href="\.\/foundation\.css">/);
      assert.ok(stylesheets.at(-1)?.includes("foundation.css"), "index.html: foundation layer must be last");
      assert.doesNotMatch(html, /brand-refresh\.css|editorial-rebuild\.css/);
    } else {
      assert.match(html, /<link rel="stylesheet" href="\.\/brand-refresh\.css">/);
      assert.ok(stylesheets.at(-1)?.includes("editorial-rebuild.css"), `${file}: editorial stylesheet must be last`);
    }
  }
});

test("shared design system preserves mobile, reduced-motion, focus and forced-colors support", () => {
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(forced-colors:active\)/);
});

test("offline shell precaches the shared stylesheet and advances to cache v67", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v67"/);
  assert.match(sw, /"\.\/brand-refresh\.css"/);
  assert.match(sw, /"\.\/editorial-rebuild\.css"/);
});


test("homepage uses the dark foundation canvas while editorial subpages retain their light chrome", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.theme_color, "#07110c");
  assert.equal(manifest.background_color, "#07110c");
  for (const file of ["index.html", "studio.html", "academy.html", "python.html", "subtitle-studio.html", "admin-support.html", "academy-content-studio.html", "privacy.html"]) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (file === "index.html") {
      assert.match(html, /<meta\s+name="theme-color"\s+content="#07110c"/i);
      assert.match(html, /<meta\s+name="color-scheme"\s+content="dark"/i);
    } else {
      assert.match(html, /<meta\s+name="theme-color"\s+content="#f2f0e9"/i);
      assert.match(html, /<meta\s+name="color-scheme"\s+content="light"/i);
    }
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

test("editorial rebuild uses a warm neutral canvas and restrained blue/coral accents", () => {
  for (const token of ["--bg:#f2f0e9", "--text:#171d27", "--experience-accent:#315f9a", "--amber:#c45b3c"]) {
    assert.ok(editorial.includes(token), `missing editorial token: ${token}`);
  }
  assert.match(editorial, /@media\(max-width:760px\)/);
  assert.match(editorial, /@media\(prefers-reduced-motion:reduce\)/);
  assert.equal((editorial.match(/\\{/g) || []).length, (editorial.match(/\\}/g) || []).length);
});
