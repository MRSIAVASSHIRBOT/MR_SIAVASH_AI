import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertPreviewVersionMetadata } from "./verify-preview-version.mjs";
import { PAGES_PUBLIC_ASSETS, normalizePagesBaseUrl, verifyPagesPublication } from "./verify-pages-publication.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

test("GitHub Pages deploys after successful main pushes and supports manual dispatch", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(
    workflow,
    /if:\s*github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)/,
  );
  assert.match(workflow, /needs:\s*quality/);
});

test("Preview release accepts the established Cloudflare secret name and legacy alias", () => {
  assert.match(previewWorkflow, /secrets\.CLOUDFLARE_API_TOKEN \|\| secrets\.CF_API_TOKEN/);
  assert.match(previewWorkflow, /Missing gateway-preview secret CLOUDFLARE_API_TOKEN or CF_API_TOKEN/);
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
  assert.match(previewWorkflow, /assistant\.payload\?\.mode !== "ai_grounded"/);
  assert.match(previewWorkflow, /steps\.deploy_preview\.outcome != 'skipped'/);
  assert.match(previewWorkflow, /gateway-preview-rollback\.json/);
  assert.match(previewWorkflow, /Automatic rollback after failed Preview acceptance/);
});


test("Preview release documentation matches the deployed AI-enabled release contract", () => {
  assert.match(previewWorkflow, /assistant\.payload\?\.mode !== "ai_grounded"/);
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
  assert.ok(previewWorkflow.includes("timeoutMs: 75000"), "manual Preview release must define a 75-second assistant timeout");
  const recurringAssistantCurl = previewSmokeWorkflow
    .split(/\r?\n/)
    .find(line => line.includes('body="$(curl') && line.includes("/v1/assistant/chat"));

  assert.ok(recurringAssistantCurl, "recurring Preview smoke must have an assistant request");
  assert.match(recurringAssistantCurl, /--connect-timeout 10 --max-time 75/);
  assert.doesNotMatch(previewWorkflow.slice(
    previewWorkflow.indexOf("assistant.workers-ai"),
    previewWorkflow.indexOf("Roll back Preview traffic"),
  ), /retry/i);
  assert.doesNotMatch(recurringAssistantCurl, /--retry/);
});


test("Workers AI response deadline fits the Preview and browser request budgets without retries", () => {
  const defaultLine = assistantProvider.split("\n").find(line => line.includes("DEFAULT_REQUEST_TIMEOUT_MS ="));
  const maximumLine = assistantProvider.split("\n").find(line => line.includes("MAX_REQUEST_TIMEOUT_MS ="));
  const browserLine = supportClient.split("\n").find(line => line.includes("ASSISTANT_REQUEST_TIMEOUT_MS ="));
  const releaseLine = previewWorkflow.split("\n").find(line => line.includes("timeoutMs: 75000"));
  const smokeLine = previewSmokeWorkflow.split("\n").find(line => line.includes('$BASE_URL/v1/assistant/chat'));

  assert.ok(defaultLine);
  assert.ok(maximumLine);
  assert.ok(browserLine);
  assert.ok(releaseLine);
  assert.ok(smokeLine);

  const numericValue = line => Number(line.slice(line.indexOf("=") + 1).trim().replaceAll("_", "").replace(";", ""));
  const requestBudget = line => {
    const timeout = line.match(/timeoutMs:\s*(\d+)/);
    if (timeout) return Number(timeout[1]);
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

  assert.equal(defaultMs, 60_000);
  assert.equal(maximumMs, 60_000);
  assert.equal(browserMs, 80_000);
  assert.equal(releaseMs, 75_000);
  assert.equal(smokeMs, 75_000);
  assert.ok(maximumMs + 10_000 <= releaseMs);
  assert.ok(maximumMs + 15_000 <= browserMs);
  assert.match(releaseLine, /timeoutMs: 75000/);
  assert.match(smokeLine, /--connect-timeout 10/);
  assert.doesNotMatch(releaseLine, /retry/i);
  assert.doesNotMatch(smokeLine, /--retry/);
  assert.match(assistantProvider, /requestTimeout: true/);
  assert.match(assistantProvider, /cancellation: false/);
});


test("Preview release smoke checks report the exact failing contract without logging assistant content", () => {
  const smokeStart = previewWorkflow.indexOf("Verify deployed preview routes and grounded AI");
  const rollbackStart = previewWorkflow.indexOf("Roll back Preview traffic after failed deployment or smoke checks");
  assert.ok(smokeStart >= 0 && rollbackStart > smokeStart);
  const smoke = previewWorkflow.slice(smokeStart, rollbackStart);
  for (const check of [
    "health.live",
    "health.ready (D1 readiness)",
    "modules.catalog",
    "cors.preflight",
    "assistant.workers-ai",
    "HTTP ",
    "answerChars=",
    "sourceCount",
    "requestId",
    "AbortSignal.timeout",
  ]) assert.ok(smoke.includes(check), "diagnostic smoke must include " + check);
  assert.match(smoke, /function safeBody\(payload, raw\)/);
  assert.match(smoke, /process\.exit\(1\)/);
  assert.doesNotMatch(smoke, /console\.log\(JSON\.stringify\(assistant\.payload/);
  assert.doesNotMatch(smoke, /console\.log\(assistant\.payload\.answer/);
  assert.match(smoke, /redact\(raw\)/);
});

const previewCommitSha = "0123456789abcdef0123456789abcdef01234567";
const previewVersion = {
  id: "5c02fb2b-6d7a-4aed-a3ff-2b0cfeb05f9c",
  number: 10,
  annotations: {
    "workers/tag": previewCommitSha,
    "workers/message": "Preview release from commit " + previewCommitSha,
  },
};

test("Preview version metadata accepts the exact GitHub commit tag and release message", () => {
  assert.doesNotThrow(() => assertPreviewVersionMetadata(previewVersion, previewCommitSha));
});

test("Preview version metadata rejects a tag from a different commit", () => {
  const version = { ...previewVersion, annotations: { ...previewVersion.annotations, "workers/tag": "fedcba9876543210fedcba9876543210fedcba98" } };
  assert.throws(() => assertPreviewVersionMetadata(version, previewCommitSha), /tag does not match/i);
});

test("Preview version metadata rejects a message that does not identify the deployed commit", () => {
  const version = { ...previewVersion, annotations: { ...previewVersion.annotations, "workers/message": "Preview release" } };
  assert.throws(() => assertPreviewVersionMetadata(version, previewCommitSha), /message does not match/i);
});

test("Preview version metadata rejects absent annotations and malformed GitHub SHAs", () => {
  assert.throws(() => assertPreviewVersionMetadata({ id: previewVersion.id }, previewCommitSha), /tag does not match/i);
  assert.throws(() => assertPreviewVersionMetadata(previewVersion, "not-a-full-sha"), /40-character Git commit SHA/i);
});

test("Preview deployment passes and verifies the exact GitHub source SHA", () => {
  const deployStart = previewWorkflow.indexOf("Deploy preview Worker");
  const verifyStart = previewWorkflow.indexOf("Verify preview version source metadata");
  const rollbackStart = previewWorkflow.indexOf("Roll back Preview traffic after failed deployment or smoke checks");
  assert.ok(deployStart >= 0 && verifyStart > deployStart && rollbackStart > verifyStart);
  const deployStep = previewWorkflow.slice(deployStart, verifyStart);
  const verifyStep = previewWorkflow.slice(verifyStart, rollbackStart);
  assert.match(deployStep, /GITHUB_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(deployStep, /--tag\s+"\$GITHUB_SHA"/);
  assert.match(deployStep, /--message\s+"Preview release from commit \$GITHUB_SHA"/);
  assert.match(verifyStep, /GITHUB_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(verifyStep, /assertPreviewVersionMetadata\(/);
  assert.match(verifyStep, /find\(item => item\.percentage === 100\)/);
  assert.match(verifyStep, /get\(worker \+ "\/versions\/" \+ activeVersion\.version_id\)/);
});


test("manual Pages deployment verifies every public asset against the checked-out commit", () => {
  const deployStart = workflow.indexOf("Deploy website");
  const verifyStart = workflow.indexOf("Verify published static assets match this commit");
  assert.ok(deployStart >= 0 && verifyStart > deployStart);
  const verifyStep = workflow.slice(verifyStart);
  assert.match(verifyStep, /PAGES_URL:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/);
  assert.match(verifyStep, /PAGES_SOURCE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(verifyStep, /node scripts\/verify-pages-publication\.mjs/);
  assert.deepEqual(PAGES_PUBLIC_ASSETS, ["support.js", "search-index.json", "site-search.js", "sw.js", "index.html", "learn.html", "projects.html", "knowledge.html", "contact.html", "404.html", "favicon.svg", "manifest.webmanifest", "assets/css/style.css", "assets/js/main.js"]);
});

test("Pages URL normalization requires HTTPS and preserves a project subpath", () => {
  assert.equal(
    normalizePagesBaseUrl("https://example.github.io/MR_SIAVASH_AI").href,
    "https://example.github.io/MR_SIAVASH_AI/",
  );
  assert.throws(() => normalizePagesBaseUrl("http://example.github.io/site"), /HTTPS/);
  assert.throws(() => normalizePagesBaseUrl("https://user:secret@example.github.io/site"), /credentials/);
});

test("Pages publication verification checks no-store responses against exact source bytes", async () => {
  const sourceDir = fileURLToPath(new URL("../", import.meta.url));
  const expectedSha = "0123456789abcdef0123456789abcdef01234567";
  const requests = [];

  const results = await verifyPagesPublication({
    baseUrl: "https://example.github.io/MR_SIAVASH_AI",
    sourceDir,
    expectedSha,
    attempts: 1,
    fetchImpl: async (input, options) => {
      const url = new URL(input);
      const asset = url.pathname.split("/MR_SIAVASH_AI/").at(-1);
      requests.push({ asset, cache: options.cache, verify: url.searchParams.get("verify") });
      return new Response(await readFile(join(sourceDir, asset)), { status: 200 });
    },
  });

  assert.equal(results.length, 14);
  assert.ok(results.every(result => result.status === 200 && /^[a-f0-9]{64}$/.test(result.sha256)));
  assert.deepEqual(requests.map(request => request.asset).sort(), [...PAGES_PUBLIC_ASSETS].sort());
  assert.ok(requests.every(request => request.cache === "no-store" && request.verify === expectedSha));
});

test("Pages publication verification retries stale CDN content and accepts the matching release", async () => {
  const sourceDir = fileURLToPath(new URL("../", import.meta.url));
  const expectedSha = "0123456789abcdef0123456789abcdef01234567";
  let waits = 0;

  const results = await verifyPagesPublication({
    baseUrl: "https://example.github.io/MR_SIAVASH_AI/",
    sourceDir,
    expectedSha,
    attempts: 2,
    retryDelayMs: 0,
    wait: async () => { waits += 1; },
    fetchImpl: async (input) => {
      const url = new URL(input);
      const asset = url.pathname.split("/MR_SIAVASH_AI/").at(-1);
      if (asset === "sw.js" && url.searchParams.get("attempt") === "1") {
        return new Response("stale cache", { status: 200 });
      }
      return new Response(await readFile(join(sourceDir, asset)), { status: 200 });
    },
  });

  assert.equal(waits, 1);
  assert.equal(results.length, 14);
});

test("Pages publication verification fails closed when a public asset remains stale", async () => {
  const sourceDir = fileURLToPath(new URL("../", import.meta.url));
  await assert.rejects(
    verifyPagesPublication({
      baseUrl: "https://example.github.io/MR_SIAVASH_AI/",
      sourceDir,
      expectedSha: "0123456789abcdef0123456789abcdef01234567",
      attempts: 2,
      retryDelayMs: 0,
      wait: async () => {},
      fetchImpl: async () => new Response("stale asset", { status: 200 }),
    }),
    /publication verification failed.*SHA-256 mismatch/i,
  );
});
