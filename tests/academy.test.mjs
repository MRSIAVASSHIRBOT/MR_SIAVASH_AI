import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../academy.html", import.meta.url), "utf8");
const js = await readFile(new URL("../academy.js", import.meta.url), "utf8");
const progressModule = await readFile(new URL("../academy-progress.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../academy.css", import.meta.url), "utf8");
const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const search = await readFile(new URL("../site-search.js", import.meta.url), "utf8");
const searchIndex = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const architecture = await readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8");
const roadmap = await readFile(new URL("../docs/ROADMAP.md", import.meta.url), "utf8");

test("academy exposes six structured courses and thirty chapters", () => {
  for (const id of ["html", "css", "javascript", "git", "linux", "web-security"]) {
    assert.ok(js.includes('id:"' + id + '"'), "missing course " + id);
  }
  assert.equal((js.match(/^\["/gm) || []).length >= 30, true);
  assert.match(html, /id="courseGrid"/);
  assert.match(html, /studio\.css/);
  assert.match(html, /ui-sounds\.js/);
  assert.match(progressModule, /value\.length > 4096/);
  assert.match(html, /id="learningPanel"/);
  assert.match(html, /id="academyStatus" role="status"/);
  assert.match(html, /id="academyDashboardContent"/);
  assert.match(html, /type="module" src="\.\/academy\.js"/);
  assert.match(js, /resolveAcademyResume/);
  assert.match(js, /summarizeAcademyProgress/);
  assert.match(js, /progressMeta\.lastCourse=id/);
  assert.match(js, /progressMeta\.lastLesson=lessonIndex/);
  assert.match(js, /renderDashboard\(\)/);
  assert.match(html, /href="\.\/python\.html"/);
});

test("academy tracks progress locally and renders lesson content as text", () => {
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /textContent=lesson\[2\]/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.match(js, /aria-pressed/);
  assert.match(js, /aria-expanded/);
  assert.ok(js.includes("navigator.serviceWorker.register"));
  assert.ok(js.includes("aria-valuenow"));
  assert.ok(js.includes("پیشرفت و موقعیت یادگیری در همین مرورگر ذخیره شد."));
});

test("academy navigation, global search, and offline shell are integrated", () => {
  assert.match(home, /href="\.\/academy\.html">آکادمی آموزش/);
  assert.ok(searchIndex.items.some(item => item.title === "آکادمی" || item.title.includes("HTML از پایه")));
  assert.match(search, /mr-siavash-ai-search-index|readJson/);
  assert.match(sw, /"\.\/academy\.html"/);
  assert.match(sw, /"\.\/academy\.css"/);
  assert.match(sw, /"\.\/academy\.js"/);
  assert.match(sw, /"\.\/academy-progress\.mjs"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v43"/);
});

test("academy layout supports mobile, keyboard, and reduced-motion preferences", () => {
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible|outline/);
});

test("Academy dashboard and browser-local progress boundaries are documented", () => {
  assert.match(architecture, /aggregate progress dashboard and resume/);
  assert.match(architecture, /existing mr-siavash-ai\.academy\.v1 key/);
  assert.match(architecture, /no cloud sync or learner account/);
  assert.match(roadmap, /Learning Academy progress dashboard/);
  assert.match(roadmap, /service-worker cache v43/);
  assert.match(roadmap, /no cloud account or remote execution is implied/);
});


test("academy visual system stays aligned with the forest and emerald site palette", () => {
  assert.match(css, /#152019/);
  assert.match(css, /#75c58d/);
  assert.match(css, /#a8e2b7/);
  assert.match(css, /:focus-visible\{outline:2px solid #9bd8aa/);
  assert.doesNotMatch(css, /#9c8cff|#68dff5|#b7aaff/);
});
