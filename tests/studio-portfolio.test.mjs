import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../studio.html", import.meta.url), "utf8");
const css = await readFile(new URL("../studio-portfolio.css", import.meta.url), "utf8");
const js = await readFile(new URL("../studio-portfolio.js", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const search = JSON.parse(await readFile(new URL("../search-index.json", import.meta.url), "utf8"));

test("studio exposes clear visitor journeys and all primary sections", () => {
  for (const id of ["journey", "profile", "focus-areas", "projects", "learning", "lab", "journal", "resources", "status", "saved", "feedback", "resumePrint"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const target of ["learning", "projects", "lab", "feedback"]) {
    assert.match(html, new RegExp('href="#' + target + '"'));
  }
  assert.match(html, /MR_SIAVASH_HUB_AI/);
  assert.match(html, /MR_SIAVASH_AI/);
  assert.match(html, /Gshop/);
});

test("studio HTML has valid local anchors and no accidental escaped newline text", () => {
  assert.doesNotMatch(html, /\\n/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
  const localAnchors = [...html.matchAll(/\shref="#([^"]+)"/g)].map(match => match[1]);
  for (const id of localAnchors) assert.ok(ids.includes(id), "missing anchor target: " + id);
  const externalBlankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(match => match[0]);
  for (const link of externalBlankLinks) assert.match(link, /rel="[^"]*noopener/);
});

test("studio metadata supports indexing, canonical identity, and installation", () => {
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:url"/);
  assert.match(html, /name="robots"/);
  assert.match(html, /rel="manifest"/);
  assert.match(html, /name="description"/);
});

test("project case studies show current scope, limitations, and source evidence", () => {
  for (const sha of ["0c6d847", "2fd420b", "15de05b"]) assert.ok(html.includes(sha));
  assert.match(html, /Worker جداگانه/);
  assert.match(html, /ثبت تیکت جدید.*غیرفعال است/);
  assert.match(html, /درگاه پرداخت Sandbox/);
  assert.match(html, /Production-ready فرض کرد/);
  assert.match(html, /۹ نوامبر ۲۰۲۶/);
});

test("support copy does not imply ticket intake is currently available", () => {
  assert.match(html, /ثبت تیکت آنلاین در نسخهٔ فعلی غیرفعال است/);
  assert.match(html, /GitHub Issues/);
});

test("print action produces a dedicated concise portfolio, not the whole interactive page", () => {
  assert.match(html, /id="printResume"/);
  assert.match(html, /id="resumePrint"/);
  assert.match(html, /نمایهٔ پروژه‌ها و مسیر مهندسی/);
  assert.match(css, /body>\*:not\(#resumePrint\)/);
  assert.match(css, /#resumePrint\{display:block!important/);
  assert.match(js, /window\.print\(\)/);
});

test("studio bookmark storage is local and allowlisted", () => {
  assert.match(js, /mr-siavash-ai\.studio\.saved\.v1/);
  assert.match(js, /\["hub","site","gshop"\]/);
  assert.match(html, /فقط روی همین مرورگر/);
  assert.match(js, /fetch\("\.\/hub-status\.json"/);\n  assert.doesNotMatch(js, /XMLHttpRequest|sendBeacon/);
});

test("studio code examples are copy-only and never evaluated", () => {
  assert.match(html, /این قطعه‌کد صرفاً نمایش داده می‌شود/);
  assert.match(js, /clipboard\.writeText/);
  assert.doesNotMatch(js, /\beval\s*\(|new Function|\bFunction\s*\(/);
  assert.doesNotMatch(html, /<script\s*>/i);
});

test("studio registers and is included in the offline shell", () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /studio-portfolio\.css/);
  assert.match(html, /studio-portfolio\.js/);
  assert.match(js, /serviceWorker\.register\("\.\/sw\.js"\)/);
  for (const asset of ["studio.html", "studio-portfolio.css", "studio-portfolio.js"]) {
    assert.ok(sw.includes('"./' + asset + '"'), "missing offline asset: " + asset);
  }
  assert.ok(sw.includes('new URL("./studio.html", scopeUrl)'), "studio navigation must be cached offline");
});

test("studio styles have responsive, keyboard, reduced-motion, forced-colors and print fallbacks", () => {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media print/);
});

test("studio sections and visitor routes are discoverable through global search", () => {
  assert.equal(search.schema, "mr-siavash-ai-search-index");
  const ids = new Set(search.items.map(item => item.id));
  for (const id of ["page-studio", "page-projects", "page-learning-paths", "page-engineering-lab", "page-research-notes", "page-reference-library", "page-service-status", "page-visitor-journey", "page-project-evidence", "page-feedback"]) {
    assert.ok(ids.has(id), "missing search item: " + id);
  }
});


test("Hub public status panel is bounded, read-only and explicit about the local runtime boundary", () => {
  assert.match(html, /id="hubPublicStatus"/);
  assert.match(html, /id="refreshHubStatus"/);
  assert.match(html, /سلامت اجرای محلی Hub را بررسی نمی‌کند/);
  assert.match(js, /mr-siavash-hub-public-status/);
  assert.match(js, /credentials:"same-origin"/);
  assert.match(js, /cache:"no-store"/);
  assert.match(js, /16\\*1024/);
  assert.match(js, /textContent/);
  assert.match(html, /MR_SIAVASH_HUB_AI\\/actions/);
});
