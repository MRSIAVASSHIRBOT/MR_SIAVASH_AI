import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const validRegistry = JSON.stringify({ schema: "mr-siavash-ai-module-registry", version: 1, modules: [{}] });

function createHarness(fetchImpl = async () => new Response("asset", {
  status: 200,
  headers: { "Content-Type": "text/css" }
}), cachedResponse = null) {
  const listeners = new Map();
  const writes = [];
  const reads = [];
  let skipWaitingCalls = 0;
  const cache = {
    async match(key) { reads.push(key.url || String(key)); return cachedResponse ? cachedResponse.clone() : null; },
    async put(key, value) { writes.push({ key: key.url || String(key), value }); },
    async add() {},
    async addAll(urls) { writes.push({ precache: urls }); }
  };
  const self = {
    registration: { scope: "https://example.test/app/" },
    clients: { async claim() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
    async skipWaiting() { skipWaitingCalls += 1; }
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ["mr-siavash-ai-shell-v8"]; },
    async delete() { return true; }
  };
  vm.runInNewContext(source, { self, caches, URL, Set, Response, TextEncoder, TextDecoder, Uint8Array, fetch: fetchImpl, console });
  return { listeners, writes, reads, get skipWaitingCalls() { return skipWaitingCalls; } };
}

function dispatchFetch(listeners, request) {
  let responsePromise = null;
  listeners.get("fetch")({
    request,
    respondWith(value) { responsePromise = Promise.resolve(value); }
  });
  return responsePromise;
}

test("service worker bypasses API and unknown same-origin GET requests", () => {
  const { listeners } = createHarness();
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/api/private/tasks"
  }), null);
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/private/profile.json"
  }), null);
});

test("service worker bypasses cache-busted static URLs and non-GET requests", () => {
  const { listeners } = createHarness();
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/styles.css?v=4"
  }), null);
  assert.equal(dispatchFetch(listeners, {
    method: "POST", mode: "cors", url: "https://example.test/app/api/tasks"
  }), null);
});

test("service worker handles an exact allowlisted static shell URL", async () => {
  const { listeners } = createHarness();
  const response = dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/styles.css"
  });
  assert.ok(response instanceof Promise);
  assert.equal((await response).status, 200);
});

test("service worker includes the versioned module registry in its exact static allowlist", async () => {
  const { listeners } = createHarness();
  const response = dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.ok(response instanceof Promise);
  assert.equal((await response).status, 200);
});

test("service worker bypasses unknown and query-string navigation requests", () => {
  const { listeners } = createHarness();
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/dashboard"
  }), null);
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/?next=private"
  }), null);
});

test("navigation caches only successful HTML responses for the app document", async () => {
  const { listeners, writes } = createHarness(async () => new Response("<html></html>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  }));
  const response = dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/"
  });
  await response;
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "https://example.test/app/index.html");
});

test("navigation does not cache non-HTML responses", async () => {
  const { listeners, writes } = createHarness(async () => new Response("not html", {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));
  await dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/"
  });
  assert.equal(writes.length, 0);
});


test("install precaches the complete shell before activating the worker", async () => {
  const harness = createHarness();
  let installPromise;
  harness.listeners.get("install")({ waitUntil(value) { installPromise = value; } });
  await installPromise;
  assert.equal(harness.skipWaitingCalls, 1);
  const precache = harness.writes.find(entry => Array.isArray(entry.precache));
  assert.ok(precache);
  assert.ok(precache.precache.includes("https://example.test/app/modules.json"));
  assert.ok(precache.precache.includes("https://example.test/app/bounded-json.js"));
  assert.ok(precache.precache.includes("https://example.test/app/site-search.js"));
  assert.ok(precache.precache.includes("https://example.test/app/search-index.json"));
  assert.ok(precache.precache.includes("https://example.test/app/python.html"));
  assert.ok(precache.precache.includes("https://example.test/app/experience.css"));
  assert.ok(precache.precache.includes("https://example.test/app/studio.css"));
  assert.ok(precache.precache.includes("https://example.test/app/experience-next.css"));
  assert.ok(precache.precache.includes("https://example.test/app/ui-sounds.js"));
  assert.ok(precache.precache.includes("https://example.test/app/python-course.js"));
  assert.ok(precache.precache.includes("https://example.test/app/support.js"));
  assert.ok(precache.precache.includes("https://example.test/app/support-tickets.mjs"));
  assert.ok(precache.precache.includes("https://example.test/app/privacy.html"));
  assert.ok(precache.precache.includes("https://example.test/app/support.css"));
  assert.ok(precache.precache.includes("https://example.test/app/python-course.css"));
  assert.ok(precache.precache.includes("https://example.test/app/academy.html"));
  assert.ok(precache.precache.includes("https://example.test/app/academy.css"));
  assert.ok(precache.precache.includes("https://example.test/app/academy.js"));
  assert.equal(precache.precache.length, 24);
});

test("install does not activate a worker when atomic shell precache fails", async () => {
  const listeners = new Map();
  let skipWaitingCalls = 0;
  const cache = { async addAll() { throw new Error("precache failed"); } };
  const self = {
    registration: { scope: "https://example.test/app/" },
    clients: { async claim() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
    async skipWaiting() { skipWaitingCalls += 1; }
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ["mr-siavash-ai-shell-v8"]; },
    async delete() { return true; }
  };
  vm.runInNewContext(source, { self, caches, URL, Set, Response, TextEncoder, TextDecoder, Uint8Array, fetch, console });
  let installPromise;
  listeners.get("install")({ waitUntil(value) { installPromise = value; } });
  await assert.rejects(installPromise, /precache failed/);
  assert.equal(skipWaitingCalls, 0);
});


test("module registry caches only a bounded, versioned JSON envelope", async () => {
  let fetchCalls = 0;
  const { listeners, writes } = createHarness(async () => {
    fetchCalls += 1;
    return new Response(validRegistry, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.equal(fetchCalls, 1);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).schema, "mr-siavash-ai-module-registry");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "https://example.test/app/modules.json");
});

test("module registry serves its last valid bounded cache when the network is unavailable", async () => {
  const cached = new Response(validRegistry, {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  let fetchCalls = 0;
  const { listeners } = createHarness(async () => {
    fetchCalls += 1;
    throw new Error("offline");
  }, cached);
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.equal(fetchCalls, 1);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).version, 1);
});

test("module registry preserves a valid cache when the network returns an invalid envelope", async () => {
  const cached = new Response(validRegistry, {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const { listeners, writes } = createHarness(async () => new Response(JSON.stringify({ version: 2 }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }), cached);
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.equal((await response.json()).schema, "mr-siavash-ai-module-registry");
  assert.equal(writes.length, 0);
});

test("module registry does not cache oversized declared responses", async () => {
  const cached = new Response(validRegistry, {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const { listeners, writes } = createHarness(async () => new Response(validRegistry, {
    status: 200,
    headers: { "Content-Type": "application/json", "Content-Length": String(64 * 1024 + 1) }
  }), cached);
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.equal((await response.json()).schema, "mr-siavash-ai-module-registry");
  assert.equal(writes.length, 0);
});

test("module registry rejects an invalid cached entry instead of serving it offline", async () => {
  const cached = new Response(JSON.stringify({ version: 1 }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const { listeners } = createHarness(async () => { throw new Error("offline"); }, cached);
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app/modules.json"
  });
  assert.equal(response.status, 504);
});

test("service worker enforces origin and path-segment boundaries before cache handling", () => {
  const { listeners } = createHarness();
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://evil.example/app/styles.css"
  }), null);
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/application/styles.css"
  }), null);
  assert.equal(dispatchFetch(listeners, {
    method: "GET", mode: "cors", url: "https://example.test/app-extra/styles.css"
  }), null);
});

test("offline app navigation restores the cached document without caching an error", async () => {
  const cached = new Response("<html>cached app</html>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
  const { listeners, writes } = createHarness(async () => {
    throw new Error("offline");
  }, cached);
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/"
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached app/);
  assert.equal(writes.length, 0);
});

test("offline app navigation returns a bounded 503 when no cached document exists", async () => {
  const { listeners } = createHarness(async () => {
    throw new Error("offline");
  });
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/"
  });
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type"), /^text\/plain; charset=utf-8$/);
  assert.match(await response.text(), /نسخه آفلاین صفحه در دسترس نیست/);
});

test("navigation does not cache unsuccessful HTTP responses", async () => {
  const { listeners, writes } = createHarness(async () => new Response("temporary failure", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  }));
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/"
  });
  assert.equal(response.status, 503);
  assert.equal(writes.length, 0);
});


test("online navigation caches each supported course document at its own URL", async () => {
  const targets = [
    ["https://example.test/app/", "https://example.test/app/index.html"],
    ["https://example.test/app/index.html", "https://example.test/app/index.html"],
    ["https://example.test/app/python.html", "https://example.test/app/python.html"],
    ["https://example.test/app/academy.html", "https://example.test/app/academy.html"]
  ];
  for (const [url, expectedCacheUrl] of targets) {
    const { listeners, writes } = createHarness(async () => new Response("<html>course</html>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }));
    const response = await dispatchFetch(listeners, { method: "GET", mode: "navigate", url });
    assert.equal(response.status, 200, url);
    assert.equal(writes.length, 1, url);
    assert.equal(writes[0].key, expectedCacheUrl, url);
  }
});

test("offline Python and academy direct navigation restores each page from its own cache entry", async () => {
  const cached = new Response("<html>cached course</html>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
  for (const path of ["python.html", "academy.html"]) {
    const { listeners, reads, writes } = createHarness(async () => {
      throw new Error("offline");
    }, cached);
    const url = "https://example.test/app/" + path;
    const response = await dispatchFetch(listeners, { method: "GET", mode: "navigate", url });
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /cached course/, path);
    assert.deepEqual(reads, [url], path);
    assert.equal(writes.length, 0, path);
  }
});

test("offline course navigation returns a bounded 503 when its own page is not cached", async () => {
  const { listeners } = createHarness(async () => {
    throw new Error("offline");
  });
  const response = await dispatchFetch(listeners, {
    method: "GET", mode: "navigate", url: "https://example.test/app/academy.html"
  });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /نسخه آفلاین صفحه در دسترس نیست/);
});
