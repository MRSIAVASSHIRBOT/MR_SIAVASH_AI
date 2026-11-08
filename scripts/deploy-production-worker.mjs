import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const API = "https://api.cloudflare.com/client/v4";
const WORKER = "mr-siavash-ai-gateway";
const FRONTEND_ORIGIN = "https://mrsiavasshirbot.github.io";
const RETENTION_CRON = "0 3 * * *";
const RETENTION_DAYS = "90";
const PRESERVED_SECRET_TYPES = ["secret_text", "secret_key", "secrets_store_secret", "mtls_certificate"];

function requireBinding(bindings, name) {
  const binding = bindings.find(item => item.name === name);
  if (!binding || typeof binding.text !== "string" || !binding.text.trim()) {
    throw new Error("Required Worker configuration binding is missing: " + name);
  }
  return binding.text;
}

export function buildVersionMetadata(settings, { expectedDatabaseId, commitSha, enableWorkersAI = false } = {}) {
  if (!settings || !Array.isArray(settings.bindings)) throw new Error("Cloudflare Worker settings are incomplete.");
  if (!/^[0-9a-f-]{36}$/i.test(expectedDatabaseId || "")) throw new Error("Expected production D1 database ID is invalid.");
  if (!settings.compatibility_date) throw new Error("Worker compatibility date is missing.");

  const rawBindings = settings.bindings;
  const database = rawBindings.find(item => item.name === "DB" && item.type === "d1");
  if (!database || (database.database_id || database.id) !== expectedDatabaseId) {
    throw new Error("Production DB binding does not match the explicitly expected MR_SIAVASH_AI database.");
  }
  const allowedOrigins = requireBinding(rawBindings, "ALLOWED_ORIGINS");
  if (allowedOrigins !== FRONTEND_ORIGIN) throw new Error("Production ALLOWED_ORIGINS does not match the published site origin.");
  for (const name of ["ADMIN_EMAILS", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD"]) requireBinding(rawBindings, name);

  const bindings = rawBindings
    .filter(item => !PRESERVED_SECRET_TYPES.includes(item.type))
    .map(item => {
      if (item.type === "d1") return { type: "d1", name: item.name, database_id: item.database_id || item.id };
      if (item.type === "plain_text") return { type: "plain_text", name: item.name, text: item.name === "SUPPORT_RETENTION_DAYS" ? RETENTION_DAYS : item.text };
      if (item.type === "ai") return { type: "ai", name: item.name };
      return structuredClone(item);
    });

  if (!bindings.some(item => item.name === "SUPPORT_RETENTION_DAYS")) {
    bindings.push({ type: "plain_text", name: "SUPPORT_RETENTION_DAYS", text: RETENTION_DAYS });
  }
  if (enableWorkersAI) {
    if (!bindings.some(item => item.name === "AI" && item.type === "ai")) bindings.push({ type: "ai", name: "AI" });
    if (!bindings.some(item => item.name === "AI_MODEL")) {
      bindings.push({ type: "plain_text", name: "AI_MODEL", text: "@cf/zai-org/glm-4.7-flash" });
    }
  }

  return {
    main_module: "index.js",
    compatibility_date: settings.compatibility_date,
    compatibility_flags: Array.isArray(settings.compatibility_flags) ? settings.compatibility_flags : [],
    usage_model: settings.usage_model || "standard",
    bindings,
    keep_bindings: PRESERVED_SECRET_TYPES,
    annotations: {
      "workers/message": "Reviewed MR_SIAVASH_AI production release",
      "workers/commit_sha": /^[0-9a-f]{40}$/i.test(commitSha || "") ? commitSha : "manual-release",
      "workers/repository_url": "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI"
    }
  };
}

export function mergeCronSchedules(currentSchedules, cron = RETENTION_CRON) {
  const current = Array.isArray(currentSchedules) ? currentSchedules : [];
  const crons = [...new Set(current.map(item => item?.cron).filter(value => typeof value === "string" && value.trim()))];
  if (!crons.includes(cron)) crons.push(cron);
  return crons.map(value => ({ cron: value }));
}

async function cloudflareRequest(path, { token, fetchImpl = fetch, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + token);
  headers.set("Accept", "application/json");
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetchImpl(API + path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const code = payload.errors?.[0]?.code;
    throw new Error("Cloudflare API request failed (" + response.status + (code ? ", code " + code : "") + ").");
  }
  return payload.result;
}

async function smokeProduction(fetchImpl, { enableWorkersAI = false } = {}) {
  const base = "https://" + WORKER + ".mrsiavashirbot.workers.dev";
  async function call(path, init, status) {
    const response = await fetchImpl(base + path, init);
    let body = {};
    try { body = await response.json(); } catch {}
    if (response.status !== status) throw new Error("Production smoke failed for " + path + ": expected HTTP " + status + ", received " + response.status + ".");
    return { response, body };
  }

  const live = await call("/v1/health/live", {}, 200);
  if (live.body.status !== "ok") throw new Error("Production liveness payload is invalid.");
  const ready = await call("/v1/health/ready", {}, 200);
  if (ready.body.status !== "ready" || ready.body.dependencies?.database !== "ready") throw new Error("Production D1 readiness payload is invalid.");
  const modules = await call("/v1/modules", {}, 200);
  if (!Array.isArray(modules.body.items) || modules.body.items.length !== 9) throw new Error("Production module catalog does not match the reviewed nine-module contract.");

  const unknown = await call("/v1/support/tickets/MS-0000000000000000", {}, 404);
  if (unknown.body.error?.code !== "ticket_not_found") throw new Error("Production public ticket route is not responding with the expected private-not-found result.");
  const invalid = await call("/v1/support/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "", message: "" })
  }, 400);
  if (invalid.body.error?.code !== "invalid_ticket") throw new Error("Production ticket validation route did not reject an invalid payload.");

  const trusted = await fetchImpl(base + "/v1/modules", {
    method: "OPTIONS",
    headers: {
      Origin: FRONTEND_ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  if (trusted.status !== 204 || trusted.headers.get("access-control-allow-origin") !== FRONTEND_ORIGIN) {
    throw new Error("Production trusted-origin CORS smoke failed.");
  }
  const untrusted = await fetchImpl(base + "/v1/modules", {
    method: "OPTIONS",
    headers: { Origin: "https://untrusted.invalid", "Access-Control-Request-Method": "GET" }
  });
  if (untrusted.status !== 403 || untrusted.headers.get("access-control-allow-origin")) {
    throw new Error("Production untrusted-origin CORS smoke failed.");
  }

  if (enableWorkersAI) {
    const ai = await call("/v1/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "آموزش پایتون" })
    }, 200);
    if (ai.body.mode !== "ai_grounded" || !Array.isArray(ai.body.sources) || !ai.body.sources.length) {
      throw new Error("Workers AI smoke did not return a grounded response.");
    }
  }
}

export async function releaseProductionWorker({
  token,
  accountId,
  expectedDatabaseId,
  deploy = false,
  enableWorkersAI = false,
  commitSha = "",
  fetchImpl = fetch,
  source
}) {
  if (!token || !accountId || !expectedDatabaseId) throw new Error("Cloudflare token, account ID and expected production D1 ID are required.");
  const prefix = "/accounts/" + accountId + "/workers/scripts/" + WORKER;
  const [settings, deploymentsResult, schedulesResult] = await Promise.all([
    cloudflareRequest(prefix + "/settings", { token, fetchImpl }),
    cloudflareRequest(prefix + "/deployments", { token, fetchImpl }),
    cloudflareRequest(prefix + "/schedules", { token, fetchImpl })
  ]);
  const metadata = buildVersionMetadata(settings, { expectedDatabaseId, commitSha, enableWorkersAI });
  if (!deploy) {
    return { validated: true, deployed: false, worker: WORKER, message: "Production bindings validated. No Worker version, schedule or live traffic was changed." };
  }

  const previousDeployment = deploymentsResult.deployments?.[0];
  const previousVersion = previousDeployment?.versions?.slice().sort((a, b) => b.percentage - a.percentage)[0]?.version_id;
  if (!previousVersion) throw new Error("No previous production Worker version is available for rollback.");
  const previousSchedules = (schedulesResult.schedules || []).map(item => ({ cron: item.cron }));

  const workerSource = source ?? await readFile(resolve("cloudflare/gateway/src/index.js"), "utf8");
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("files", new Blob([workerSource], { type: "application/javascript+module" }), "index.js");

  const uploaded = await cloudflareRequest(prefix + "/versions", { token, fetchImpl, method: "POST", body: form });
  const versionId = uploaded.id;
  if (!versionId) throw new Error("Cloudflare did not return a Worker version ID.");

  let deployed = false;
  try {
    await cloudflareRequest(prefix + "/deployments", {
      token, fetchImpl, method: "POST",
      body: JSON.stringify({
        strategy: "percentage",
        versions: [{ version_id: versionId, percentage: 100 }],
        annotations: { "workers/message": "Deploy reviewed MR_SIAVASH_AI gateway version" }
      })
    });
    deployed = true;

    const desiredSchedules = mergeCronSchedules(previousSchedules);
    await cloudflareRequest(prefix + "/schedules", {
      token, fetchImpl, method: "PUT", body: JSON.stringify(desiredSchedules)
    });

    await smokeProduction(fetchImpl, { enableWorkersAI });
    const finalSettings = await cloudflareRequest(prefix + "/settings", { token, fetchImpl });
    const obs = finalSettings.observability || {};
    if (obs.redact_query_string !== true || obs.logs?.enabled !== true || obs.traces?.enabled !== true) {
      throw new Error("Production observability privacy settings changed unexpectedly; release verification failed.");
    }
    return { validated: true, deployed: true, worker: WORKER, versionId, previousVersion, schedules: desiredSchedules };
  } catch (error) {
    if (!deployed) throw error;
    let rollbackError = null;
    try {
      await cloudflareRequest(prefix + "/deployments", {
        token, fetchImpl, method: "POST",
        body: JSON.stringify({
          strategy: "percentage",
          versions: [{ version_id: previousVersion, percentage: 100 }],
          annotations: { "workers/message": "Automatic rollback after failed MR_SIAVASH_AI smoke checks" }
        })
      });
      await cloudflareRequest(prefix + "/schedules", {
        token, fetchImpl, method: "PUT", body: JSON.stringify(previousSchedules)
      });
    } catch (rollback) {
      rollbackError = rollback;
    }
    if (rollbackError) throw new Error("Production smoke failed and automatic rollback also failed. Smoke: " + error.message + ". Rollback: " + rollbackError.message);
    throw new Error("Production smoke failed; the previous Worker version and schedules were restored. " + error.message);
  }
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const expectedDatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const deploy = String(process.env.DEPLOY_WORKER || "").toLowerCase() === "true";
  const enableWorkersAI = String(process.env.ENABLE_WORKERS_AI || "").toLowerCase() === "true";
  const result = await releaseProductionWorker({
    token, accountId, expectedDatabaseId, deploy, enableWorkersAI,
    commitSha: process.env.GITHUB_SHA || ""
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
