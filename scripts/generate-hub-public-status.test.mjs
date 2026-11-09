import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHubPublicStatus,
  HUB_REPOSITORY_URL,
  MAX_RESPONSE_BYTES,
} from "./generate-hub-public-status.mjs";

const commitSha = "a".repeat(40);
const ciUrl = "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/actions/runs/123";
const commitUrl = "https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/commit/" + commitSha;

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

test("public Hub snapshot exposes only allowlisted repository and CI metadata", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    assert.equal(options.headers.Authorization, undefined);
    if (String(url).endsWith("/commits/main")) {
      return jsonResponse({
        sha: commitSha,
        html_url: commitUrl,
        commit: { author: { date: "2026-11-09T10:00:00Z", name: "private author" }, message: "private commit message" },
        author: { login: "private-login" },
      });
    }
    return jsonResponse({
      workflow_runs: [
        {
          name: "OpenCode Agent",
          head_branch: "main",
          head_sha: commitSha,
          status: "completed",
          conclusion: "failure",
          updated_at: "2026-11-09T10:01:00Z",
          html_url: ciUrl,
        },
        {
          name: "CI",
          head_branch: "main",
          head_sha: commitSha,
          status: "completed",
          conclusion: "success",
          updated_at: "2026-11-09T10:02:00Z",
          html_url: ciUrl,
          actor: { login: "private-login" },
        },
      ],
    });
  };

  const result = await buildHubPublicStatus({
    fetchImpl,
    now: () => new Date("2026-11-09T10:03:00Z"),
  });

  assert.equal(result.schema, "mr-siavash-hub-public-status");
  assert.equal(result.version, 1);
  assert.equal(result.generated_at, "2026-11-09T10:03:00.000Z");
  assert.equal(result.source, "github-public-api");
  assert.equal(result.project.repository_url, HUB_REPOSITORY_URL);
  assert.equal(result.repository.state, "available");
  assert.equal(result.repository.latest_commit.short_sha, "aaaaaaa");
  assert.equal(result.repository.latest_commit.url, commitUrl);
  assert.equal(result.quality.state, "available");
  assert.equal(result.quality.latest_ci.name, "CI");
  assert.equal(result.quality.latest_ci.conclusion, "success");
  assert.equal(result.quality.latest_ci.matches_latest_commit, true);
  assert.equal(result.runtime.state, "not_connected");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.startsWith("https://api.github.com/repos/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/")));
  assert.doesNotMatch(JSON.stringify(result), /private author|private commit message|private-login|OPENROUTER_API_KEY/);
});

test("snapshot marks an older CI result as not matching the latest commit", async () => {
  const fetchImpl = async url => {
    if (String(url).endsWith("/commits/main")) {
      return jsonResponse({
        sha: commitSha,
        html_url: commitUrl,
        commit: { author: { date: "2026-11-09T10:00:00Z" } },
      });
    }
    return jsonResponse({
      workflow_runs: [{
        name: "CI",
        head_branch: "main",
        head_sha: "b".repeat(40),
        status: "in_progress",
        conclusion: null,
        updated_at: "2026-11-09T10:01:00Z",
        html_url: ciUrl,
      }],
    });
  };
  const result = await buildHubPublicStatus({ fetchImpl });
  assert.equal(result.repository.state, "available");
  assert.equal(result.quality.latest_ci.matches_latest_commit, false);
});

test("unavailable or oversized public API responses fail closed to a metadata-only fallback", async () => {
  const unavailable = await buildHubPublicStatus({
    fetchImpl: async () => { throw new Error("network detail must not escape"); },
  });
  assert.equal(unavailable.source, "repository-fallback");
  assert.equal(unavailable.repository.state, "unavailable");
  assert.equal(unavailable.quality.state, "unavailable");
  assert.equal(unavailable.runtime.state, "not_connected");
  assert.doesNotMatch(JSON.stringify(unavailable), /network detail|token|secret/i);

  const oversized = new Response("x".repeat(MAX_RESPONSE_BYTES + 1), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  const limited = await buildHubPublicStatus({ fetchImpl: async () => oversized.clone() });
  assert.equal(limited.source, "repository-fallback");
  assert.equal(limited.repository.latest_commit, null);
  assert.equal(limited.quality.latest_ci, null);
});
