# Cloudflare API Gateway foundation

This directory contains the first isolated Worker service for MR_SIAVASH_AI. It is separate from the existing GShop Worker and does not change the current GitHub Pages frontend.

## Deployment status

The health-only Worker was uploaded on 2026-11-06 as `mr-siavash-ai-gateway` and its workers.dev subdomain is enabled: `https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev`. Its control-plane configuration was read back and confirms the dedicated D1 binding, exact GitHub Pages origin allowlist, and observability settings. The Worker has not yet received an independent HTTP runtime smoke test through this integration; verify both health endpoints from an external client before depending on them.

The dedicated production D1 database is `mr-siavash-ai-prod` in Cloudflare's WEUR region. It currently has no tables and contains no user data. No custom domain, DNS record, or public product API route has been added.

## Implemented in this stage

- `GET /v1/health/live`: process-level liveness; does not depend on storage.
- `GET /v1/health/ready`: readiness check requiring a D1 binding and a successful `SELECT 1 AS ok`.
- Exact-origin CORS allowlist via the `ALLOWED_ORIGINS` environment variable. Wildcards and URL paths are ignored.
- Stable JSON errors, per-response request IDs, no-store responses, and baseline browser security headers.
- Unknown routes and unsupported methods fail closed.

## D1 migration foundation

migrations/0001_identity_workspace.sql defines provider-neutral internal users, verified external identity mappings, owner-scoped workspace tasks, and per-user idempotency records. The migration is validated locally by scripts/validate-d1-migrations.py in CI using an in-memory SQLite database. It has **not** been applied to the Cloudflare production D1 database, which remains empty. Foreign keys do not replace server-side authentication or per-query authorization.

## Explicitly not implemented

The health-only Worker is deployed, but this repository's gateway source remains limited to health routes. It does not implement user authentication, sessions, authorization, account recovery, workspace APIs, AI provider calls, agent execution, billing, or cloud sync. Do not configure the frontend to treat these health routes as proof that those capabilities exist.

The dedicated health-only Worker and D1 database now exist. No custom-domain route, DNS record, user-facing product API, or secret was created. The existing `gahop` Worker and GShop resources remain out of scope and unchanged.

## Local validation

From the repository root:

```sh
node --check cloudflare/gateway/src/index.js
node --test cloudflare/gateway/tests/*.test.mjs
```

The gateway tests use a small D1 mock and do not require Cloudflare credentials or network access.

## Runtime bindings required before deployment

- `DB`: dedicated D1 database for MR_SIAVASH_AI. Do not reuse `gshop-db`.
- `ALLOWED_ORIGINS`: comma-separated exact origins for the deployed frontend, e.g. `https://<approved-host>`. Do not use `*`.

The deployment manifest and binding IDs must be added only after the target frontend origin and environment separation are confirmed. Production and preview should use separate D1 databases and secrets.

## Next implementation gates

1. Provision a separate preview database and environment-specific Worker configuration; production D1 is already provisioned.
2. Apply and test the reviewed schema migration on preview only, with a documented rollback and backup plan.
3. Select a verified authentication/session provider and implement server-side principal validation and authorization middleware.
4. Add tenant-scoped workspace repositories with cross-user negative tests, request limits, rate limiting, audit events, observability, and backup/restore.
5. Implement public module metadata and authenticated workspace APIs against the OpenAPI contract.
6. Add AI provider adapters and bounded agent jobs only after identity, secrets, and approval controls pass review.

A successful liveness response is not a readiness signal. A successful readiness response only verifies the D1 dependency, not the full product. The current Worker exposes health endpoints only; it does not yet provide authentication, workspace APIs, or AI/agent execution.


## CORS preflight policy

Preflight requests are accepted only when the origin exactly matches `ALLOWED_ORIGINS`, the requested method is `GET`, and every requested header is in the explicit `Content-Type` / `X-Request-ID` allowlist. Unsupported methods, untrusted or missing origins, and unapproved or malformed headers receive a `403` response without granting CORS access. CORS is a browser access policy, not authentication or authorization; non-browser clients must still be treated as untrusted.
