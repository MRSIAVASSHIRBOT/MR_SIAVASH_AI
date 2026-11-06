# Backend foundation — implementation gate

This directory contains design artifacts only. It does not contain a running backend and does not turn the static GitHub Pages site into an account service.

## Contract
- openapi.yaml defines the proposed v1 boundary for health, public module metadata and authenticated per-user workspace tasks.
- scripts/validate-openapi.rb checks references, operation IDs, path parameters, authentication boundaries, request bodies, pagination limits and idempotency requirements in CI.
- ../THREAT_MODEL.md defines the initial assets, trust boundaries, threats and production blockers.
- User identity is always derived from a validated server-side session. Never accept a user ID from request JSON as an authorization decision.

## Selected deployment boundary

ADR 0001 selects a dedicated Cloudflare Worker for the API while retaining GitHub Pages for the current frontend. The Cloudflare account has a dedicated `mr-siavash-ai-gateway` Worker resource and `mr-siavash-ai-prod` D1 database; an initial health-only Worker version was uploaded. However, no independent HTTP smoke test has verified runtime behavior, and the repository does not yet have a reproducible Wrangler manifest or Worker deployment workflow. The Pages deployment does not publish Worker changes, so merged source must not be assumed to be live. Never reuse GShop's `gahop` Worker or `gshop-db` database.

## D1 schema foundation

`../../cloudflare/gateway/migrations/0001_workspace_tasks.sql` defines a local-first tenant-scoped task table and owner-scoped idempotency records. `scripts/test-d1-migrations.py` applies all migration files to an isolated in-memory SQLite database and checks constraints, tenant-filter query shape, indexes, and idempotency uniqueness. This is a schema test only: it does not connect to Cloudflare or apply anything to the provisioned production D1 database. The auth adapter must map a verified `(issuer, subject)` identity to an internal owner UUID; clients must never supply `owner_id`.

## Implementation sequence
1. Provision isolated preview and production Worker environments and verify the existing production resource bindings without applying migrations.
2. Implement public health and module metadata first; expose no private data.
3. Select and implement verified authentication with a documented account lifecycle.
4. Add task persistence with tenant-scoped repository methods and negative cross-user tests.
5. Add rate limits, request-size limits, audit events, observability and backup/restore.
6. Only then connect AI providers through server-side secret storage and explicit tool permissions.

## Non-goals
- No secrets in browser storage or public repository files.
- No provider key passed to client-side JavaScript.
- No mock login presented as real authentication.
- No cloud sync claim until persistence and authorization are deployed and tested.
