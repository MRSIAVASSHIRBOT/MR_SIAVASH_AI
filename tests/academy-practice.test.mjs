import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getAcademyChallenges, getAcademyChallenge, normalizeAcademyPracticeState, gradeAcademyChallenge, recordAcademyPracticeAttempt, serializeAcademyPracticeState } from "../academy-practice.mjs";

test("practice curriculum contains six bounded beginner JavaScript challenges", () => {
  const challenges = getAcademyChallenges();
  assert.equal(challenges.length, 6);
  assert.ok(challenges.every(item => item.id.startsWith("js-") && item.starter.length <= 4000));
  assert.equal(getAcademyChallenge("missing"), null);
});

test("practice grading accepts only expected bounded console output", () => {
  for (const [id, output] of [["js-variables","20"],["js-condition","قبول"],["js-array","35"],["js-function","36"],["js-string","HELLO"],["js-object","Linux"]]) assert.equal(gradeAcademyChallenge(id, [output]).passed, true);
  assert.equal(gradeAcademyChallenge("js-variables", ["21"]).passed, false);
  assert.equal(gradeAcademyChallenge("missing", ["20"]).valid, false);
  assert.equal(gradeAcademyChallenge("js-variables", Array(21).fill("x")).valid, false);
});

test("practice state normalization and serialization reject unknown identifiers and invalid counters", () => {
  const state = normalizeAcademyPracticeState({ completed: ["js-variables", "unknown", "js-variables"], attempts: { "js-variables": 2, "js-array": -1 } });
  assert.deepEqual(state.completed, ["js-variables"]);
  assert.deepEqual(state.attempts, { "js-variables": 2 });
  assert.deepEqual(normalizeAcademyPracticeState(serializeAcademyPracticeState(state)), state);
  assert.deepEqual(recordAcademyPracticeAttempt(state, "js-variables", true), { version: 1, completed: ["js-variables"], attempts: { "js-variables": 3 } });
});

test("runner has a restrictive no-network sandbox policy", async () => {
  const html = await readFile(new URL("../academy-runner.html", import.meta.url), "utf8");
  const ui = await readFile(new URL("../academy-practice.js", import.meta.url), "utf8");
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes("frame-src 'none'"));
  assert.ok(html.includes("worker-src 'none'"));
  assert.ok(!html.includes("https://"));
  assert.ok(ui.includes("event.source !== frame.contentWindow"));
  assert.ok(ui.includes("1800"));
  assert.ok(!ui.includes(".innerHTML ="));
});

test("content authoring remains browser-local and has no publish API", async () => {
  const html = await readFile(new URL("../academy-content-studio.html", import.meta.url), "utf8");
  const js = await readFile(new URL("../academy-content-studio.js", import.meta.url), "utf8");
  assert.ok(html.includes("امکان انتشار مستقیم ندارد"));
  assert.ok(js.includes("localStorage"));
  assert.ok(js.includes("mr-siavash-ai-academy-drafts"));
  assert.ok(js.includes("slice(0, 100)"));
  assert.ok(js.includes("1024*1024"));
  assert.ok(!js.includes("fetch("));
  assert.ok(!js.includes(".innerHTML ="));
});
