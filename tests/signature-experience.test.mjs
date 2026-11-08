import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const atelier = await readFile(new URL("../atelier.css", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const python = await readFile(new URL("../python.html", import.meta.url), "utf8");
const academy = await readFile(new URL("../academy.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("Digital Atelier replaces the previous orbit hero with an editorial composition", () => {
  assert.match(index, /data-experience="atelier-v1"/);
  assert.match(index, /class="atelier-paper"/);
  assert.match(index, /class="atelier-manifesto"/);
  assert.doesNotMatch(index, /class="signature-rail"/);
  assert.doesNotMatch(index, /class="orbit orbit-outer"/);
  assert.match(index, /id="motionToggle"/);
  assert.match(index, /class="hero-scene atelier-scene"/);
});

test("all public pages load the new design layer after the stable component styles", () => {
  for (const html of [index, python, academy]) {
    assert.match(html, /href="\.\/atelier\.css"/);
    assert.ok(html.indexOf("atelier.css") > html.indexOf("experience-next.css"));
    assert.doesNotMatch(html, /href="\.\/experience-signature\.css"/);
  }
  assert.match(index, /name="theme-color" content="#0b120d"/);
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

test("offline shell caches the atelier stylesheet with cache version 32", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v32"/);
  assert.match(sw, /"\.\/atelier\.css"/);
  assert.doesNotMatch(sw, /"\.\/experience-signature\.css"/);
});
