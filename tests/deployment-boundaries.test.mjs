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
  assert.match(gatewayReadme, /does \*\*not\*\* yet contain `GET \/v1\/modules`/);
  assert.match(gatewayReadme, /public support-ticket create\/read\/reply endpoints/);
  assert.match(gatewayReadme, /ticket submission and tracking disabled/i);
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
  assert.match(releaseWorkflow, /enable_workers_ai/);
});

test("production retention cleanup is explicit opt-in and scheduled handler is tested", () => {
  assert.match(workerSource, /async function cleanupExpiredRecords/);
  assert.match(workerSource, /SUPPORT_RETENTION_DAYS/);
  assert.match(workerSource, /async scheduled\(_controller,env\)/);
  assert.match(releaseScript, /enableSupportRetention/);
});

test("production admin entry links to the Access-protected Worker console", () => {
  assert.match(adminPage, /noindex,nofollow/);
  assert.match(adminPage, /workers\.dev\/admin/);
  assert.match(adminPage, /Cloudflare Access/);
  assert.doesNotMatch(adminPage, /support-admin\.js|\/v1\/admin\//);
});
