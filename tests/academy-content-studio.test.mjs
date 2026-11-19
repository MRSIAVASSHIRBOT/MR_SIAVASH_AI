import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAcademyDraftPreview } from "../academy-content-studio-core.mjs";

const html = await readFile(new URL("../academy-content-studio.html", import.meta.url), "utf8");
const js = await readFile(new URL("../academy-content-studio.js", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("lesson draft preview validates required fields and bounded rubric entries", () => {
  const model = buildAcademyDraftPreview({
    course: "javascript",
    title: "  متغیرها  ",
    objective: "شناخت متغیر",
    content: "محتوای درس",
    exercise: "تمرین",
    criteria: [" معیار اول ", ...Array.from({ length: 25 }, (_, i) => "معیار " + (i + 2))]
  });
  assert.equal(model.valid, true);
  assert.equal(model.courseLabel, "JavaScript");
  assert.equal(model.title, "متغیرها");
  assert.equal(model.criteria.length, 20);
  assert.equal(model.errors.length, 0);
});

test("preview model keeps untrusted markup as plain text and rejects incomplete drafts", () => {
  const unsafe = "<img src=x onerror=alert(1)>";
  const model = buildAcademyDraftPreview({
    course: "html",
    title: "درس امن",
    objective: "هدف",
    content: unsafe
  });
  assert.equal(model.content, unsafe);
  assert.equal(model.valid, true);
  const incomplete = buildAcademyDraftPreview({ course: "unknown", title: " ", objective: "", content: "" });
  assert.equal(incomplete.valid, false);
  assert.deepEqual(incomplete.errors, ["مسیر آموزشی", "عنوان درس", "هدف یادگیری", "محتوای آموزشی"]);
});

test("content studio renders previews with text nodes and exposes accessible validation status", () => {
  assert.match(html, /id="academyDraftPreview"/);
  assert.match(html, /id="academyDraftPreviewStatus".*role="status"/);
  assert.match(js, /buildAcademyDraftPreview/);
  assert.match(js, /preview\.replaceChildren\(\)/);
  assert.match(js, /textContent/);
  assert.equal(js.includes(".innerHTML ="), false);
});

test("content studio page and preview module are available in the offline shell", () => {
  assert.match(sw, /academy-content-studio-core\.mjs/);
  assert.match(sw, /new URL\("\.\/academy-content-studio\.html", scopeUrl\)/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v60"/);
});
