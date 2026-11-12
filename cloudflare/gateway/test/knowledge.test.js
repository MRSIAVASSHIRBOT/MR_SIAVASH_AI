import assert from "node:assert/strict";
import test from "node:test";

import { knowledge } from "../src/index.js";

test("retrieves the Persian Python course from natural-language questions", () => {
  const results = knowledge("دوره مقدماتی پایتون چند درس دارد");
  assert.equal(results[0]?.title, "آموزش پایتون");
  assert.ok(results[0].score > 0);
});

test("matches workspace details across token order and inflection separators", () => {
  const results = knowledge("فضای کار و همگام سازی ابری");
  assert.equal(results[0]?.title, "فضای کار");
});

test("retrieves defensive security module knowledge", () => {
  const results = knowledge("تحلیل دفاعی امنیت سایبری");
  assert.ok(results.some(item => item.title === "Secure Lab"));
});

test("does not return unrelated knowledge for unknown terms", () => {
  assert.deepEqual(knowledge("qzxvbl plmoknij"), []);
});

test("ignores queries made only of Persian stop words", () => {
  assert.deepEqual(knowledge("از و با برای"), []);
});
