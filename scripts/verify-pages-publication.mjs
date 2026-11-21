import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PAGES_PUBLIC_ASSETS = Object.freeze([
  "support.js",
  "search-index.json",
  "site-search.js",
  "sw.js",
  "index.html",
  "learn.html",
  "projects.html",
  "knowledge.html",
  "contact.html",
  "404.html",
  "favicon.svg",
  "manifest.webmanifest",
  "assets/css/style.css",
  "assets/js/main.js",
]);

const FULL_GIT_SHA = /^[a-f0-9]{40}$/i;
const sha256 = value => createHash("sha256").update(value).digest("hex");
const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

export function normalizePagesBaseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("PAGES_URL must be a non-empty absolute HTTPS URL");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("PAGES_URL must be a non-empty absolute HTTPS URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new TypeError("PAGES_URL must use HTTPS and must not contain credentials");
  }

  url.pathname = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
  url.search = "";
  url.hash = "";
  return url;
}

export async function verifyPagesPublication({
  baseUrl,
  sourceDir = process.cwd(),
  expectedSha,
  fetchImpl = globalThis.fetch,
  attempts = 8,
  retryDelayMs = 2_500,
  wait = sleep,
} = {}) {
  if (!FULL_GIT_SHA.test(expectedSha || "")) {
    throw new TypeError("PAGES_SOURCE_SHA must be a full 40-character commit SHA");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch-compatible implementation is required");
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError("attempts must be a positive integer");
  }
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new TypeError("retryDelayMs must be a non-negative number");
  }

  const base = normalizePagesBaseUrl(baseUrl);
  let lastFailure;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const checks = await Promise.all(PAGES_PUBLIC_ASSETS.map(async asset => {
      try {
        const source = await readFile(join(sourceDir, asset));
        const expectedHash = sha256(source);
        const target = new URL(asset, base);
        target.searchParams.set("verify", expectedSha);
        target.searchParams.set("attempt", String(attempt));

        const response = await fetchImpl(target, {
          method: "GET",
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          return { asset, error: "HTTP " + response.status };
        }

        const published = Buffer.from(await response.arrayBuffer());
        const actualHash = sha256(published);
        if (actualHash !== expectedHash) {
          return {
            asset,
            error: "content SHA-256 mismatch (expected " +
              expectedHash.slice(0, 12) + ", received " + actualHash.slice(0, 12) + ")",
          };
        }

        return { asset, status: response.status, sha256: actualHash };
      } catch (error) {
        return {
          asset,
          error: error instanceof Error ? error.message : "unknown fetch or read error",
        };
      }
    }));

    const failures = checks.filter(check => check.error);
    if (failures.length === 0) {
      return checks;
    }

    lastFailure = new Error(
      "Pages publication verification failed on attempt " + attempt + "/" + attempts +
      ": " + failures.map(item => item.asset + " — " + item.error).join("; "),
    );

    if (attempt < attempts) {
      await wait(retryDelayMs);
    }
  }

  throw lastFailure;
}

async function runCli() {
  try {
    const results = await verifyPagesPublication({
      baseUrl: process.env.PAGES_URL,
      sourceDir: process.cwd(),
      expectedSha: process.env.PAGES_SOURCE_SHA,
    });

    console.log("Verified " + results.length + " public Pages assets against commit " +
      process.env.PAGES_SOURCE_SHA + ".");
    for (const result of results) {
      console.log(result.asset + ": HTTP " + result.status + ", SHA-256 " +
        result.sha256.slice(0, 16) + "…");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Pages verification failed");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
