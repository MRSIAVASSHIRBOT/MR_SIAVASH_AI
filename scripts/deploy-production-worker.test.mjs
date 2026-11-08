import test from "node:test";
import assert from "node:assert/strict";
import { buildVersionMetadata, mergeCronSchedules } from "./deploy-production-worker.mjs";

const settings = {
  compatibility_date: "2026-11-06",
  compatibility_flags: [],
  usage_model: "standard",
  bindings: [
    { name: "DB", type: "d1", database_id: "87c15170-7995-4929-b00c-20b5b491c05f" },
    { name: "ALLOWED_ORIGINS", type: "plain_text", text: "https://mrsiavasshirbot.github.io" },
    { name: "ADMIN_EMAILS", type: "plain_text", text: "admin@example.test" },
    { name: "CF_ACCESS_TEAM_DOMAIN", type: "plain_text", text: "team.example.cloudflareaccess.com" },
    { name: "CF_ACCESS_AUD", type: "plain_text", text: "audience-test" }
  ]
};

test("production release metadata pins the dedicated D1 and preserves Access bindings", () => {
  const metadata = buildVersionMetadata(settings, {
    expectedDatabaseId: "87c15170-7995-4929-b00c-20b5b491c05f",
    commitSha: "a".repeat(40),
    enableSupportRetention: true,
    retentionDays: 90
  });
  assert.equal(metadata.main_module, "index.js");
  assert.ok(metadata.bindings.some(x => x.name === "DB" && x.database_id === "87c15170-7995-4929-b00c-20b5b491c05f"));
  for (const name of ["ALLOWED_ORIGINS", "ADMIN_EMAILS", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "SUPPORT_RETENTION_DAYS"]) {
    assert.ok(metadata.bindings.some(x => x.name === name), name);
  }
  assert.deepEqual(metadata.keep_bindings, ["secret_text", "secret_key", "secrets_store_secret", "mtls_certificate"]);
  assert.equal(metadata.bindings.find(x => x.name === "SUPPORT_RETENTION_DAYS").text, "90");
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

test("cron schedule merge preserves existing schedules and adds retention once", () => {
  assert.deepEqual(mergeCronSchedules([{ cron: "15 * * * *" }]), [
    { cron: "15 * * * *" },
    { cron: "0 3 * * *" }
  ]);
  assert.deepEqual(mergeCronSchedules([{ cron: "0 3 * * *" }]), [{ cron: "0 3 * * *" }]);
});
