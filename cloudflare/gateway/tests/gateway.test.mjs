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
  assert.equal(response.headers.get("allow"), "GET, OPTIONS");
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

test("valid CORS preflight permits only configured origins, GET, and approved headers", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: {
      Origin: "https://app.example.test",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "content-type, x-request-id"
    }
  }), { ALLOWED_ORIGINS: "https://app.example.test" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example.test");
  assert.equal(response.headers.get("access-control-allow-methods"), "GET");
  assert.equal(response.headers.get("access-control-allow-headers"), "content-type, x-request-id");
  assert.equal(response.headers.get("access-control-max-age"), "600");
});

test("CORS preflight rejects missing or untrusted origins", async () => {
  const env = { ALLOWED_ORIGINS: "https://app.example.test" };
  const missing = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: { "Access-Control-Request-Method": "GET" }
  }), env);
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).error.code, "cors_preflight_rejected");

  const untrusted = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example.test", "Access-Control-Request-Method": "GET" }
  }), env);
  assert.equal(untrusted.status, 403);
  assert.equal(untrusted.headers.get("access-control-allow-origin"), null);
});

test("CORS preflight rejects methods not implemented by the gateway", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: { Origin: "https://app.example.test", "Access-Control-Request-Method": "POST" }
  }), { ALLOWED_ORIGINS: "https://app.example.test" });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "cors_preflight_rejected");
});

test("CORS preflight rejects unapproved or malformed requested headers", async () => {
  const env = { ALLOWED_ORIGINS: "https://app.example.test" };
  const unapproved = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: {
      Origin: "https://app.example.test",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization"
    }
  }), env);
  assert.equal(unapproved.status, 403);

  const malformed = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: {
      Origin: "https://app.example.test",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "content-type, invalid header"
    }
  }), env);
  assert.equal(malformed.status, 403);
});

test("preflight rejection does not grant CORS access to arbitrary origins", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live", {
    method: "OPTIONS",
    headers: {
      Origin: "https://attacker.example.test",
      "Access-Control-Request-Method": "GET"
    }
  }), { ALLOWED_ORIGINS: "https://app.example.test" });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("responses include baseline browser security headers", async () => {
  const response = await worker.fetch(makeRequest("/v1/health/live"), {});
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});
