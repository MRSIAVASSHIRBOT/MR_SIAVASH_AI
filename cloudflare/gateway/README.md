# Cloudflare API Gateway foundation

This directory contains the first isolated Worker service for MR_SIAVASH_AI. It is intentionally separate from the existing GShop Worker and does not change the current GitHub Pages frontend.

## Implemented in this stage

- `GET /v1/health/live`: process-level liveness; does not depend on storage.
- `GET /v1/health/ready`: readiness check requiring a D1 binding and a successful `SELECT 1 AS ok`.
- Exact-origin CORS allowlist via the `ALLOWED_ORIGINS` environment variable. Wildcards and URL paths are ignored.
- Stable JSON errors, per-response request IDs, no-store responses, and baseline browser security headers.
- Unknown routes and unsupported methods fail closed.

## Explicitly not implemented

This is a source foundation, not a deployed service. It does not implement user authentication, sessions, authorization, account recovery, workspace persistence, AI provider calls, agent execution, billing, or cloud sync. Do not configure the frontend to treat these health routes as proof that those capabilities exist.

No production Worker, route, DNS record, D1 database, or secret was created by this change. The existing `gahop` Worker and GShop resources are out of scope.

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

1. Provision a dedicated D1 database and environment-specific Worker configuration.
2. Add a verified authentication/session provider and server-side authorization middleware.
3. Add migrations and tenant-scoped workspace repositories with cross-user negative tests.
4. Add request limits, rate limiting, audit events, observability, and backup/restore.
5. Implement public module metadata and authenticated workspace APIs against the OpenAPI contract.
6. Add AI provider adapters and bounded agent jobs only after identity, secrets, and approval controls pass review.

A successful liveness response is not a readiness signal. A successful readiness response only verifies the D1 dependency, not the full product.
