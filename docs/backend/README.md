# Backend foundation — implementation gate

This directory contains API design artifacts and validation tooling; it is not a user-facing backend implementation and does not turn the static GitHub Pages site into an account service. The deployed health-only Cloudflare Worker has passed independent liveness, D1-readiness, and CORS runtime smoke checks. The workflow verifies the exact allowlisted origin and confirms that untrusted origins receive no CORS grant.

## Contract
- openapi.yaml defines the proposed v1 boundary for health, public module metadata and authenticated per-user workspace tasks.
- scripts/validate-openapi.rb checks references, operation IDs, path parameters, authentication boundaries, request bodies, pagination limits and idempotency requirements in CI.
- ../THREAT_MODEL.md defines the initial assets, trust boundaries, threats and production blockers.
- User identity is always derived from a validated server-side session. Never accept a user ID from request JSON as an authorization decision.

## Selected deployment boundary

ADR 0001 selects a dedicated Cloudflare Worker for the API while retaining GitHub Pages for the current frontend. The Cloudflare account has a dedicated `mr-siavash-ai-gateway` Worker resource and `mr-siavash-ai-prod` D1 database; the deployed bundle remains health-only. Automated runtime smoke checks passed for `GET /v1/health/live`, `GET /v1/health/ready`, exact-origin CORS and the absence of an allow-origin grant for untrusted origins. The deployed `ALLOWED_ORIGINS` binding is exactly `https://mrsiavasshirbot.github.io`. Runtime inspection found a source-parity difference: the deployed health-only bundle may answer OPTIONS with 204 for an untrusted origin but does not emit `Access-Control-Allow-Origin`; the current repository source rejects invalid preflights with 403. Both behaviors deny browser CORS access, and the smoke workflow checks the absence of a CORS grant. Cloudflare Access is configured for `/admin` and `/v1/admin/*` with a single-administrator policy; its audience matches the Worker's configured Access audience. The Worker's Access team-domain, audience and administrator allowlist bindings are present. The production Worker has no Workers AI binding. The repository does not yet have a reproducible Wrangler manifest or Worker deployment workflow. The Pages deployment does not publish Worker changes, so merged source must not be assumed to be live. Never reuse GShop's `gahop` Worker or `gshop-db` database.

## D1 schema foundation

`../../cloudflare/gateway/migrations/0001_workspace_tasks.sql` defines tenant-scoped tasks and owner-scoped idempotency records. Migration 0002 adds opaque internal users, unique verified `(issuer, subject)` mappings, and foreign keys from task/idempotency rows to users. It backfills existing owners before rebuilding those tables, preserving their rows and indexes. The schema stores no email address, raw token, session secret, or provider credential.

`scripts/test-d1-migrations.py` applies every migration in order to an isolated in-memory SQLite database. It verifies backfill preservation, identity uniqueness, owner foreign keys, cascade deletion, constraints, query-plan index selection, and database integrity. This is a schema test only: it does not connect to Cloudflare or apply anything to the provisioned production D1 database. The auth adapter must map only a cryptographically verified `(issuer, subject)` identity to the internal owner UUID; clients must never supply `owner_id`. Foreign keys are integrity controls, not API authorization.

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
