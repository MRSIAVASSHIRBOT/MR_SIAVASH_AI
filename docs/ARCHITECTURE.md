# MR_SIAVASH_AI — Architecture

## Product boundary

The primary application in this repository is a static, browser-executed front end. It must not claim consumer authentication, private cloud persistence, production model inference or remote Hub agent execution unless the corresponding backend capability is enabled and verified end to end.

## Front-end layers

1. **Presentation:** semantic HTML, RTL layout, responsive CSS, keyboard navigation, dialogs, status indicators.
2. **Client application:** module registry, hash routing, saved-module state, local task operations, JSON import/export, and Academy course-progress/resume state through a validated browser-local utility.
3. **Browser persistence:** versioned localStorage keys. Academy progress and resume metadata remain in the existing mr-siavash-ai.academy.v1 key; legacy completion arrays are preserved and normalized. Tasks and favorites synchronize across same-origin tabs through validated storage events with last-write-wins semantics. Data remains scoped to the browser profile; there is no cross-device or cloud synchronization. While explicit workspace recovery is pending, incoming task writes and storage-clear events are ignored.
4. **Offline shell:** service worker uses an explicit exact-URL allowlist for static application resources, including the Academy progress module (cache version v39). It bypasses API, authenticated, query-string, cross-origin, unknown-route, and non-GET requests; navigation fallback is limited to the app document and stores only successful HTML responses.

## Module boundaries

| Module | Responsibility | Current state |
| --- | --- | --- |
| AI Hub | Knowledge-grounded site assistant and normalized Workers AI provider adapter | Source adapter implemented; production inference remains disabled without an AI binding |
| Agents Lab | Agent planning, tools, workflows and approvals | Runtime is developed in the separate MR_SIAVASH_HUB_AI project; no live connection to this site |
| Digital Studio | Public portfolio, evidence-linked case studies and local project bookmarks | Implemented as a static/public page |
| Secure Lab | Defensive security concepts and authorized learning | Academy includes a defensive web-security path; no live attack lab is exposed |
| Network & Linux Lab | Networking, Linux and troubleshooting learning | Academy includes a Linux path; no live VM or network lab is connected |
| Knowledge Library | Searchable public learning material and private research knowledge | Site search is local/public; Hub memory and knowledge remain in its separate runtime |
| Creator Studio | Media planning and production workflows | Not yet available as a connected site module |
| Digital Identity | Public project identity and privacy information | Static/public identity only; no consumer login or private profile |
| Learning Academy | Six learning paths, 30 chapters, aggregate progress dashboard and resume to last active/next incomplete chapter | Implemented; progress and resume metadata are validated and stored only in the current browser; no cloud sync or learner account |
| Python Course | Beginner Python lessons, examples and knowledge checks | Implemented; 12 lessons with browser-local progress; code is not executed by the site |
| Personal Workspace | Local tasks, favorites and backup/restore | Browser-only prototype |

## Backend and production boundary

MR_SIAVASH_AI has separate production and preview Cloudflare environments. Production Worker `mr-siavash-ai-gateway` is bound to `mr-siavash-ai-prod`; preview Worker `mr-siavash-ai-gateway-preview` is bound to the isolated `mr-siavash-ai-preview` database.

A Cloudflare control-plane readback on 2026-11-10 identified production Worker version `f7d5a92e-2694-4af1-8b99-18d04742925d` still receiving 100% traffic. The current repository `main` source is commit `7d884683e0899d7f61e69e8cf2865228b9379c3d`; PR #133 fixes the production uploader to include the complete Worker module graph, but that source has not yet been deployed to production. That deployed bundle exposes health/readiness, a knowledge-fallback assistant endpoint, public support-ticket create/read/reply endpoints, and Access-protected administrator console/API routes. It does not yet contain the current repository's `GET /v1/modules` route or the scheduled data-retention handler. The preview Worker runs current `main` source and its runtime smoke workflow passed health, D1 readiness, module catalog, grounded fallback, support validation, admin fail-closed and CORS checks.

The production Worker has no Workers AI binding; its assistant endpoint therefore uses verified knowledge fallback rather than model inference. Its settings include `SUPPORT_RETENTION_DAYS=90`, but no scheduled Cron is configured, so automatic retention cleanup is inactive. New public ticket intake remains disabled until the reviewed production release and retention decision are complete; existing ticket tracking is a separate route and remains subject to D1 availability. Production D1 already contains support records; their contents were not inspected, and no records were changed. Do not reapply migrations 0001–0003.

Cloudflare Access is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker independently validates Access JWT signature, issuer, audience, expiry and administrator allowlist. Authorized browser-session verification remains a manual acceptance test.

The repository now contains a manual-only production release workflow. Its default action is read-only binding validation; production traffic changes require `deploy=true` and the `cloudflare-production` environment secret. The release client preserves current bindings and hidden secret types, verifies the dedicated production D1 ID and Access configuration, runs post-deployment route/readiness/CORS checks, verifies query-string redaction and persistent telemetry settings, and rolls back the prior traffic split and cron schedule on failure. Workers AI and support-ticket retention are separate explicit opt-ins. Production retention remains disabled until the owner chooses a period because enabling it deletes inactive support records after the selected window.

On this site, consumer accounts, identity-provider login, private profiles, cloud workspace sync, production model-generated responses and remote agent execution are not live. The normalized provider adapter exists in source but remains dormant without a production Workers AI binding. MR_SIAVASH_HUB_AI is a separate local-first agent runtime; it is not connected to this site. Any future connection requires the explicit trust boundary in docs/decisions/0004-hub-integration-boundary.md.

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


## Cross-project integration boundary

MR_SIAVASH_AI is the public-facing identity, portfolio and learning surface. MR_SIAVASH_HUB_AI is a separate local-first control plane and agent runtime with its own authentication, owner-scoped data, policy checks, approvals and audit records. They currently have no shared identity, database, API session or live runtime connection.

The public site does not call the Hub API or query its local runtime. Its first read-only integration is a build-time snapshot generated from two public GitHub endpoints: the Hub main-branch commit and latest main-branch CI run. Only allowlisted metadata is written to the versioned hub-status.json contract; API failure produces an explicit unavailable fallback. This is repository/CI metadata, not runtime health. The site must not expose a Hub port through a public tunnel or store Hub credentials in browser storage. Private memory, tasks, files and agent actions still require owner-initiated pairing and scoped authorization. See ADR-0004.
