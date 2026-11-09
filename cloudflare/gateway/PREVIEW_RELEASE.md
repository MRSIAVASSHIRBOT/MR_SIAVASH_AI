# Gateway preview release

This workflow deploys only the isolated preview Worker. It never targets the production Worker or production D1 database.

## One-time Cloudflare preparation

A dedicated D1 database named `mr-siavash-ai-preview` has been provisioned in the WEUR region, isolated from production and GShop.

- Cloudflare account ID (non-secret): `ae50292f7e60c0d6d0052727e61c4033`.
- Preview D1 database ID (non-secret): `a764f930-430f-4898-a0b6-b57f5caf9c78`.
- Configure the GitHub Actions environment named `gateway-preview` with one secret: `CF_API_TOKEN`, a narrowly scoped token with Workers Scripts edit and D1 read/write permissions for this account.

The preview Worker `mr-siavash-ai-gateway-preview` has already been uploaded and its `workers.dev` subdomain enabled. Migrations 0001–0003 were applied to the isolated preview database and the seven application tables were verified through `sqlite_master`. The GitHub smoke workflow checks the public runtime on subsequent `main` updates.

The workflow applies the repository migrations to preview only, deploys the current Worker source to the dedicated `workers.dev` preview name, then checks liveness, D1 readiness, public module metadata, administrator edge protection and exact-origin CORS. Preview has a dedicated Cloudflare Access self-hosted application protecting `/admin` and `/v1/admin/*` with the existing single-administrator reusable policy. The Worker independently verifies the Access JWT signature, issuer, audience, expiry, not-before time and administrator allowlist. Preview Worker bindings include the matching Access team domain, application audience and administrator allowlist. No AI binding or service token is configured.

## Release boundary

- Static Pages deployment remains independent.
- Production Worker and production D1 are never referenced by this workflow.
- Production migration 0003 is already applied; do not reapply it.
- Do not add production secrets to this environment.
- A successful preview is necessary but not sufficient for production. Authentication, admin Access JWT verification, support ticket lifecycle, privacy/retention, backup/restore, tenant isolation and rollback still require explicit end-to-end tests.

The workflow pins Wrangler to the 4.45.0 CLI release and uses Node.js 22. The generated config lives only in the runner temporary directory and is not committed.
