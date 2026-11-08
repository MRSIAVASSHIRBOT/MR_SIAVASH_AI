"use strict";

const CACHE_PREFIX = "mr-siavash-ai-shell-";
const CACHE_NAME = CACHE_PREFIX + "v23";
const MAX_MODULE_REGISTRY_BYTES = 64 * 1024;
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./experience.css", "./studio.css", "./ui-sounds.js", "./app.js", "./python.html", "./python-course.css", "./python-course.js", "./academy.html", "./academy.css", "./academy.js", "./support.js", "./support.css", "./favicon.svg", "./manifest.webmanifest", "./modules.json"];

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

async function isCacheableModuleRegistry(response) {
  if (!response || !response.ok) return false;
  const contentType = response.headers && response.headers.get("content-type") || "";
  if (!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(contentType)) return false;

  const declaredLength = response.headers && response.headers.get("content-length");
  if (declaredLength !== null && declaredLength !== undefined &&
      /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_MODULE_REGISTRY_BYTES) {
    return false;
  }

  try {
    let payload;
    const body = response.clone().body;
    if (body && typeof body.getReader === "function") {
      const reader = body.getReader();
      const chunks = [];
      let totalBytes = 0;
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          totalBytes += result.value.byteLength;
          if (totalBytes > MAX_MODULE_REGISTRY_BYTES) {
            try { await reader.cancel(); } catch (error) { /* The stream may already be closed. */ }
            return false;
          }
          chunks.push(result.value);
        }
      } finally {
        if (typeof reader.releaseLock === "function") reader.releaseLock();
      }
      const bytes = new Uint8Array(totalBytes);
      let offset = 0;
      chunks.forEach(chunk => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      });
      payload = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else {
      payload = await response.clone().text();
      if (new TextEncoder().encode(payload).byteLength > MAX_MODULE_REGISTRY_BYTES) return false;
    }

    const registry = JSON.parse(payload);
    const keys = registry && typeof registry === "object" && !Array.isArray(registry)
      ? Object.keys(registry).sort()
      : [];
    return keys.length === 3 &&
      keys[0] === "modules" && keys[1] === "schema" && keys[2] === "version" &&
      registry.schema === "mr-siavash-ai-module-registry" &&
      registry.version === 1 &&
      Array.isArray(registry.modules) &&
      registry.modules.length >= 1 && registry.modules.length <= 50;
  } catch (error) {
    return false;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname) || requestUrl.search) return;

  if (request.mode === "navigate") {
    const indexUrl = new URL("./index.html", scopeUrl).href;
    const navigationTargets = [
      { requestUrl: new URL("./", scopeUrl).href, cacheUrl: indexUrl },
      { requestUrl: indexUrl, cacheUrl: indexUrl },
      { requestUrl: new URL("./python.html", scopeUrl).href, cacheUrl: new URL("./python.html", scopeUrl).href },
      { requestUrl: new URL("./academy.html", scopeUrl).href, cacheUrl: new URL("./academy.html", scopeUrl).href }
    ];
    const target = navigationTargets.find(item => item.requestUrl === requestUrl.href);
    if (!target) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const contentType = response && response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("text/html")) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(target.cacheUrl, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(target.cacheUrl)) ||
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
      const cachedIsValid = cached ? await isCacheableModuleRegistry(cached) : false;
      try {
        const response = await fetch(request);
        if (response && response.ok && await isCacheableModuleRegistry(response)) {
          try { await cache.put(request, response.clone()); }
          catch (error) { console.warn("Could not refresh cached module registry."); }
          return response;
        }
        return cachedIsValid ? cached : (response || new Response("", { status: 504, statusText: "Unavailable" }));
      } catch (error) {
        return cachedIsValid ? cached : new Response("", { status: 504, statusText: "Offline" });
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
