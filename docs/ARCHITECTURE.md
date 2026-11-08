# MR_SIAVASH_AI — Architecture

## Product boundary

The current repository is a static, browser-executed front end. It must not claim to provide authentication, remote AI execution, cloud persistence, or private user accounts until a trusted backend exists.

## Front-end layers

1. **Presentation:** semantic HTML, RTL layout, responsive CSS, keyboard navigation, dialogs, status indicators.
2. **Client application:** module registry, hash routing, saved-module state, local task operations, JSON import/export.
3. **Browser persistence:** versioned localStorage keys. Tasks and favorites synchronize across same-origin tabs through validated storage events with last-write-wins semantics. Data remains scoped to the browser profile; there is no cross-device or cloud synchronization. While explicit workspace recovery is pending, incoming task writes and storage-clear events are ignored.
4. **Offline shell:** service worker uses an explicit exact-URL allowlist for static application resources. It bypasses API, authenticated, query-string, cross-origin, unknown-route, and non-GET requests; navigation fallback is limited to the app document and stores only successful HTML responses.

## Module boundaries

| Module | Responsibility | Current state |
| --- | --- | --- |
| AI Hub | Model/provider discovery and evaluation | Roadmap |
| Agents Lab | Agent definitions, tools, workflow orchestration | Roadmap |
| Developer Studio | Code, repository and engineering utilities | Roadmap |
| Secure Lab | Defensive security and authorized lab learning | Roadmap |
| Network & Linux Lab | Networking, Linux and troubleshooting learning | Roadmap |
| Knowledge Library | Searchable learning resources and notes | Roadmap |
| Creator Studio | Content planning and production workflows | Roadmap |
| Digital Identity | User profile and privacy preferences | Roadmap |
| Personal Workspace | Local tasks, favorites and backup | Browser-only prototype |

## Backend and production boundary

MR_SIAVASH_AI has separate production and preview Cloudflare environments. Production Worker `mr-siavash-ai-gateway` is bound to `mr-siavash-ai-prod`; preview Worker `mr-siavash-ai-gateway-preview` is bound to the isolated `mr-siavash-ai-preview` database.

A Cloudflare control-plane readback on 2026-11-08 identified production Worker version `f7d5a92e-2694-4af1-8b99-18d04742925d`. That deployed bundle exposes health/readiness, a knowledge-fallback assistant endpoint, public support-ticket create/read/reply endpoints, and Access-protected administrator console/API routes. It does not yet contain the current repository's `GET /v1/modules` route or the scheduled data-retention handler. The preview Worker runs current `main` source and its runtime smoke workflow passed health, D1 readiness, module catalog, grounded fallback, support validation, admin fail-closed and CORS checks.

The production Worker has no Workers AI binding; its assistant endpoint therefore uses verified knowledge fallback rather than model inference. The public site keeps ticket submission/tracking disabled until the reviewed production release and retention decision are complete. Production D1 already contains support records; their contents were not inspected, and no records were changed. Do not reapply migrations 0001–0003.

Cloudflare Access is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker independently validates Access JWT signature, issuer, audience, expiry and administrator allowlist. Authorized browser-session verification remains a manual acceptance test.

The repository now contains a manual-only production release workflow. Its default action is read-only binding validation; production traffic changes require `deploy=true` and the `cloudflare-production` environment secret. The release client preserves current bindings and hidden secret types, verifies the dedicated production D1 ID and Access configuration, runs post-deployment route/readiness/CORS checks, verifies query-string redaction and persistent telemetry settings, and rolls back the prior traffic split and cron schedule on failure. Workers AI and support-ticket retention are separate explicit opt-ins. Production retention remains disabled until the owner chooses a period because enabling it deletes inactive support records after the selected window.

User accounts, identity-provider login, private profiles, cloud workspace sync, model-generated assistant responses and autonomous agent execution are not live. Their implementation requires separate identity, privacy, tenant-isolation and budget decisions.

## Future backend requirements

Before production integrations, establish:

- Authentication and session lifecycle.
- Authorization checks on every protected server operation.
- Server-side secret storage; never expose provider credentials to browser JavaScript.
- API contracts with schema validation, versioning, rate limits and audit events.
- Per-user data isolation and explicit data-retention rules.
- Background job boundaries and human approval for consequential agent actions.
- Automated tests for permissions, data isolation, failure handling and abuse limits.

## Data portability

The workspace backup format is JSON with schema identifier mr-siavash-ai-workspace and version 1. Imports are capped at 256 KiB, limited to 100 tasks, validated before use, and merged without replacing existing tasks. The workspace never evicts an existing task to make room: additions stop at 100, and imports report how many new tasks were accepted or skipped because capacity is full. Task and favorite mutations persist the proposed state before committing it in memory; failed writes leave the prior in-memory state intact. Treat backup files as untrusted input.

## Deployment

GitHub Actions runs JavaScript syntax checks, OpenAPI contract validation and repository tests before publishing the static root to GitHub Pages. Third-party Actions are pinned to full commit SHAs and Dependabot monitors those pins weekly. The repository owner must enable GitHub Pages with the GitHub Actions source in repository settings. The current workflow does not deploy the Cloudflare Worker.

## API contract boundary

The proposed API is documented in `docs/backend/openapi.yaml`. It separates public module metadata and health checks from authenticated user workspace operations. The API contract is not proof that a production endpoint is running; compare every route against the deployed Worker and verify it over HTTP.

Before implementation, use `docs/THREAT_MODEL.md` and enforce user ownership in server-side repository queries. The authenticated principal must come from a verified session, never from a client-supplied user identifier.

## Shared integration contracts

See `docs/PLATFORM_CONTRACTS.md` for module manifests, identity and authorization boundaries, AI provider adapters, constrained agent execution, observability, and production release gates. These are design requirements until implemented and tested end to end.

## D1 principal, workspace and support persistence

The versioned D1 migrations establish tenant-scoped workspace tasks and idempotency records, then add opaque internal users and unique external identity mappings. Migration 0002 backfills existing owner UUIDs and rebuilds task/idempotency tables with foreign keys and deletion cascades. Migration 0003 adds support ticket, message and rate-limit tables. Read-only production inspection on 2026-11-08 confirmed these schemas exist; this is schema presence only, not evidence that their HTTP routes are deployed or that user data is being collected.

The migration validator exercises migrations in order against isolated SQLite, including data preservation and referential integrity. The Worker still has no production authentication/session middleware or cloud workspace endpoints. Do not apply existing production migrations again; preview and production databases must remain separate.
