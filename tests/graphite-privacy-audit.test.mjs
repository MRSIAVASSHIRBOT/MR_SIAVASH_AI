import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("active site stylesheet defines the graphite/slate-blue system for dark and light themes", async () => {
  const css = await read("assets/css/style.css");
  assert.match(css, /--bg:#0b1018/);
  assert.match(css, /--surface:#151f2c/);
  assert.match(css, /--text:#edf2f8/);
  assert.match(css, /--accent:#83b4ff/);
  assert.match(css, /--accent-strong:#b6d4ff/);
  assert.match(css, /--bg:#f3f5f8/);
  assert.match(css, /--accent:#315f9a/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
  assert.doesNotMatch(css, /--accent:#34d399|--accent-strong:#10b981/);
});

test("privacy page uses the same application shell, theme control, navigation and footer", async () => {
  const privacy = await read("privacy.html");
  const home = await read("index.html");
  assert.match(privacy, /href="\.\/assets\/css\/style\.css"/);
  assert.match(privacy, /href="\.\/assets\/css\/privacy\.css"/);
  assert.match(privacy, /src="\.\/assets\/js\/main\.js"/);
  assert.match(privacy, /id="themeToggle"/);
  assert.match(privacy, /id="menuToggle"/);
  assert.match(privacy, /class="site-header"/);
  assert.match(privacy, /class="site-footer"/);
  assert.match(privacy, /aria-current="page">حریم خصوصی<\/a>/);
  assert.match(home, /href="\.\/privacy\.html">حریم خصوصی<\/a>/);
  assert.match(privacy, /<html lang="fa" dir="rtl">/);
  assert.match(privacy, /<main id="main"/);
  assert.equal((privacy.match(/<h1\b/g) || []).length, 1);
});

test("privacy disclosures retain the product's current data-handling statements", async () => {
  const privacy = await read("privacy.html");
  for (const phrase of [
    "برای هر سؤال، تأیید صریح لازم است",
    "فقط متن سؤال جاری به Gateway ارسال می‌شود",
    "شناسهٔ مشتق‌شده از IP و به‌صورت هش",
    "کلید خصوصی به‌صورت هش‌شده ذخیره می‌شود",
    "۹۰ روز از آخرین به‌روزرسانی",
    "رمز عبور، کلید API، کلید خصوصی",
    "با حساب ابری همگام‌سازی نمی‌شوند",
    "ادعای تأیید یا انطباق حقوقی"
  ]) {
    assert.ok(privacy.includes(phrase), "missing privacy disclosure: " + phrase);
  }
  assert.match(privacy, /id="support-status"/);
  assert.match(privacy, /id="ticket-data"/);
  assert.match(privacy, /id="retention"/);
  assert.match(privacy, /id="sensitive-data"/);
  assert.match(privacy, /id="local-workspace"/);
  assert.match(privacy, /id="scope"/);
});

test("privacy CSP remains restrictive and all page styling is self-hosted", async () => {
  const privacy = await read("privacy.html");
  assert.match(privacy, /default-src 'self'/);
  assert.match(privacy, /script-src 'self'/);
  assert.match(privacy, /style-src 'self'/);
  assert.match(privacy, /object-src 'none'/);
  assert.match(privacy, /base-uri 'self'/);
  assert.match(privacy, /frame-src 'none'/);
  assert.doesNotMatch(privacy, /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(privacy, /<link rel="stylesheet" href="https?:\/\//);
  assert.doesNotMatch(privacy, /<style\b|\sstyle=/i);
});

test("PWA metadata, active theme controller, and offline shell use the graphite v69 release", async () => {
  const manifest = JSON.parse(await read("manifest.webmanifest"));
  const index = await read("index.html");
  const privacy = await read("privacy.html");
  const mainJs = await read("assets/js/main.js");
  const sw = await read("sw.js");
  assert.equal(manifest.theme_color, "#0b1018");
  assert.equal(manifest.background_color, "#0b1018");
  assert.match(index, /name="theme-color" content="#0b1018"/);
  assert.match(privacy, /name="theme-color" content="#0b1018"/);
  assert.match(mainJs, /light\?"#f3f5f8":"#0b1018"/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v69"/);
  for (const asset of ["./privacy.html", "./assets/css/style.css", "./assets/css/privacy.css", "./assets/js/main.js"]) {
    assert.ok(sw.includes('"' + asset + '"'), "offline shell must include " + asset);
  }
});

test("responsive browser audit measures both required viewports and captures runtime/network failures", async () => {
  const audit = await read("scripts/site-accessibility-e2e.cjs");
  assert.ok(audit.indexOf('await page.setViewportSize({ width: 390, height: 844 });') <
    audit.indexOf('await page.goto("http://127.0.0.1:4174/" + route'),
    "every route must reset to the 390px mobile viewport before navigation");
  assert.match(audit, /setViewportSize\(\{ width: 1440, height: 900 \}\)/);
  assert.match(audit, /document\.documentElement\.scrollWidth/);
  assert.match(audit, /window\.innerWidth/);
  assert.match(audit, /requestfailed/);
  assert.match(audit, /consoleErrors/);
  assert.match(audit, /failedResponses/);
  assert.match(audit, /pageErrors/);
  assert.match(audit, /assets\/css\/style\.css/);
  assert.match(audit, /assets\/css\/privacy\.css/);
  assert.match(audit, /serviceWorkerState\.declaredCacheVersion !== "v69"/);
  assert.match(audit, /serviceWorkers: "allow"/);
  assert.match(audit, /registration\?\.active/);
  assert.match(audit, /privacyHtmlCached/);
  assert.match(audit, /privacyCssCached/);
  assert.match(audit, /cacheName !== "mr-siavash-ai-shell-v69"/);
  assert.match(audit, /Mobile 390x844/);
  assert.match(audit, /Desktop 1440x900/);
});

test("Pages publication verification checks privacy HTML and its dedicated stylesheet", async () => {
  const verifier = await read("scripts/verify-pages-publication.mjs");
  assert.match(verifier, /"privacy\.html"/);
  assert.match(verifier, /"assets\/css\/privacy\.css"/);
  assert.match(verifier, /"assets\/css\/style\.css"/);
});

