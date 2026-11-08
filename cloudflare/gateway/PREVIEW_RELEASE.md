# Gateway preview release

This workflow deploys only the isolated preview Worker. It never targets the production Worker or production D1 database.

## One-time Cloudflare preparation

Create a dedicated D1 database named `mr-siavash-ai-preview` in the same Cloudflare account. Do not reuse `mr-siavash-ai-prod` or any GShop resource. Configure the GitHub Actions environment named `gateway-preview` with:

- Variable `CF_ACCOUNT_ID`: Cloudflare account ID.
- Variable `PREVIEW_D1_DATABASE_ID`: UUID of the dedicated preview D1 database.
- Secret `CF_API_TOKEN`: narrowly scoped token with Workers Scripts edit and D1 read/write permissions for this account.

The workflow applies the repository migrations to preview only, deploys the current Worker source to the dedicated `workers.dev` preview name, then checks liveness, D1 readiness, public module metadata and exact-origin CORS. It does not configure an AI binding or expose administrator routes; those remain fail-closed until a separately reviewed identity/Access configuration is added to preview.

## Release boundary

- Static Pages deployment remains independent.
- Production Worker and production D1 are never referenced by this workflow.
- Production migration 0003 is already applied; do not reapply it.
- Do not add production secrets to this environment.
- A successful preview is necessary but not sufficient for production. Authentication, admin Access JWT verification, support ticket lifecycle, privacy/retention, backup/restore, tenant isolation and rollback still require explicit end-to-end tests.

The workflow pins Wrangler to the 4.45.0 CLI release and uses Node.js 22. The generated config lives only in the runner temporary directory and is not committed.
