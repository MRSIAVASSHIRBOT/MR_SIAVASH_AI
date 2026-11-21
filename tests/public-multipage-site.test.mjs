import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

const [
  index,
  learn,
  projects,
  knowledge,
  contact,
  privacy,
  notFound,
  css,
  js,
  sw,
  publication,
  favicon,
  manifestSource,
] = await Promise.all([
  "index.html",
  "learn.html",
  "projects.html",
  "knowledge.html",
  "contact.html",
  "privacy.html",
  "404.html",
  "assets/css/style.css",
  "assets/js/main.js",
  "sw.js",
  "scripts/verify-pages-publication.mjs",
  "favicon.svg",
  "manifest.webmanifest",
].map(read));

test("seven public pages use Persian RTL semantics and shared assets", () => {
  for (const html of [index, learn, projects, knowledge, contact, privacy, notFound]) {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /<main id="main"/);
    assert.match(html, /class="skip-link"/);
    assert.match(html, /assets\/css\/style\.css/);
    assert.match(html, /assets\/js\/main\.js/);
    assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
  }
  assert.match(index, /پایتون، هوش مصنوعی و امنیت؛/);
  assert.match(index, /شروع یادگیری/);
  assert.match(index, /دیدن پروژه‌ها/);
  assert.match(privacy, /حریم خصوصی/);
});

test("all public routes expose six primary navigation destinations", () => {
  for (const html of [index, learn, projects, knowledge, contact, privacy, notFound]) {
    const nav = html.match(/<nav class="main-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    assert.equal((nav.match(/class="nav-link"/g) || []).length, 6);
    assert.match(nav, /href="\.\/privacy\.html"/);
    assert.doesNotMatch(nav, /ادمین|مدیریت|داشبورد|نسخه توسعه|بررسی اتصال/);
  }
});

test("progress, theme, search, keyboard and reduced motion remain implemented", () => {
  assert.match(js, /mrsiavash-theme/);
  assert.match(js, /mrsiavash-progress-/);
  assert.match(js, /IntersectionObserver/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /e\.key==="Escape"/);
  assert.match(js, /navigator\.serviceWorker\.register\("\.\/sw\.js"/);
  assert.match(learn, /data-progress-group="python"/);
  assert.match(js, /done===0\?"شروع نشده"/);
  assert.doesNotMatch(learn, /۰٪|۰ از ۶ مرحله/);
  assert.match(knowledge, /id="knowledgeSearch"/);
  assert.match(knowledge, /<details class="article"/);
});

test("active public design tokens and responsive controls use graphite and slate blue", () => {
  for (const token of [
    "--bg:#0b1018",
    "--surface:#151f2c",
    "--surface-2:#1c2938",
    "--border:#304055",
    "--text:#edf2f8",
    "--muted:#aeb9c8",
    "--accent:#83b4ff",
    "--accent-strong:#b6d4ff",
    "--warning:#d8a879",
  ]) assert.ok(css.includes(token), token);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /min-height:44px/);
});

test("service worker v69 precaches all active public pages and privacy assets", () => {
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ "v69"/);
  for (const path of [
    "learn.html",
    "projects.html",
    "knowledge.html",
    "contact.html",
    "404.html",
    "privacy.html",
    "favicon.svg",
    "assets/css/style.css",
    "assets/css/privacy.css",
    "assets/js/main.js",
  ]) assert.ok(sw.includes(path), path);
});

test("public pages do not expose internal admin controls or placeholders", () => {
  for (const html of [index, learn, projects, knowledge, contact, privacy, notFound]) {
    assert.doesNotMatch(html, /admin-support|پنل مدیریت|نسخه توسعه|در حال بررسی اتصال|فهرست ماژول‌ها در دسترس نیست/);
  }
});

test("published-content verification covers every public route and shared asset", () => {
  for (const path of [
    "index.html",
    "learn.html",
    "projects.html",
    "knowledge.html",
    "contact.html",
    "404.html",
    "privacy.html",
    "favicon.svg",
    "manifest.webmanifest",
    "assets/css/style.css",
    "assets/css/privacy.css",
    "assets/js/main.js",
  ]) assert.ok(publication.includes('"' + path + '"'), path);
});

test("PWA manifest opens the active homepage with Persian RTL metadata", () => {
  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.lang, "fa");
  assert.equal(manifest.dir, "rtl");
  assert.equal(manifest.theme_color, "#0b1018");
  assert.equal(manifest.background_color, "#0b1018");
});

test("learning paths link to practical courses and use inline SVG icons", () => {
  assert.match(learn, /href="\.\/python\.html"/);
  assert.match(learn, /href="\.\/academy\.html"/);
  assert.match(index, /<svg width="24" height="24"/);
  assert.match(contact, /<svg width="24" height="24"/);
  assert.match(favicon, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});
