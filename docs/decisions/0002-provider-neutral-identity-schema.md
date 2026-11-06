# ADR 0002 — Provider-neutral identity and workspace persistence schema

- Status: Accepted for schema foundation; authentication provider remains undecided
- Date: 2026-11-06
- Scope: D1 schema design and local validation only

## Context

The project has a health-only Cloudflare Worker and a dedicated production D1 database. The OpenAPI contract defines authenticated per-user workspace operations, but no identity provider or session lifecycle has been selected. Adding provider-specific tables or accepting client-supplied user identifiers would prematurely couple the data model to an unreviewed authentication choice.

## Decision

Use an opaque internal users.id as the stable application principal. Map verified external identities through auth_identities, with a unique (issuer, subject) pair. The mapping is created only after server-side cryptographic validation of the identity token and its issuer, audience, expiry, and other required claims.

The initial migration also defines:
- workspace_tasks, owned by an internal user ID, with bounded task text, boolean completion, and millisecond timestamps;
- idempotency_records, scoped by user and keyed by a server-computed digest, with a bounded valid-JSON response and explicit expiry;
- indexes for identity lookup, user-scoped task keyset pagination, and idempotency expiry cleanup.

User deletion cascades to linked identities, workspace tasks, and idempotency records. The schema intentionally does not store email addresses, raw access tokens, session secrets, provider credentials, or client-supplied principal values.

## Validation and rollout boundary

- scripts/validate-d1-migrations.py applies the SQL migration to an in-memory SQLite database and tests schema creation, uniqueness, foreign keys, constraints, cascades, idempotency scoping, and pagination indexes.
- GitHub Actions runs this local validator as part of the quality job.
- This test is not a Cloudflare deployment or a production D1 migration.
- Apply the migration first to a separately provisioned preview D1 database, after verifying the Worker environment binding and rollback plan.
- Do not apply it to production until authentication, repository-level ownership enforcement, negative cross-user tests, retention policy, backup/restore, and operational review are complete.

## Consequences

The schema can support different verified identity providers without making the provider's subject the application's permanent user key. The cost is an explicit identity-linking lifecycle and server-side repository discipline. Foreign keys and owner columns provide data integrity, not authorization: every protected query must still be scoped to the principal derived from a verified server-side session.
