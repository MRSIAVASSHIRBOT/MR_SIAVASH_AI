"use strict";

const CACHE_PREFIX = "mr-siavash-ai-shell-";
const CACHE_NAME = CACHE_PREFIX + "v5";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./favicon.svg", "./manifest.webmanifest", "./modules.json"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = SHELL_FILES.map(path => new URL(path, self.registration.scope).href);
    await Promise.all(urls.map(async url => {
      try { await cache.add(url); }
      catch (error) { console.warn("Could not cache app shell resource:", url); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname) || requestUrl.search) return;

  if (request.mode === "navigate") {
    const appRootUrl = new URL("./", scopeUrl);
    const indexUrl = new URL("./index.html", scopeUrl);
    if (requestUrl.pathname !== appRootUrl.pathname && requestUrl.href !== indexUrl.href) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const contentType = response && response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("text/html")) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL("./index.html", self.registration.scope).href, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(new URL("./index.html", self.registration.scope).href)) ||
          new Response("نسخه آفلاین صفحه در دسترس نیست. یک‌بار با اتصال اینترنت وارد سایت شو.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  const shellUrls = new Set(SHELL_FILES.map(path => new URL(path, scopeUrl).href));
  if (!shellUrls.has(requestUrl.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});
