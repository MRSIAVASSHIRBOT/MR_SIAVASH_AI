import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../bounded-json.js", import.meta.url), "utf8");

function createLoader(fetchImpl, overrides = {}) {
  const window = {
    URL,
    AbortController,
    TextDecoder,
    TextEncoder,
    location: { href: "https://example.test/app/index.html", origin: "https://example.test" },
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    ...overrides
  };
  vm.runInNewContext(source, { window });
  return window.MRSIAVASHReadJson;
}

function response({ body, text, length, contentType = "application/json", status = 200 }) {
  return {
    ok: status >= 200 && status < 300,
    headers: { get(name) {
      if (name === "content-type") return contentType;
      if (name === "content-length") return length === undefined ? null : String(length);
      return null;
    }},
    ...(body ? { body } : {}),
    text: async () => text
  };
}

test("bounded JSON loader fetches only same-origin JSON without credentials", async () => {
  const expected = { ok: true, items: [1, 2] };
  const bytes = new TextEncoder().encode(JSON.stringify(expected));
  let options;
  let reads = 0;
  const loader = createLoader(async (url, init) => {
    options = init;
    return response({ body: { getReader: () => ({
      async read() {
        reads++;
        return reads === 1 ? { done: false, value: bytes } : { done: true };
      },
      async cancel() {},
      releaseLock() {}
    })}});
  });
  assert.deepEqual(await loader("./search-index.json", 4096), expected);
  assert.equal(options.method, "GET");
  assert.equal(options.credentials, "omit");
  assert.equal(options.cache, "no-cache");
  assert.ok(options.signal instanceof AbortSignal);
});

test("bounded JSON loader rejects cross-origin URLs before network access", async () => {
  let called = false;
  const loader = createLoader(async () => { called = true; throw new Error("must not fetch"); });
  await assert.rejects(loader("https://attacker.example/payload.json", 4096), /same-origin/);
  await assert.rejects(loader("./search-index.json?secret=1", 4096), /same-origin/);
  assert.equal(called, false);
});

test("bounded JSON loader rejects oversized Content-Length before reading the body", async () => {
  let read = false;
  const loader = createLoader(async () => response({
    length: 4097,
    body: { getReader: () => { read = true; throw new Error("must not read"); } }
  }));
  await assert.rejects(loader("./large.json", 4096), /too large/);
  assert.equal(read, false);
});

test("bounded JSON loader cancels a streamed body when its byte limit is exceeded", async () => {
  let cancelled = false;
  const chunks = [new Uint8Array(3), new Uint8Array(3)];
  let index = 0;
  const loader = createLoader(async () => response({
    body: { getReader: () => ({
      async read() { return index < chunks.length ? { done: false, value: chunks[index++] } : { done: true }; },
      async cancel() { cancelled = true; },
      releaseLock() {}
    })}
  }));
  await assert.rejects(loader("./large.json", 5), /too large/);
  assert.equal(cancelled, true);
});

test("bounded JSON loader enforces the fallback text byte limit", async () => {
  const loader = createLoader(async () => response({ text: "123456" }));
  await assert.rejects(loader("./large.json", 5), /too large/);
});

test("bounded JSON loader aborts stalled requests and clears its timeout", async () => {
  let cleared = false;
  let aborted = false;
  const loader = createLoader(async (_url, options) => {
    aborted = options.signal.aborted;
    throw new Error("aborted request");
  }, {
    setTimeout(callback) { callback(); return 77; },
    clearTimeout(id) { cleared = id === 77; }
  });
  await assert.rejects(loader("./slow.json", 4096), /aborted request/);
  assert.equal(aborted, true);
  assert.equal(cleared, true);
});

test("bounded JSON loader rejects invalid media types and invalid limits", async () => {
  const loader = createLoader(async () => response({ text: "{}", contentType: "text/html" }));
  await assert.rejects(loader("./page.json", 4096), /Invalid JSON resource type/);
  await assert.rejects(loader("./page.json", 0), /Invalid bounded JSON request/);
});
