import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const portfolio = await readFile(new URL("../academy-portfolio.mjs", import.meta.url), "utf8");
const tutor = await readFile(new URL("../academy-tutor.js", import.meta.url), "utf8");
const html = await readFile(new URL("../academy.html", import.meta.url), "utf8");

test("portfolio derives evidence from existing local stores without claiming credentials", () => {
  assert.match(portfolio, /mr-siavash-ai\.academy\.v1/);
  assert.match(portfolio, /mr-siavash-ai\.academy\.assessments\.v1/);
  assert.match(portfolio, /deriveAchievements/);
  assert.match(portfolio, /buildExport/);
  assert.match(portfolio, /browser-local/);
  assert.match(portfolio, /مدرک رسمی/);
  assert.match(portfolio, /textContent/);
  assert.doesNotMatch(portfolio, /\.innerHTML\s*=/);
  assert.match(html, /id="academyPortfolioContent"/);
});

test("academy tutor uses bounded grounded endpoint without credentials or code execution", () => {
  assert.match(tutor, /\/v1\/assistant\/chat/);
  assert.match(tutor, /credentials: "omit"/);
  assert.match(tutor, /message\.length > 1200/);
  assert.match(tutor, /AbortController/);
  assert.match(tutor, /data\.mode === "ai_grounded"/);
  assert.match(tutor, /url\.origin !== location\.origin/);
  assert.doesNotMatch(tutor, /eval\s*\(|new Function|innerHTML/);
  assert.match(html, /id="academyTutorForm"/);
});
