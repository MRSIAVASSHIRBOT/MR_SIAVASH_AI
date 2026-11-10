import test from "node:test";
import assert from "node:assert/strict";
import { buildVersionMetadata, buildWorkerUploadForm, mergeCronSchedules, configureCronSchedules, releaseProductionWorker, waitForModulesRoute } from "./deploy-production-worker.mjs";

const settings = {
  compatibility_date: "2026-11-06",
  compatibility_flags: [],
  usage_model: "standard",
  bindings: [
    { name: "DB", type: "d1", database_id: "87c15170-7995-4929-b00c-20b5b491c05f" },
    { name: "ALLOWED_ORIGINS", type: "plain_text", text: "https://mrsiavasshirbot.github.io" },
    { name: "ADMIN_EMAILS", type: "plain_text", text: "admin@example.test" },
    { name: "CF_ACCESS_TEAM_DOMAIN", type: "plain_text", text: "team.example.cloudflareaccess.com" },
    { name: "CF_ACCESS_AUD", type: "plain_text", text: "audience-test" },
    { name: "PRIVATE_TOKEN", type: "secret_text", value: "secret-value-never-copy" }
  ]
};

test("production release metadata pins the dedicated D1 and preserves Access bindings", () => {
  const metadata = buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    commitSha: "a".repeat(40),
    enableSupportRetention: true,
  });
  assert.equal(metadata.main_module, "index.js");
  assert.ok(metadata.bindings.some(x => x.name === "DB" && x.database_id === "87c15170-7995-4929-b00c-20b5b491c05f"));
  for (const name of ["ALLOWED_ORIGINS", "ADMIN_EMAILS", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "SUPPORT_RETENTION_DAYS"]) {
    assert.ok(metadata.bindings.some(x => x.name === name), name);
  }
  assert.deepEqual(metadata.keep_bindings, ["secret_text", "secret_key", "secrets_store_secret", "mtls_certificate"]);
  assert.equal(metadata.bindings.find(x => x.name === "SUPPORT_RETENTION_DAYS").text, "90");
  assert.equal(metadata.annotations["workers/commit_sha"], "a".repeat(40));
  assert.equal(metadata.annotations["workers/repository_url"], "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI");
});

test("production release refuses a database mismatch or incomplete Access configuration", () => {
  assert.throws(() => buildVersionMetadata(settings, {
    expectedDatabaseId: "00000000-0000-0000-0000-000000000000"
  }), /expected MR_SIAVASH_AI database/);
  const missingAccess = { ...settings, bindings: settings.bindings.filter(x => x.name !== "CF_ACCESS_AUD") };
  assert.throws(() => buildVersionMetadata(missingAccess, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f"
  }), /CF_ACCESS_AUD/);
});

test("Workers AI binding is strictly opt-in and uses the reviewed default model", () => {
  const disabled = buildVersionMetadata(settings, { expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f" });
  assert.equal(disabled.bindings.some(x => x.name === "AI"), false);
  assert.equal(disabled.bindings.some(x => x.name === "SUPPORT_RETENTION_DAYS"), false);
  const enabled = buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    enableWorkersAI: true
  });
  assert.ok(enabled.bindings.some(x => x.name === "AI" && x.type === "ai"));
  assert.equal(enabled.bindings.find(x => x.name === "AI_MODEL").text, "@cf/zai-org/glm-4.7-flash");
});

test("support retention is opt-in and validates the selected period", () => {
  assert.throws(() => buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    enableSupportRetention: true,
    retentionDays: 7
  }), /between 30 and 365/);
  const enabled = buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    enableSupportRetention: true,
    retentionDays: 180
  });
  assert.equal(enabled.bindings.find(x => x.name === "SUPPORT_RETENTION_DAYS").text, "180");
});

test("production upload includes the complete Worker module graph", async () => {
  const form = buildWorkerUploadForm({ main_module: "index.js" }, {
    indexSource: 'import { createAssistantProvider } from "./assistant-provider.js";',
    assistantProviderSource: "export function createAssistantProvider() {}"
  });
  const files = form.getAll("files");
  assert.equal(files.length, 2);
  assert.deepEqual(files.map(file => file.name), ["index.js", "assistant-provider.js"]);
  assert.match(await files[0].text(), /assistant-provider\.js/);
  assert.match(await files[1].text(), /createAssistantProvider/);
});

test("production upload rejects an incomplete Worker module graph", () => {
  assert.throws(() => buildWorkerUploadForm({}, { indexSource: "export default {}" }), /provider module source is required/);
});

test("cron schedule merge preserves existing schedules and adds retention once", () => {
  assert.deepEqual(mergeCronSchedules([{ cron: "15 * * * *" }]), [
    { cron: "15 * * * *" },
    { cron: "0 3 * * *" }
  ]);
  assert.deepEqual(mergeCronSchedules([{ cron: "0 3 * * *" }]), [{ cron: "0 3 * * *" }]);
});

test("explicit opt-out removes pre-existing AI and retention bindings", () => {
  const previouslyEnabled = {
    ...settings,
    bindings: [
      ...settings.bindings,
      { name: "AI", type: "ai" },
      { name: "AI_MODEL", type: "plain_text", text: "@cf/zai-org/glm-4.7-flash" },
      { name: "SUPPORT_RETENTION_DAYS", type: "plain_text", text: "90" }
    ]
  };
  const disabled = buildVersionMetadata(previouslyEnabled, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f"
  });
  assert.equal(disabled.bindings.some(x => x.name === "AI"), false);
  assert.equal(disabled.bindings.some(x => x.name === "AI_MODEL"), false);
  assert.equal(disabled.bindings.some(x => x.name === "SUPPORT_RETENTION_DAYS"), false);
});

test("retention opt-out removes only its cleanup cron and preserves unrelated schedules", () => {
  assert.deepEqual(configureCronSchedules([
    { cron: "15 * * * *" },
    { cron: "0 3 * * *" }
  ], false), [{ cron: "15 * * * *" }]);
  assert.deepEqual(configureCronSchedules([{ cron: "15 * * * *" }], true), [
    { cron: "15 * * * *" },
    { cron: "0 3 * * *" }
  ]);
});

test("validation-only production release performs reads and never uploads or changes traffic", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const method = init.method || "GET";
    calls.push({ path, method });
    let result;
    if (path.endsWith("/settings")) result = settings;
    else if (path.endsWith("/deployments")) result = { deployments: [{ versions: [{ version_id: "previous-version", percentage: 100 }] }] };
    else if (path.endsWith("/schedules")) result = { schedules: [] };
    else throw new Error("Unexpected Cloudflare API path: " + path);
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  const result = await releaseProductionWorker({
    token: "test-token",
    accountId: "ae50292f7e60c0d6d0052727e61c4033",
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    deploy: false,
    fetchImpl
  });
  assert.equal(result.validated, true);
  assert.equal(result.deployed, false);
  assert.ok(calls.every(call => call.method === "GET"));
  assert.ok(calls.every(call => !call.path.endsWith("/versions")));
  assert.ok(calls.every(call => !call.path.endsWith("/deployments") || call.method === "GET"));
});

test("production deployment refuses a missing or invalid source commit before Cloudflare access", async () => {
  let calls = 0;
  await assert.rejects(releaseProductionWorker({
    token: "test-token",
    accountId: "ae50292f7e60c0d6d0052727e61c4033",
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    deploy: true,
    commitSha: "not-a-commit",
    fetchImpl: async () => {
      calls += 1;
      throw new Error("Cloudflare must not be called");
    }
  }), /exact 40-character Git commit SHA/);
  assert.equal(calls, 0);
});

test("secret values are not copied into uploaded version metadata", () => {
  const metadata = buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f"
  });
  assert.doesNotMatch(JSON.stringify(metadata), /PRIVATE_TOKEN|secret-value-never-copy/);
  assert.ok(metadata.keep_bindings.includes("secret_text"));
});

test("production release smoke follows the explicit support-retention selection", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("./deploy-production-worker.mjs", import.meta.url), "utf8");
  assert.match(source, /enableSupportRetention \? 400 : 503/);
  assert.match(source, /support_retention_required/);
  assert.match(source, /consent_required/);
  assert.match(source, /ready\.body\.features\?\.publicSupport !== enableSupportRetention/);
  assert.match(source, /supportRetentionDays !== retentionDays/);
  assert.match(source, /smokeProduction\(fetchImpl, \{ enableWorkersAI, enableSupportRetention, retentionDays \}\)/);
});

test("production workflow gates deploy=true to main before Cloudflare release access", async () => {
  const workflow = await (await import("node:fs/promises")).readFile(
    new URL("../.github/workflows/gateway-production.yml", import.meta.url),
    "utf8"
  );
  const guardPosition = workflow.indexOf("Require main as the production deployment source");
  const cloudflarePosition = workflow.indexOf("Validate production bindings and optionally release");

  assert.ok(guardPosition >= 0, "production workflow must include the main-ref guard");
  assert.ok(cloudflarePosition > guardPosition, "main-ref guard must run before the Cloudflare release step");
  assert.match(workflow, /if: \$\{\{ inputs\.deploy \}\}/);
  assert.match(workflow, /if \[\[ "\$\{GITHUB_REF\}" != "refs\/heads\/main" \]\]/);
});


test("production module smoke waits for transient edge propagation before accepting the new route", async () => {
  let calls = 0;
  const waits = [];
  const expected = { items: Array.from({ length: 9 }, (_, index) => ({ id: "module-" + index })) };
  const result = await waitForModulesRoute(async url => {
    assert.equal(url, "https://gateway.example.test/v1/modules");
    calls += 1;
    if (calls < 3) return new Response(JSON.stringify({ error: { code: "not_found" } }), { status: 404 });
    return new Response(JSON.stringify(expected), { status: 200 });
  }, "https://gateway.example.test", {
    attempts: 4,
    intervalMs: 2000,
    sleepImpl: async milliseconds => waits.push(milliseconds)
  });

  assert.deepEqual(result, expected);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [2000, 2000]);
});

test("production module propagation check fails closed when the route never appears", async () => {
  let calls = 0;
  await assert.rejects(waitForModulesRoute(async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: { code: "not_found" } }), { status: 404 });
  }, "https://gateway.example.test", {
    attempts: 3,
    intervalMs: 0,
    sleepImpl: async () => {}
  }), /did not become ready after 3 checks/);
  assert.equal(calls, 3);
});

test("production module propagation check does not retry authorization failures", async () => {
  let calls = 0;
  await assert.rejects(waitForModulesRoute(async () => {
    calls += 1;
    return new Response("Forbidden", { status: 403 });
  }, "https://gateway.example.test", {
    attempts: 5,
    intervalMs: 0,
    sleepImpl: async () => {}
  }), /unexpected HTTP 403/);
  assert.equal(calls, 1);
});

test("production module propagation check rejects an incorrect module contract", async () => {
  await assert.rejects(waitForModulesRoute(async () => new Response(JSON.stringify({
    items: [{ id: "only-one" }]
  }), { status: 200 }), "https://gateway.example.test", {
    attempts: 2,
    intervalMs: 0,
    sleepImpl: async () => {}
  }), /nine-module contract/);
});
