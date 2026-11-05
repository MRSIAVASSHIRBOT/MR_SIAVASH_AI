"use strict";

const CACHE_PREFIX = "mr-siavash-ai-shell-";
const CACHE_NAME = CACHE_PREFIX + "v3";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./favicon.svg", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = SHELL_FILES.map(path => new URL(path, self.registration.scope).toString());
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
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(new URL("./index.html", self.registration.scope).toString(), response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(new URL("./index.html", self.registration.scope).toString())) ||
          new Response("نسخه آفلاین صفحه در دسترس نیست. یک‌بار با اتصال اینترنت وارد سایت شو.", {
            status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}
          });
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
      if (response && response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    } catch (error) {
      return new Response("", {status:504,statusText:"Offline"});
    }
  })());
});
