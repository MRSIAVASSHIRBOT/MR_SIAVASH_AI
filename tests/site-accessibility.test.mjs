import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const script = await readFile(new URL("../scripts/site-accessibility-e2e.cjs", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");

test("browser accessibility smoke audit covers all primary public routes", () => {
  for (const route of ["index.html", "studio.html", "academy.html", "python.html", "privacy.html"]) {
    assert.ok(script.includes('"' + route + '"'), "missing audited route: " + route);
  }
});

test("browser accessibility smoke audit checks semantics, accessible names and responsive overflow", () => {
  for (const check of [
    "document title", "document language or direction", "main landmark", "visible h1",
    "duplicateIds", "unlabeledControls", "unnamedButtons", "unnamedLinks",
    "imagesWithoutAlt", "framesWithoutTitle", "unsafeBlankLinks", "content overflow"
  ]) assert.ok(script.includes(check), "missing accessibility check: " + check);
});

test("CI runs the site accessibility audit in the pinned Chromium environment", () => {
  assert.match(workflow, /node --check scripts\/site-accessibility-e2e\.cjs/);
  assert.match(workflow, /Run site accessibility and responsive smoke audit/);
  assert.match(workflow, /node scripts\/site-accessibility-e2e\.cjs/);
});
