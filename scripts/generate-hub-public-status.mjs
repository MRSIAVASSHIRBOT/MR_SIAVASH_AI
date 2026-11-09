import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_RESPONSE_BYTES = 128 * 1024;
export const HUB_REPOSITORY_URL = "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI";
const API_ROOT = "https://api.github.com/repos/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI";
const RUNTIME_BOUNDARY = "این پنل فقط فراداده عمومی مخزن و CI را نشان می‌دهد؛ سلامت اجرای محلی Hub را بررسی نمی‌کند.";
const ALLOWED_STATUSES = new Set(["queued", "in_progress", "completed"]);
const ALLOWED_CONCLUSIONS = new Set([
  "success", "failure", "cancelled", "skipped", "timed_out",
  "action_required", "neutral", "stale", null,
]);

function validIsoDate(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function safeRepositoryUrl(value, expectedPrefix) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(expectedPrefix)
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function readBoundedResponse(response) {
  const reader = response.body && typeof response.body.getReader === "function"
    ? response.body.getReader()
    : null;
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error("upstream_response_too_large");
    }
    return text;
  }

  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      totalBytes += part.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch { /* The stream may already be closed. */ }
        throw new Error("upstream_response_too_large");
      }
      chunks.push(part.value);
    }
  } finally {
    if (typeof reader.releaseLock === "function") reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function fetchPublicJson(url, fetchImpl) {
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "MR_SIAVASH_AI-public-status",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });
    if (!response || !response.ok) throw new Error("upstream_unavailable");
    const contentType = response.headers && response.headers.get("content-type") || "";
    if (!/^application\/(?:json|vnd\.github\+json)(?:\s*;|$)/i.test(contentType)) {
      throw new Error("upstream_content_type_invalid");
    }
    return JSON.parse(await readBoundedResponse(response));
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCommit(raw) {
  const sha = raw && raw.sha;
  const committedAt = validIsoDate(raw && raw.commit && raw.commit.author && raw.commit.author.date);
  const url = safeRepositoryUrl(
    raw && raw.html_url,
    "/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/commit/",
  );
  if (
    typeof sha !== "string" ||
    !/^[a-f0-9]{40}$/i.test(sha) ||
    !committedAt ||
    !url ||
    !url.endsWith("/" + sha)
  ) return null;
  return { short_sha: sha.slice(0, 7), committed_at: committedAt, url };
}

function normalizeCiRun(raw, latestCommitSha) {
  if (!raw || raw.name !== "CI" || raw.head_branch !== "main") return null;
  const headSha = raw.head_sha;
  const updatedAt = validIsoDate(raw.updated_at);
  const url = safeRepositoryUrl(
    raw.html_url,
    "/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/actions/runs/",
  );
  if (
    typeof headSha !== "string" ||
    !/^[a-f0-9]{40}$/i.test(headSha) ||
    !updatedAt ||
    !url ||
    !/^\/MRSIAVASSHIRBOT\/MR_SIAVASH_HUB_AI\/actions\/runs\/[0-9]+$/.test(new URL(url).pathname)
  ) return null;

  const status = ALLOWED_STATUSES.has(raw.status) ? raw.status : "unknown";
  const conclusion = ALLOWED_CONCLUSIONS.has(raw.conclusion) ? raw.conclusion : null;
  return {
    name: "CI",
    status,
    conclusion,
    updated_at: updatedAt,
    url,
    short_sha: headSha.slice(0, 7),
    matches_latest_commit: Boolean(latestCommitSha && headSha === latestCommitSha),
  };
}

function generatedTimestamp(now) {
  const value = typeof now === "function" ? now() : now;
  return value instanceof Date && Number.isFinite(value.getTime())
    ? value.toISOString()
    : new Date().toISOString();
}

export async function buildHubPublicStatus({
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const [commitResult, runsResult] = await Promise.allSettled([
    fetchPublicJson(API_ROOT + "/commits/main", fetchImpl),
    fetchPublicJson(API_ROOT + "/actions/runs?branch=main&per_page=10", fetchImpl),
  ]);

  const commitRaw = commitResult.status === "fulfilled" ? commitResult.value : null;
  const latestCommit = normalizeCommit(commitRaw);
  const runsRaw = runsResult.status === "fulfilled" ? runsResult.value : null;
  const workflowRuns = runsRaw && Array.isArray(runsRaw.workflow_runs)
    ? runsRaw.workflow_runs
    : [];
  const latestCiRaw = workflowRuns.find(run => run && run.name === "CI" && run.head_branch === "main");
  const latestCi = normalizeCiRun(latestCiRaw, latestCommit ? commitRaw.sha : null);

  const hasPublicData = Boolean(latestCommit || latestCi);
  return {
    schema: "mr-siavash-hub-public-status",
    version: 1,
    generated_at: generatedTimestamp(now),
    source: hasPublicData ? "github-public-api" : "repository-fallback",
    project: {
      name: "MR_SIAVASH_HUB_AI",
      repository_url: HUB_REPOSITORY_URL,
      default_branch: "main",
    },
    repository: {
      state: latestCommit ? "available" : "unavailable",
      latest_commit: latestCommit,
    },
    quality: {
      state: latestCi ? "available" : "unavailable",
      latest_ci: latestCi,
    },
    runtime: {
      state: "not_connected",
      detail: RUNTIME_BOUNDARY,
    },
  };
}

export async function writeHubPublicStatus({
  filePath = resolve(process.cwd(), "hub-status.json"),
  ...options
} = {}) {
  const status = await buildHubPublicStatus(options);
  await writeFile(filePath, JSON.stringify(status, null, 2) + "\n", "utf8");
  return status;
}

const invokedDirectly = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  const status = await writeHubPublicStatus();
  console.log("Generated public Hub metadata snapshot: " + status.source);
}
