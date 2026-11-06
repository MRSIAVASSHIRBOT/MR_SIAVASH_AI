import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function makeRequest(path, options = {}) {
  return new Request(`https://gateway.example.test${path}`, options);
}

function database(result = { ok: 1 }) {
  return {
    prepare(sql) {
      assert.equal(sql, "SELECT 1 AS ok");
      return { first: async () => result };
    }
  };
}

test("liveness is independent of database availability", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json().then(body => ({ status: body.status, service: body.service })), {
    status: "ok",
    service: "mr-siavash-ai-gateway"
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("x-request-id"));
});

test("readiness succeeds only when the D1 health query succeeds", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/ready"), { DB: database() });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).dependencies.database, "ready");
});

test("readiness fails closed when the database binding is missing", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/ready"), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, "not_ready");
});

test("readiness does not leak database exceptions", async () => {
  const DB = { prepare: () => ({ first: async () => { throw new Error("private database detail"); } }) };
  const response = await worker.fetch(makeRequest("/v1/health/ready"), { DB });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private database detail/);
});

test("unknown routes return a stable JSON 404", async () => {
  const response = await worker.fetch(makeRequest("/v1/private/users"), {});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "not_found");
});

test("unsupported methods are rejected", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", { method: "POST" }), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), null);
  assert.equal((await response.json()).error.code, "method_not_allowed");
});

test("CORS reflects only an exact configured origin", async () => {
  const env = { ALLOWED_ORIGINS: "https://app.example.test, https://staging.example.test" };
  const allowed = await worker.fetch(makeRequest("/v1/health/live", {
    headers: { Origin: "https://app.example.test" }
  }), env);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://app.example.test");

  const rejected = await worker.fetch(makeRequest("/v1/health/live", {
    headers: { Origin: "https://attacker.example.test" }
  }), env);
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("wildcard and malformed CORS entries are ignored", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", {
    headers: { Origin: "https://attacker.example.test" }
  }), { ALLOWED_ORIGINS: "*,not-a-url,https://app.example.test/path" });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("preflight is answered without enabling arbitrary origins", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example.test" }
  }), { ALLOWED_ORIGINS: "https://app.example.test" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("responses include baseline browser security headers", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live"), {});
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});
