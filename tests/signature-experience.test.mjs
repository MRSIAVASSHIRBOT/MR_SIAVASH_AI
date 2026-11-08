import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const signature = await readFile(new URL("../experience-signature.css", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const python = await readFile(new URL("../python.html", import.meta.url), "utf8");
const academy = await readFile(new URL("../academy.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("signature experience is layered after the established design system on every page", () => {
  for (const html of [index, python, academy]) {
    assert.ok(html.indexOf("experience-next.css") < html.indexOf("experience-signature.css"));
  }
  assert.match(index, /data-experience="signature-v1"/);
  assert.match(index, /class="signature-rail"/);
});

test("signature experience supplies original depth, motion and interaction without remote assets", () => {
  assert.match(signature, /perspective:\s*1100px/);
  assert.match(signature, /transform-style:\s*preserve-3d/);
  assert.match(signature, /@keyframes signature-orbit-a/);
  assert.match(signature, /\.module-card:hover/);
  assert.match(signature, /:focus-visible/);
  assert.doesNotMatch(signature, /@import|url\(\s*["']?https?:/i);
  assert.doesNotMatch(signature, /https?:\/\//i);
});

test("signature experience preserves mobile, reduced-motion and forced-colors modes", () => {
  assert.match(signature, /@media\s*\(max-width:\s*760px\)/);
  assert.match(signature, /@media\s*\(max-width:\s*480px\)/);
  assert.match(signature, /@media\s*\(hover:\s*none\)/);
  assert.match(signature, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(signature, /@media\s*\(forced-colors:\s*active\)/);
});

test("signature stylesheet is included in the versioned offline shell", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v31"/);
  assert.match(sw, /"\.\/experience-signature\.css"/);
});
