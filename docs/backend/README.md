# Backend foundation — implementation gate

This directory contains backend design artifacts and migration validation. The deployed Cloudflare Worker currently exposes health endpoints only; it does not turn the static GitHub Pages site into an account service.

## Contract
- openapi.yaml defines the proposed v1 boundary for health, public module metadata and authenticated per-user workspace tasks.
- scripts/validate-openapi.rb checks references, operation IDs, path parameters, authentication boundaries, request bodies, pagination limits and idempotency requirements in CI.
- ../THREAT_MODEL.md defines the initial assets, trust boundaries, threats and production blockers.
- User identity is always derived from a validated server-side session. Never accept a user ID from request JSON as an authorization decision.

## Selected deployment boundary

ADR 0001 selects a dedicated Cloudflare Worker for the API while retaining GitHub Pages for the current frontend. The dedicated health-only Worker and production D1 database are provisioned under `../../cloudflare/gateway/`. The production database remains empty: no schema migration has been applied. Never reuse GShop's `gahop` Worker or `gshop-db` database.

## Persistence foundation

`cloudflare/gateway/migrations/0001_identity_workspace.sql` defines a provider-neutral internal user record, unique external identity mapping (`issuer` + `subject`), owner-scoped workspace tasks, and per-user idempotency records. It stores no email address, provider credential, raw session token, or user-supplied principal. Timestamps are Unix epoch milliseconds. Task pagination is supported by a composite owner/time/ID index. User deletion cascades to identity mappings, tasks, and idempotency records.

`scripts/validate-d1-migrations.py` executes the migration against an in-memory SQLite database and checks constraints, foreign keys, identity uniqueness, idempotency scoping, deletion behavior, and pagination indexes. CI runs this test locally; it does not connect to Cloudflare or apply the migration to production. Schema constraints are not a substitute for server-side authorization.

## Implementation sequence
1. Provision a separate preview database and environment-specific Worker configuration; keep production isolated.
2. Validate and review the migration locally, then against a dedicated preview database before any production migration.
3. Select and implement verified authentication with a documented account lifecycle; map only validated issuer/subject claims to internal user IDs.
4. Add task persistence with tenant-scoped repository methods and negative cross-user authorization tests.
5. Implement public module metadata, rate limits, request-size limits, audit events, observability and backup/restore.
6. Only then connect AI providers through server-side secret storage and explicit tool permissions.

## Non-goals
- No secrets in browser storage or public repository files.
- No provider key passed to client-side JavaScript.
- No mock login presented as real authentication.
- No cloud sync claim until persistence and authorization are deployed and tested.
