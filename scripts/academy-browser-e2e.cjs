"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("playwright");

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE = `http://${HOST}:${PORT}`;
const DRAFT_KEY = "mr-siavash-ai.academy.content-drafts.v1";
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", HOST], {
  stdio: "ignore",
  env: process.env
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/academy.html`);
      if (response.ok) return;
    } catch {}
    await delay(200);
  }
  throw new Error("Local static server did not become ready.");
}

async function main() {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    serviceWorkers: "block",
    acceptDownloads: true
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  // Academy course rendering, lesson completion, and browser-local persistence.
  await page.goto(`${BASE}/academy.html`, { waitUntil: "networkidle" });
  await page.locator(".course-card").first().waitFor();
  assert.equal(await page.locator(".course-card").count(), 6, "six learning paths should render");
  await page.locator(".course-card").filter({ hasText: "HTML از پایه" }).click();
  assert.equal(await page.locator(".academy-lesson").count(), 5, "selected path should expose five chapters");
  const firstLesson = page.locator(".academy-lesson .lesson-complete").first();
  await firstLesson.check();
  await page.waitForFunction(() => {
    const value = JSON.parse(localStorage.getItem("mr-siavash-ai.academy.v1") || "{}");
    return Array.isArray(value.html) && value.html.includes(0);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".course-card").first().waitFor();
  await page.locator(".course-card").filter({ hasText: "HTML از پایه" }).click();
  assert.equal(await page.locator(".academy-lesson .lesson-complete").first().isChecked(), true,
    "completed lesson should survive a reload");

  // Isolated JavaScript runner: a real browser executes the starter challenge and returns its output.
  await page.locator("#academyPracticeRun").scrollIntoViewIfNeeded();
  // The runner iframe is intentionally lazy-loaded; bring it into view before waiting for its load event.
  await page.locator("#academyPracticeRunner").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const button = document.querySelector("#academyPracticeRun");
    return button && !button.disabled;
  }, null, { timeout: 10000 });
  await page.locator("#academyPracticeRun").click();
  await page.waitForFunction(() => document.querySelector("#academyPracticeOutput")?.textContent.trim() === "20",
    null, { timeout: 10000 });
  assert.match(await page.locator("#academyPracticeStatus").textContent(), /آفرین/,
    "successful challenge should show pass feedback");
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem("mr-siavash-ai.academy.practice.v1") || "{}");
    return state.completed?.includes("js-variables") && state.attempts?.["js-variables"] === 1;
  });

  // Draft authoring, edit, export, delete, and persistence.
  const studio = await context.newPage();
  studio.on("pageerror", error => pageErrors.push(error.message));
  await studio.goto(`${BASE}/academy-content-studio.html`, { waitUntil: "networkidle" });
  await studio.locator("#academyDraftTitle").fill("درس آزمایشی E2E");
  await studio.locator("#academyDraftObjective").fill("شناخت رفتار ذخیره‌سازی پیش‌نویس");
  await studio.locator("#academyDraftContent").fill("این متن فقط برای آزمون خودکار مرورگر است.");
  await studio.locator("#academyDraftForm button[type=submit]").click();
  await studio.getByRole("button", { name: "درس آزمایشی E2E" }).waitFor();
  assert.match(await studio.locator("#academyDraftStatus").textContent(), /ذخیره شد/);
  await studio.reload({ waitUntil: "networkidle" });
  await studio.getByRole("button", { name: "درس آزمایشی E2E" }).click();
  await studio.locator("#academyDraftTitle").fill("درس ویرایش‌شده E2E");
  await studio.locator("#academyDraftForm button[type=submit]").click();
  await studio.getByRole("button", { name: "درس ویرایش‌شده E2E" }).waitFor();
  const downloadPromise = studio.waitForEvent("download");
  await studio.locator("#academyDraftExport").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "mr-siavash-ai-academy-drafts.json");
  await studio.getByRole("button", { name: "حذف" }).click();
  await studio.getByText("هنوز پیش‌نویسی ثبت نشده است.").waitFor();

  // Storage failure must not create a draft or show a false success state.
  const failedStorage = await context.newPage();
  failedStorage.on("pageerror", error => pageErrors.push(error.message));
  await failedStorage.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, DRAFT_KEY);
  await failedStorage.goto(`${BASE}/academy-content-studio.html`, { waitUntil: "networkidle" });
  await failedStorage.locator("#academyDraftTitle").fill("نباید ذخیره شود");
  await failedStorage.locator("#academyDraftObjective").fill("آزمون شکست ذخیره‌سازی");
  await failedStorage.locator("#academyDraftContent").fill("این پیش‌نویس نباید در حافظه ثبت شود.");
  await failedStorage.locator("#academyDraftForm button[type=submit]").click();
  await failedStorage.getByText(/ذخیره محلی ناموفق بود/).waitFor();
  assert.equal(await failedStorage.locator(".academy-draft-open").count(), 0,
    "failed persistence must not mutate the visible draft list");

  // Basic narrow-screen smoke: core controls remain visible and operable.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/academy.html`, { waitUntil: "networkidle" });
  await page.locator("#courseSearch").fill("HTML");
  assert.ok(await page.locator(".course-card").count() >= 1, "course search should remain usable on mobile");
  assert.deepEqual(pageErrors, [], "browser pages should not emit uncaught JavaScript errors");

  console.log("Academy Chromium E2E: PASS");
  console.log("Verified: six course cards, lesson progress persistence, isolated JS runner, draft CRUD/export, storage failure rollback, and mobile search.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  });
