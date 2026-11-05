"use strict";

const CACHE_PREFIX = "mr-siavash-ai-shell-";
const CACHE_NAME = CACHE_PREFIX + "v8";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./favicon.svg", "./manifest.webmanifest", "./modules.json"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = SHELL_FILES.map(path => new URL(path, self.registration.scope).href);
    // The app depends on every shell resource, especially modules.json. Do not
    // activate a worker whose offline shell is incomplete.
    await cache.addAll(urls);
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

  const moduleRegistryUrl = new URL("./modules.json", scopeUrl).href;
  if (requestUrl.href === moduleRegistryUrl) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      try {
        const response = await fetch(request);
        const contentType = response && response.headers && response.headers.get("content-type") || "";
        const isJson = /^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(contentType);
        if (response && response.ok && isJson) {
          try { await cache.put(request, response.clone()); }
          catch (error) { console.warn("Could not refresh cached module registry."); }
          return response;
        }
        return cached || response;
      } catch (error) {
        return cached || new Response("", { status: 504, statusText: "Offline" });
      }
    })());
    return;
  }

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
