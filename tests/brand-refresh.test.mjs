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
  for (const file of ["index.html", "studio.html", "academy.html", "python.html", "subtitle-studio.html", "admin-support.html", "academy-content-studio.html"]) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /<link rel="stylesheet" href="\.\/brand-refresh\.css">/);
    assert.ok(html.indexOf("brand-refresh.css") > html.lastIndexOf(".css"), `${file}: shared stylesheet must be last`);
  }
});

test("shared design system preserves mobile, reduced-motion, focus and forced-colors support", () => {
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(forced-colors:active\)/);
});

test("offline shell precaches the shared stylesheet and advances to cache v64", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v64"/);
  assert.match(sw, /"\.\/brand-refresh\.css"/);
});
