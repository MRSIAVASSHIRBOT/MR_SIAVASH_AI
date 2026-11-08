# Cloudflare API Gateway foundation

This directory contains the isolated Worker service for MR_SIAVASH_AI. It is separate from the existing GShop Worker and does not change the current GitHub Pages frontend.

## Deployment status

The Worker `mr-siavash-ai-gateway` is deployed with its workers.dev subdomain enabled: `https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev`. The latest GitHub Actions runtime smoke workflow passed on 2026-11-08 for the deployed liveness/readiness and CORS checks. A control-plane inspection confirms that production still runs the original health-only bundle, not the current `main` source. Production therefore does not expose the support, ticket, assistant, module or administrator routes.

The dedicated production D1 database is `mr-siavash-ai-prod` (`87c15170-7995-4929-b00c-20b5b491c05f`) in Cloudflare's WEUR region. Read-only inspection on 2026-11-08 confirmed the workspace, identity and support tables, including the exact schema for migration 0003. Counts for `support_tickets`, `support_messages`, `api_rate_limits`, `workspace_tasks`, `workspace_idempotency`, `users` and `auth_identities` were all zero at that inspection. No custom domain or DNS record has been added. The D1 inventory's `num_tables` field was stale; use `sqlite_master` for schema verification.

## Implemented and verified in production

- `GET /v1/health/live`: process-level liveness; does not depend on storage.
- `GET /v1/health/ready`: readiness check requiring a D1 binding and a successful `SELECT 1 AS ok`.
- Exact-origin CORS allowlist via the `ALLOWED_ORIGINS` environment variable. Wildcards and URL paths are ignored.
- Stable JSON errors, per-response request IDs, no-store responses, and baseline browser security headers.
- Unknown routes and unsupported methods fail closed in the deployed health-only bundle.
- Cloudflare observability query-string redaction is enabled and was verified by a settings readback on 2026-11-08. Persistent invocation logs remain enabled at 1.0 sampling; persistent traces remain enabled at 0.1 sampling.

The repository source also implements `GET /v1/modules` as a public, read-only endpoint backed by the reviewed module metadata contract, with bounded category filtering and pagination. This route is source-only until a separately reviewed Worker deployment is completed and verified.

## Administrator Access configuration

A Cloudflare Access self-hosted application named `MR_SIAVASH_AI Admin Console` is configured for both `/admin` and `/v1/admin/*` on the Worker hostname. Its only Allow policy matches the designated administrator email. The Worker's configured Access audience matches the Access application's audience; the Access team-domain, audience and administrator allowlist bindings are present in Worker settings. The application uses an eight-hour session, path-scoped cookies and HttpOnly cookies.

This configuration is in place, but it does not deploy application routes. The Worker source independently validates Access JWT signature, issuer, audience, expiry and administrator email allowlist. Preserve both layers before exposing administrator functionality.

## Explicitly not implemented in the deployed runtime

The repository's GitHub Pages workflow does not deploy Worker code, and the repository does not yet contain a reproducible Wrangler manifest or Worker release workflow. The production script remains health-only. The Access application protects the future administrator paths, but those paths are not yet served by production.

The production Worker has the dedicated D1 binding and the required Access configuration bindings (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAILS`), plus `ALLOWED_ORIGINS`. It has no Workers AI binding, so model-generated assistant answers are not active. The assistant's verified FAQ fallback exists only in source until the Worker is deployed.

The dedicated Worker and D1 database exist. No custom-domain route or DNS record has been created. The existing `gahop` Worker and GShop resources remain out of scope and unchanged.

## Local validation

From the repository root:

```sh
node --check cloudflare/gateway/src/index.js
node --test cloudflare/gateway/tests/*.test.mjs
```

The gateway tests use a small D1 mock and do not require Cloudflare credentials or network access.

## Runtime bindings and release configuration

- `DB`: dedicated D1 database for MR_SIAVASH_AI. Do not reuse `gshop-db`.
- `ALLOWED_ORIGINS`: comma-separated exact origins for the deployed frontend. Do not use `*`.
- `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAILS`: configured in production Worker settings and matched to the Access app and its designated administrator policy.
- `AI`: optional Workers AI binding. It is not configured in production.
- `AI_MODEL`: optional model override; source default is `@cf/zai-org/glm-4.7-flash`.

Production and preview must use separate D1 databases and secrets. Migration 0003 is already present in production D1; do not reapply it. Provision and validate a separate preview database before future migration changes. A production deployment must be a deliberate, separately reviewed release after the Worker manifest, environment separation, CI deployment controls and live API verification are ready.

## D1 migration foundation

Migration 0001 creates tenant-scoped workspace tasks and owner-scoped idempotency records. Migration 0002 adds opaque internal users, a unique external identity mapping keyed by issuer and subject, and foreign keys from workspace rows to users. It backfills existing owner UUIDs before rebuilding the tables and preserves task/idempotency rows. The migration suite tests this upgrade in an in-memory SQLite database, including backfill, referential integrity, cascade deletion, tenant-index usage and support-ticket constraints. Read-only production inspection confirms the workspace, identity and support schemas are present and the checked application tables currently contain zero rows. The Cloudflare D1 list endpoint reported a stale `num_tables` value, so use `sqlite_master` for schema verification.

## Next implementation gates

1. Add a reproducible Wrangler manifest and a manual, protected Worker release workflow; keep production deployment separate from GitHub Pages deployment.
2. Provision a separate preview database and environment-specific Worker configuration.
3. Validate the deployed Access JWT path end-to-end against the configured audience and designated administrator identity.
4. Deploy the reviewed Worker source only after release controls and route-level smoke tests are ready.
5. Add tenant-scoped workspace repositories with cross-user negative API tests and idempotency replay semantics.
6. Add retention cleanup, audit-event review, and backup/restore procedures.
7. Add Workers AI only after its binding, budget, rate limits and failure behavior are reviewed.

A successful liveness response is not a readiness signal. A successful readiness response only verifies the D1 dependency, not the full product. The currently deployed Worker exposes health endpoints only. The repository `main` branch contains support and assistant routes, and production D1 already has the support schema, but those routes are not live until the Worker is deployed and the resulting endpoints are independently verified.

## CORS preflight policy

Preflight requests are accepted only when the origin exactly matches `ALLOWED_ORIGINS`, the requested method is one of `GET`, `POST`, or `PATCH`, and every requested header is in the explicit `Content-Type`, `Authorization`, or `X-Request-ID` allowlist. Unsupported methods, untrusted or missing origins, and unapproved or malformed headers receive a `403` response without granting CORS access. CORS is a browser access policy, not authentication or authorization; non-browser clients must still be treated as untrusted.

## Hybrid assistant and human support (source-only)

Repository CI validates the support implementation and ticket lifecycle. Production activation remains a separate release gate.

The Worker source implements a site-grounded assistant, support ticket creation and private ticket conversations, plus Cloudflare Access-protected administrator list/detail/reply/status routes. Workers AI is optional: the Worker invokes it when an `AI` binding exists, using `@cf/zai-org/glm-4.7-flash` by default or a valid `@cf/` `AI_MODEL` override. Without the binding it uses verified FAQ content or explicitly recommends human support.

Migration `0003_support_inbox.sql` creates ticket, message and hashed-IP rate-limit tables. Read-only inspection on 2026-11-08 confirmed that these exact table definitions already exist in `mr-siavash-ai-prod` and all three tables were empty at that inspection. Do not reapply the migration. Before enabling these routes, deploy the reviewed Worker source and verify the production API. Never use `gshop-db`.

Ticket credentials are random one-time bearer tokens; only SHA-256 hashes are stored. Raw client IPs are not stored. Email delivery, retention and erasure automation remain future work.

The administrator dashboard is served by the Worker at `/admin`, on the same origin as the protected API. Cloudflare Access is configured for both `/admin` and `/v1/admin/*`; the Worker also validates the Access JWT itself.
