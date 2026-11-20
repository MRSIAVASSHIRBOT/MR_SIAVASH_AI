import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);
const previewWorkflow = await readFile(
  new URL("../.github/workflows/gateway-preview.yml", import.meta.url),
  "utf8",
);

const previewSmokeWorkflow = await readFile(
  new URL("../.github/workflows/gateway-preview-smoke.yml", import.meta.url),
  "utf8",
);
const previewReleaseDoc = await readFile(
  new URL("../cloudflare/gateway/PREVIEW_RELEASE.md", import.meta.url),
  "utf8",
);
const assistantProvider = await readFile(
  new URL("../cloudflare/gateway/src/assistant-provider.js", import.meta.url),
  "utf8",
);
const supportClient = await readFile(
  new URL("../support.js", import.meta.url),
  "utf8",
);

test("GitHub Pages publication is manual-only while quality checks stay on push", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(
    workflow,
    /if:\s*github\.ref == 'refs\/heads\/main' && github\.event_name == 'workflow_dispatch'/,
  );
  assert.doesNotMatch(workflow, /github\.event_name != 'pull_request'/);
});

test("Preview keeps dashboard-managed admin variables while explicitly binding Workers AI", () => {
  assert.match(previewWorkflow, /keep_vars:\s*true/);
  assert.match(previewWorkflow, /ai:\s*\{\s*binding:\s*"AI"\s*\}/);
  assert.match(previewWorkflow, /AI_MODEL:\s*"@cf\/zai-org\/glm-4\.7-flash"/);
  assert.match(previewWorkflow, /SUPPORT_RETENTION_DAYS:\s*"90"/);
  for (const name of ["ADMIN_EMAILS", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD"]) {
    assert.ok(previewWorkflow.includes(name), "preview must verify preserved " + name);
  }
});

test("Preview applies and verifies both additive D1 migrations before deploying its Worker", () => {
  const migrationStep = previewWorkflow.indexOf("Apply migrations to preview database only");
  const verificationStep = previewWorkflow.indexOf("Verify preview D1 migration contract");
  const deploymentStep = previewWorkflow.indexOf("Deploy preview Worker");
  assert.ok(migrationStep >= 0 && verificationStep > migrationStep && deploymentStep > verificationStep);
  assert.match(previewWorkflow, /0004_support_retention_runs\.sql/);
  assert.match(previewWorkflow, /0005_support_ticket_status_history\.sql/);
  assert.match(previewWorkflow, /PREVIEW_D1_DATABASE_ID/);
  assert.doesNotMatch(previewWorkflow, /87c15170-7995-4929-b00c-20b5b491c05f/);
  assert.match(previewWorkflow, /mr-siavash-ai-preview --remote/);
});

test("Preview acceptance requires grounded AI output and has an automatic traffic rollback", () => {
  assert.match(previewWorkflow, /mode!=="ai_grounded"/);
  assert.match(previewWorkflow, /steps\.deploy_preview\.outcome != 'skipped'/);
  assert.match(previewWorkflow, /gateway-preview-rollback\.json/);
  assert.match(previewWorkflow, /Automatic rollback after failed Preview acceptance/);
});


test("Preview release documentation matches the deployed AI-enabled release contract", () => {
  assert.match(previewWorkflow, /if\(x\.mode!==\"ai_grounded\"/);
  assert.match(
    previewSmokeWorkflow,
    /const supportedMode=x\.mode===\"ai_grounded\"\|\|x\.mode===\"knowledge_fallback\"/,
  );
  assert.match(previewReleaseDoc, /Workers AI binding `AI`/);
  assert.match(previewReleaseDoc, /AI_MODEL/);
  assert.match(previewReleaseDoc, /migrations 0001–0005/);
  assert.match(previewReleaseDoc, /one successful `ai_grounded` response/);
  assert.match(previewReleaseDoc, /accepts both `ai_grounded` and `knowledge_fallback`/);
  assert.doesNotMatch(previewReleaseDoc, /No AI binding or service token is configured/);
});

test("recurring Preview assistant smoke matches the manual release inference timeout budget", () => {
  const manualAssistantCurl = previewWorkflow
    .split(/\r?\n/)
    .find(line => line.includes('assistant="$(curl'));
  const recurringAssistantCurl = previewSmokeWorkflow
    .split(/\r?\n/)
    .find(line => line.includes('body="$(curl') && line.includes("/v1/assistant/chat"));

  assert.ok(manualAssistantCurl, "manual Preview release must have an assistant request");
  assert.ok(recurringAssistantCurl, "recurring Preview smoke must have an assistant request");
  assert.match(manualAssistantCurl, /--connect-timeout 10 --max-time 75/);
  assert.match(recurringAssistantCurl, /--connect-timeout 10 --max-time 75/);
  assert.doesNotMatch(manualAssistantCurl, /--retry/);
  assert.doesNotMatch(recurringAssistantCurl, /--retry/);
});


test("Workers AI response deadline fits the Preview and browser request budgets without retries", () => {
  const defaultLine = assistantProvider.split("\n").find(line => line.includes("DEFAULT_REQUEST_TIMEOUT_MS ="));
  const maximumLine = assistantProvider.split("\n").find(line => line.includes("MAX_REQUEST_TIMEOUT_MS ="));
  const browserLine = supportClient.split("\n").find(line => line.includes("ASSISTANT_REQUEST_TIMEOUT_MS ="));
  const releaseLine = previewWorkflow.split("\n").find(line => line.includes('$BASE_URL/v1/assistant/chat'));
  const smokeLine = previewSmokeWorkflow.split("\n").find(line => line.includes('$BASE_URL/v1/assistant/chat'));

  assert.ok(defaultLine);
  assert.ok(maximumLine);
  assert.ok(browserLine);
  assert.ok(releaseLine);
  assert.ok(smokeLine);

  const numericValue = line => Number(line.slice(line.indexOf("=") + 1).trim().replaceAll("_", "").replace(";", ""));
  const requestBudget = line => {
    const marker = "--max-time ";
    const start = line.indexOf(marker);
    assert.notEqual(start, -1, "assistant request must declare a maximum duration");
    return Number(line.slice(start + marker.length).split(/\s/, 1)[0]) * 1000;
  };

  const defaultMs = numericValue(defaultLine);
  const maximumMs = numericValue(maximumLine);
  const browserMs = numericValue(browserLine);
  const releaseMs = requestBudget(releaseLine);
  const smokeMs = requestBudget(smokeLine);

  assert.equal(defaultMs, 25_000);
  assert.equal(maximumMs, 30_000);
  assert.equal(browserMs, 80_000);
  assert.equal(releaseMs, 75_000);
  assert.equal(smokeMs, 75_000);
  assert.ok(maximumMs + 10_000 <= releaseMs);
  assert.ok(maximumMs + 10_000 <= smokeMs);
  assert.ok(maximumMs + 20_000 <= browserMs);
  assert.match(releaseLine, /--connect-timeout 10/);
  assert.match(smokeLine, /--connect-timeout 10/);
  assert.doesNotMatch(releaseLine, /--retry/);
  assert.doesNotMatch(smokeLine, /--retry/);
  assert.match(assistantProvider, /requestTimeout: true/);
  assert.match(assistantProvider, /cancellation: false/);
});
