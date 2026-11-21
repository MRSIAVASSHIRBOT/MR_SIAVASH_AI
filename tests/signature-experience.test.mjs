import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const atelier = await readFile(new URL("../atelier.css", import.meta.url), "utf8");
const studio = await readFile(new URL("../studio.css", import.meta.url), "utf8");
const experienceNext = await readFile(new URL("../experience-next.css", import.meta.url), "utf8");
const index = await readFile(new URL("../legacy-app.html", import.meta.url), "utf8");
const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const python = await readFile(new URL("../python.html", import.meta.url), "utf8");
const academy = await readFile(new URL("../academy.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("foundation homepage replaces the previous layered hero with the focused ecosystem composition", () => {
  assert.match(index, /class="hero-grid foundation-hero"/);
  assert.match(index, /class="hero-visual foundation-visual"/);
  assert.match(index, /class="foundation-core"/);
  assert.match(index, /id="motionToggle"/);
  assert.doesNotMatch(index, /class="atelier-paper"/);
  assert.doesNotMatch(index, /class="orbit orbit-outer"/);
});

test("active homepage uses the graphite design system while legacy and course routes retain their own layers", () => {
  assert.match(home, /href="\.\/assets\/css\/style\.css"/);
  assert.doesNotMatch(home, /href="\.\/foundation\.css"|href="\.\/brand-refresh\.css"/);
  assert.match(home, /name="theme-color" content="#0b1018"/);
  assert.match(index, /href="\.\/foundation\.css"/);
  assert.ok(index.indexOf("foundation.css") > index.indexOf("studio.css"));
  assert.match(index, /name="theme-color" content="#07110c"/);
  for (const html of [python, academy]) {
    assert.match(html, /href="\.\/atelier\.css"/);
    assert.ok(html.indexOf("studio.css") < html.indexOf("experience-next.css"));
    assert.ok(html.indexOf("atelier.css") > html.indexOf("experience-next.css"));
    assert.doesNotMatch(html, /href="\.\/experience-signature\.css"/);
  }
});

test("editorial material contrast, original typography and local-only assets are present", () => {
  assert.match(atelier, /--bg:#0b120d/);
  assert.match(atelier, /background:#d9ddce/);
  assert.match(atelier, /font:800 clamp\(43px,5\.5vw,72px\)\/\.94 Georgia,serif/);
  assert.doesNotMatch(atelier, /@import|url\(\s*["']?https?:/i);
  assert.equal((atelier.match(/\{/g)||[]).length,(atelier.match(/\}/g)||[]).length);
});

test("atelier respects mobile, touch, keyboard, reduced motion and forced colors", () => {
  assert.match(atelier, /@media\(max-width:900px\)/);
  assert.match(atelier, /@media\(max-width:680px\)/);
  assert.match(atelier, /@media\(max-width:420px\)/);
  assert.match(atelier, /@media\(hover:none\)/);
  assert.match(atelier, /prefers-reduced-motion:reduce/);
  assert.match(atelier, /forced-colors:active/);
  assert.match(atelier, /:focus-visible/);
});

test("offline shell retains subpage atelier styles with cache version 67", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v69"/);
  assert.match(sw, /"\.\/atelier\.css"/);
  assert.doesNotMatch(sw, /"\.\/experience-signature\.css"/);
});


function collectCssRuleKeys(css, context = "", keys = new Set()) {
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open < 0) break;
    let depth = 1;
    let close = open + 1;
    while (close < css.length && depth) {
      if (css[close] === "{") depth++;
      else if (css[close] === "}") depth--;
      close++;
    }
    if (depth) break;
    const header = css.slice(cursor, open).replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/\s+/g, " ");
    const body = css.slice(open + 1, close - 1);
    if (/^@(media|supports|container|layer)\b/.test(header)) {
      collectCssRuleKeys(body, context + " " + header, keys);
    } else if (header && !header.startsWith("@")) {
      keys.add(context + "|" + header + "{" + body.trim().replace(/\s+/g, " ") + "}");
    }
    cursor = close;
  }
  return keys;
}

test("experience-next contains no exact rules already provided by the preceding studio layer", () => {
  const earlier = collectCssRuleKeys(studio);
  const current = collectCssRuleKeys(experienceNext);
  const duplicates = [...current].filter(rule => earlier.has(rule));
  assert.deepEqual(duplicates, []);
});
