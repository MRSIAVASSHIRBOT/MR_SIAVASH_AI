# ADR 0003 — Internal principals and verified external identity mapping

- Status: Accepted for schema design; authentication provider remains undecided
- Date: 2026-11-06
- Scope: D1 migration 0002 and local validation only

## Context

Migration 0001 established tenant-scoped workspace tasks and owner-scoped idempotency records using an internal owner UUID. The schema did not yet persist the mapping between a trusted external identity and that internal principal, and owner columns were not yet foreign-key constrained.

## Decision

Add an internal users table and an auth_identities table. Each external identity is represented by a unique issuer/subject pair and references one internal user. The application may insert or resolve this mapping only after validating the identity token's signature, issuer, audience, expiry, not-before claim, and key rotation state.

Migration 0002 first backfills user rows for every existing task/idempotency owner. It then rebuilds both workspace tables with foreign keys to users and ON DELETE CASCADE, preserving existing task and idempotency rows. Timestamp columns are constrained to a fixed-width UTC millisecond format so lexical ordering is stable. The schema intentionally stores no email address, raw access token, session secret, or provider credential.

## Validation and rollout boundary

- scripts/test-d1-migrations.py applies migrations 0001 and 0002 in order to an isolated in-memory SQLite database.
- The test seeds pre-0002 workspace data, proves user backfill and row preservation, checks identity uniqueness, validates owner foreign keys, verifies deletion cascades, checks the tenant query plan, and runs foreign_key_check and integrity_check.
- GitHub Actions runs the local migration test. It does not connect to Cloudflare or apply any remote migration.
- Apply to a separately provisioned preview D1 database first. Production remains untouched until authentication, repository authorization, cross-account integration tests, backup/restore, retention, and rollback are approved.

## Consequences

The application now has a stable internal principal independent of any one identity provider, and the database enforces referential ownership. This does not authenticate requests or guarantee tenant isolation: every API operation must still derive the principal from a verified server-side session and include it in its SQL predicate.
