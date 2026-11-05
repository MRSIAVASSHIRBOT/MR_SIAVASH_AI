import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");

function createHarness(fetchImpl = async () => new Response("asset", {
  status: 200,
  headers: { "Content-Type": "text/css" }
})) {
  const listeners = new Map();
  const writes = [];
  const cache = {
    async match() { return null; },
    async put(key, value) { writes.push({ key: String(key), value }); },
    async add() {}
  };
  const self = {
    registration: { scope: "https://example.test/app/" },
    clients: { async claim() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
    async skipWaiting() {}
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ["mr-siavash-ai-shell-v4"]; },
    async delete() { return true; }
  };
  vm.runInNewContext(source, { self, caches, URL, Set, Response, fetch: fetchImpl, console });
  return { listeners, writes };
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
