import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [architecture,gatewayReadme,backendGuide,roadmap,security,adminPage,workerSource,releaseWorkflow,releaseScript] = await Promise.all([
  readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare/gateway/README.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/backend/README.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/ROADMAP.md", import.meta.url), "utf8"),
  readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
  readFile(new URL("../admin-support.html", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare/gateway/src/index.js", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/gateway-production.yml", import.meta.url), "utf8"),
  readFile(new URL("../scripts/deploy-production-worker.mjs", import.meta.url), "utf8")
]);

test("production documentation distinguishes deployed routes from current source and preview", () => {
  for (const doc of [architecture, gatewayReadme, backendGuide, roadmap, security]) {
    assert.match(doc, /production Worker/i);
    assert.match(doc, /preview Worker/i);
    assert.match(doc, /Workers AI/i);
    assert.match(doc, /retention/i);
  }
  assert.match(gatewayReadme, /100% of production traffic/);
  assert.match(gatewayReadme, /version 12/);
  assert.match(gatewayReadme, /mode: ai_grounded/);
  assert.match(gatewayReadme, /GET \/v1\/modules/);
  assert.match(gatewayReadme, /POST.*v1\/support\/tickets/);
  assert.match(gatewayReadme, /explicit privacy acknowledgement/i);
  assert.match(gatewayReadme, /Verified production state — 2026-11-10/);
  assert.match(gatewayReadme, /SUPPORT_RETENTION_DAYS=90/);
  assert.match(gatewayReadme, /daily `0 3 \* \* \*` UTC schedule/);
  assert.match(gatewayReadme, /Preview Worker traffic is at 100%/);
  assert.match(gatewayReadme, /\`AI\` \(Workers AI\)/);
  assert.match(roadmap, /66ccb720-01cb-43e0-9b14-6d1500fa2581/);
  assert.match(roadmap, /971a5e702876a0bc78b19c55b8b0daf358471c5b/);
  assert.match(roadmap, /Production release workflow run `42801780384` completed successfully/);
  assert.match(roadmap, /real Workers AI request that returned `mode: ai_grounded`/);
  assert.doesNotMatch(gatewayReadme, /Production has no Workers AI binding/i);
  assert.doesNotMatch(roadmap, /production environment has no scheduled retention cron or Workers AI binding/i);
  assert.doesNotMatch(roadmap, /future production support-retention choice remains 30 days/i);
});

test("production release is manual, read-only by default and guarded by exact resource checks", () => {
  assert.match(releaseWorkflow, /workflow_dispatch/);
  assert.match(releaseWorkflow, /default: false/);
  assert.match(releaseWorkflow, /environment: cloudflare-production/);
  assert.match(releaseScript, /expected production D1 database/i);
  assert.match(releaseScript, /CF_ACCESS_AUD/);
  assert.match(releaseScript, /previousVersions/);
  assert.match(releaseScript, /Automatic rollback/);
  assert.match(releaseScript, /redact_query_string/);
  assert.match(releaseWorkflow, /enable_support_retention/);
  assert.match(releaseWorkflow, /ENABLE_SUPPORT_RETENTION:.*inputs\.enable_support_retention/);
  assert.match(releaseWorkflow, /SUPPORT_RETENTION_DAYS:.*inputs\.retention_days/);
  assert.match(releaseWorkflow, /default: "90"/);
  assert.match(releaseWorkflow, /enable_workers_ai/);
});

test("production retention cleanup is explicit opt-in and scheduled handler is tested", () => {
  assert.match(workerSource, /async function cleanupExpiredRecords/);
  assert.match(workerSource, /SUPPORT_RETENTION_DAYS/);
  assert.match(workerSource, /must be explicitly configured between 30 and 365/);
  assert.match(workerSource, /async scheduled\\((?:_controller|controller),env\\)/);
  assert.match(releaseScript, /enableSupportRetention/);
});

test("production admin entry links to the Access-protected Worker console", () => {
  assert.match(adminPage, /noindex,nofollow/);
  assert.match(adminPage, /workers\.dev\/admin/);
  assert.match(adminPage, /Cloudflare Access/);
  assert.doesNotMatch(adminPage, /support-admin\.js|\/v1\/admin\//);
});
