# Gateway preview release

This workflow deploys only the isolated Preview Worker. It never targets the Production Worker or Production D1 database.

## One-time Cloudflare preparation

A dedicated D1 database named `mr-siavash-ai-preview` is provisioned in the WEUR region and isolated from Production and GShop.

- Cloudflare account ID (non-secret): `ae50292f7e60c0d6d0052727e61c4033`.
- Preview D1 database ID (non-secret): `a764f930-430f-4898-a0b6-b57f5caf9c78`.
- Configure the GitHub Actions environment named `gateway-preview` with the secret `CF_API_TOKEN`, scoped to the Workers Scripts and D1 operations required by this workflow.

The Preview Worker `mr-siavash-ai-gateway-preview` uses Cloudflare's native Workers AI binding `AI` with `AI_MODEL=@cf/zai-org/glm-4.7-flash`. This is a platform binding, not a separately configured external-provider API-key or service-token binding. `CF_API_TOKEN` is used only by the GitHub Actions release job for Cloudflare control-plane operations; it is not a runtime Worker binding.

The Worker also uses the isolated Preview D1 binding `DB`, a 90-day support-retention policy, and the daily `0 3 * * *` UTC Cron schedule. The release workflow sets `keep_vars: true` and verifies the dashboard-managed administrator configuration remains present: `ADMIN_EMAILS`, `CF_ACCESS_TEAM_DOMAIN`, and `CF_ACCESS_AUD`. A dedicated Cloudflare Access self-hosted application protects `/admin` and `/v1/admin/*`; the Worker independently verifies the Access JWT signature, issuer, audience, expiry, not-before time, and administrator allowlist.

## D1 migration contract

The Preview D1 ledger was verified through migrations 0001–0005 in the 2026-11-20 live-state reconciliation. The release workflow applies the repository's pending migrations to the isolated Preview database only. It explicitly verifies the 0004 and 0005 ledger entries and the tables `support_retention_runs` and `support_ticket_status_events` before deploying the Worker.

A green isolated SQLite migration test proves the repository migration chain, not the state of a remote D1 database. Read `docs/RELEASE_STATUS.md` and re-check the Cloudflare control plane before making a new release decision; do not infer remote migration state from GitHub CI alone.

## Release and acceptance

The `gateway-preview.yml` workflow is manual-only (`workflow_dispatch`) and must be run from the current `main` branch. It captures the existing Preview traffic split and Cron schedules for rollback, applies pending migrations to Preview D1, deploys the reviewed Worker source, and verifies the resulting AI binding, isolated D1 binding, Access variables, retention configuration, and daily schedule.

The manual release acceptance requires successful liveness and D1 readiness checks, the nine-module public catalog, the trusted-origin CORS preflight, and one successful `ai_grounded` response with a non-empty answer and at least one verified source. This proves that the configured Workers AI integration can actually complete an inference. A `knowledge_fallback` response is a valid runtime resilience mode, but it does not prove that a new Preview candidate can call Workers AI; therefore it does not satisfy this stricter release gate. A failed post-deployment acceptance check triggers restoration of the captured Preview traffic split and Cron schedules.

The assistant provider also applies a **25,000 ms response deadline**, configurable through the non-secret `AI_REQUEST_TIMEOUT_MS` Worker variable up to a hard maximum of **30,000 ms**. If inference does not complete within that budget, the request returns the verified knowledge fallback instead of waiting indefinitely. This deadline bounds the adapter's wait; it does **not** claim to cancel an inference that has already started, and the adapter does not automatically retry it. The stricter manual release gate still requires an actual `ai_grounded` response.

The recurring `gateway-preview-smoke.yml` workflow serves a different purpose: it monitors whether the deployed API remains useful under normal operation and temporary provider-capacity pressure. It accepts both `ai_grounded` and `knowledge_fallback`, but still requires a non-empty answer, at least one source, `handoff` not set to `true`, and a `request_id`. This permits the deterministic knowledge path to keep the public assistant available when Workers AI temporarily rejects inference.

## Release boundary

- Static GitHub Pages deployment is independent.
- Production Worker and Production D1 are never referenced by the Preview release workflow.
- Do not add Production secrets to the `gateway-preview` environment.
- A successful Preview is necessary but not sufficient for Production. Authentication, administrator Access JWT verification, support ticket lifecycle, privacy/retention, backup/restore, tenant isolation, and rollback still require their separate acceptance checks and explicit Production release approval.

The workflow pins Wrangler to `4.45.0` and uses Node.js 22. Its generated Wrangler configuration and rollback snapshot live only in the runner's temporary directory and are not committed.
