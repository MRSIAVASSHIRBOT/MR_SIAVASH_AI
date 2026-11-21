import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../home-v2.css", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

test("homepage v2 stylesheet is loaded after the shared design system", () => {
  const shared = html.indexOf('./brand-refresh.css');
  const home = html.indexOf('./home-v2.css');
  assert.ok(shared >= 0, "shared design system link must exist");
  assert.ok(home > shared, "homepage v2 must override the shared design system");
});

test("homepage hero offers a focused set of primary actions", () => {
  const hero = html.match(/<div class="hero-actions">([\s\S]*?)<\/div>/);
  assert.ok(hero, "homepage hero actions must exist");
  const actions = hero[1].match(/<(?:a|button)\b/g) || [];
  assert.equal(actions.length, 3, "hero should expose exactly three clear next steps");
  assert.match(hero[1], /data-view="modules"/);
  assert.match(hero[1], /\.\/studio\.html/);
  assert.match(hero[1], /\.\/academy\.html/);
});

test("homepage v2 includes responsive, reduced-motion and forced-colors fallbacks", () => {
  assert.match(css, /@media\s*\(max-width:\s*980px\)/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /:focus-visible/);
});

test("offline shell caches homepage v2 and advances its cache version", () => {
  assert.match(serviceWorker, /CACHE_NAME\s*=\s*CACHE_PREFIX\s*\+\s*"v66"/);
  assert.match(serviceWorker, /"\.\/home-v2\.css"/);
});
