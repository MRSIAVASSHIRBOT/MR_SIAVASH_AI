# Cloudflare API Gateway foundation

This directory contains the first isolated Worker service for MR_SIAVASH_AI. It is separate from the existing GShop Worker and does not change the current GitHub Pages frontend.

## Deployment status

The Worker `mr-siavash-ai-gateway` was uploaded on 2026-11-06 and its workers.dev subdomain is enabled: `https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev`. Automated HTTP smoke checks recorded on 2026-11-07 verified liveness, D1 readiness and the deployed health-only CORS behavior. A fresh control-plane readback and script download on 2026-11-08 confirm that production still runs the original health-only bundle, not the current `main` source. The deployed bundle therefore does not expose support, ticket or assistant routes.

The dedicated production D1 database is `mr-siavash-ai-prod` (`87c15170-7995-4929-b00c-20b5b491c05f`) in Cloudflare's WEUR region. Read-only inspection on 2026-11-08 confirmed the workspace, identity and support tables, including the exact schema for migration 0003. Counts for `support_tickets`, `support_messages`, `api_rate_limits`, `workspace_tasks`, `workspace_idempotency`, `users` and `auth_identities` were all zero. No custom domain or DNS record has been added.

## Implemented in this stage

- `GET /v1/health/live`: process-level liveness; does not depend on storage.
- `GET /v1/health/ready`: readiness check requiring a D1 binding and a successful `SELECT 1 AS ok`.
- Exact-origin CORS allowlist via the `ALLOWED_ORIGINS` environment variable. Wildcards and URL paths are ignored.
- Stable JSON errors, per-response request IDs, no-store responses, and baseline browser security headers.
- Unknown routes and unsupported methods fail closed.

## Explicitly not implemented

The Cloudflare account contains the dedicated Worker resource, but its downloaded production script is still the original health-only implementation. The repository's GitHub Pages workflow does not deploy Worker code, so merged source changes (including strict CORS, support tickets, assistant and admin routes) must not be assumed live. Automated HTTP smoke checks verify only the old health/CORS boundary. Cloudflare Access is currently not enabled for the account, and the Worker settings expose no `AI` binding or Access environment variables. Do not configure the frontend to treat health routes as proof that support, authentication, AI or workspace APIs are live.

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
- `ALLOWED_ORIGINS`: comma-separated exact origins for the deployed frontend, e.g. `https://<approved-host>`. Do not use `*`.

The repository does not yet contain a reproducible Wrangler manifest or Worker release workflow. Add those only after the target frontend origin and environment separation are confirmed. Production and preview must use separate D1 databases and secrets. Migration 0003 is already present in production D1; do not reapply it. Provision and validate a separate preview database before future migration changes.

## D1 migration foundation

Migration 0001 creates tenant-scoped workspace tasks and owner-scoped idempotency records. Migration 0002 adds opaque internal users, a unique external identity mapping keyed by issuer and subject, and foreign keys from workspace rows to users. It backfills existing owner UUIDs before rebuilding the tables and preserves task/idempotency rows. The migration suite tests this upgrade in an in-memory SQLite database, including backfill, referential integrity, cascade deletion, tenant-index usage and support-ticket constraints. Read-only production inspection confirms the workspace, identity and support schemas are present and the checked application tables currently contain zero rows. The Cloudflare D1 list endpoint reported a stale `num_tables` value, so use `sqlite_master` for schema verification.

## Next implementation gates

1. Provision a separate preview database and environment-specific Worker configuration; production D1 is already provisioned.
2. Select a verified authentication/session provider and implement server-side token validation and authorization middleware.
3. Add tenant-scoped workspace repositories with cross-user negative API tests and idempotency replay semantics.
4. Add request limits, rate limiting, audit events, observability, retention cleanup, and backup/restore.
5. Implement public module metadata and authenticated workspace APIs against the OpenAPI contract.
6. Add AI provider adapters and bounded agent jobs only after identity, secrets, and approval controls pass review.

A successful liveness response is not a readiness signal. A successful readiness response only verifies the D1 dependency, not the full product. The originally deployed Worker version exposes health endpoints only. The repository `main` branch contains support and assistant routes, and production D1 already has the support schema, but those routes are not live until the Worker is deployed and the resulting endpoints are independently verified.


## CORS preflight policy

Preflight requests are accepted only when the origin exactly matches `ALLOWED_ORIGINS`, the requested method is one of `GET`, `POST`, or `PATCH`, and every requested header is in the explicit `Content-Type`, `Authorization`, or `X-Request-ID` allowlist. Unsupported methods, untrusted or missing origins, and unapproved or malformed headers receive a `403` response without granting CORS access. CORS is a browser access policy, not authentication or authorization; non-browser clients must still be treated as untrusted.


## Hybrid assistant and human support (source-only)

Repository CI validates the support implementation and ticket lifecycle. Production activation remains a separate release gate.

The Worker source implements a site-grounded assistant, support ticket creation and private ticket conversations, plus Cloudflare Access-protected administrator list/detail/reply/status routes. Workers AI is optional: the Worker invokes it when an `AI` binding exists, using `@cf/zai-org/glm-4.7-flash` by default or a valid `@cf/` `AI_MODEL` override. Without the binding it uses verified FAQ content or explicitly recommends human support.

Migration `0003_support_inbox.sql` creates ticket, message and hashed-IP rate-limit tables. Read-only inspection on 2026-11-08 confirmed that these exact table definitions already exist in `mr-siavash-ai-prod` and all three tables are empty. Do not reapply the migration. Before enabling these routes, deploy the reviewed Worker source and verify the production API. Never use `gshop-db`.

Required settings: `DB`, exact-origin `ALLOWED_ORIGINS`, optional `AI` and optional `AI_MODEL` (default `@cf/zai-org/glm-4.7-flash`), and `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAILS` for administrator access. Cloudflare Access is currently not enabled for the account; enable it and configure a path-scoped application for `/admin` and `/v1/admin/*`, restricted to the confirmed administrator identity, before deploying the admin experience. Admin endpoints independently verify JWT signature, issuer, audience, expiry and email allowlist.

Ticket credentials are random one-time bearer tokens; only SHA-256 hashes are stored. Raw client IPs are not stored. Email delivery, retention and erasure automation remain future work.


Validation note: the current PR checks the exact allowlisted gateway origin in the static site's CSP and the gateway's credentialed CORS policy; no wildcard origin is accepted.


The administrator dashboard is served by the Worker at `/admin`, on the same origin as the protected API. Configure a path-scoped Cloudflare Access application for `/admin` and `/v1/admin/*`; this avoids depending on third-party cookies from the GitHub Pages origin. The Worker also validates the Access JWT itself.
