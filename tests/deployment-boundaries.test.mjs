import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const architecture = await readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8");
const gatewayReadme = await readFile(new URL("../cloudflare/gateway/README.md", import.meta.url), "utf8");
const security = await readFile(new URL("../SECURITY.md", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../admin-support.html", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../cloudflare/gateway/src/index.js", import.meta.url), "utf8");

test("production documentation distinguishes health checks from source-only product APIs", () => {
  for (const text of [architecture, gatewayReadme, security]) {
    assert.match(text, /health-only/i);
    assert.match(text, /support/i);
  }
  assert.match(architecture, /Automated HTTP smoke checks on 2026-11-08 passed/);
  assert.match(architecture, /not present in the deployed Worker bundle/);
  assert.match(architecture, /does not deploy the Cloudflare Worker/);
  assert.doesNotMatch(architecture, /independent HTTP runtime smoke test remains outstanding/);
});

test("admin page does not claim Access is enabled before production configuration", () => {
  assert.match(adminPage, /noindex,nofollow/);
  assert.match(adminPage, /هنوز در محیط تولید فعال نشده/);
  assert.match(adminPage, /Cloudflare Access نیز هنوز برای این حساب فعال نشده است/);
  assert.doesNotMatch(adminPage, /محافظت می‌شود/);
  assert.doesNotMatch(adminPage, /workers\.dev\/admin/);
});

test("repository source keeps administrator routes behind verified identity checks", () => {
  assert.match(workerSource, /async function adminIdentity/);
  assert.match(workerSource, /if\(!identity\)/);
  assert.match(workerSource, /admin_auth_required/);
});
