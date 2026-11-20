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
    .split("\\n")
    .find(line => line.includes('assistant="$(curl'));
  const recurringAssistantCurl = previewSmokeWorkflow
    .split("\\n")
    .find(line => line.includes('body="$(curl') && line.includes("/v1/assistant/chat"));

  assert.ok(manualAssistantCurl, "manual Preview release must have an assistant request");
  assert.ok(recurringAssistantCurl, "recurring Preview smoke must have an assistant request");
  assert.match(manualAssistantCurl, /--max-time 45/);
  assert.match(recurringAssistantCurl, /--max-time 45/);
});
