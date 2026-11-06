"use strict";

const SERVICE_NAME = "mr-siavash-ai-gateway";
const API_PREFIX = "/v1";

function securityHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
  };
}

function allowedOrigins(env) {
  if (typeof env.ALLOWED_ORIGINS !== "string") return new Set();
  return new Set(env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean).flatMap(value => {
    try {
      const parsed = new URL(value);
      return parsed.origin === value && (parsed.protocol === "https:" || parsed.protocol === "http:")
        ? [parsed.origin]
        : [];
    } catch {
      return [];
    }
  }));
}

function responseHeaders(request, env, requestId) {
  const headers = new Headers(securityHeaders());
  headers.set("X-Request-ID", requestId);
  headers.append("Vary", "Origin");

  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Request-ID");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function jsonResponse(request, env, requestId, status, payload) {
  const headers = responseHeaders(request, env, requestId);
  if (status === 405) headers.set("Allow", "GET, OPTIONS");
  return new Response(JSON.stringify(payload), { status, headers });
}

function requestId() {
  return globalThis.crypto.randomUUID();
}

async function checkDatabase(env) {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    return { ok: false, reason: "database_binding_missing" };
  }

  try {
    const result = await env.DB.prepare("SELECT 1 AS ok").first();
    if (!result || result.ok !== 1) return { ok: false, reason: "database_check_failed" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "database_unavailable" };
  }
}

export default {
  async fetch(request, env) {
    const id = requestId();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: responseHeaders(request, env, id)
      });
    }

    if (request.method !== "GET") {
      return jsonResponse(request, env, id, 405, {
        error: { code: "method_not_allowed", message: "Only GET and OPTIONS are supported." },
        request_id: id
      });
    }

    if (url.pathname === `${API_PREFIX}/health/live`) {
      return jsonResponse(request, env, id, 200, {
        status: "ok",
        service: SERVICE_NAME,
        request_id: id
      });
    }

    if (url.pathname === `${API_PREFIX}/health/ready`) {
      const database = await checkDatabase(env);
      return jsonResponse(request, env, id, database.ok ? 200 : 503, {
        status: database.ok ? "ready" : "not_ready",
        service: SERVICE_NAME,
        dependencies: { database: database.ok ? "ready" : "unavailable" },
        request_id: id
      });
    }

    return jsonResponse(request, env, id, 404, {
      error: { code: "not_found", message: "The requested API route does not exist." },
      request_id: id
    });
  }
};
