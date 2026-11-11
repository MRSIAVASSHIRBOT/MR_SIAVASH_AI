# MR_SIAVASH_AI — Architecture

## Product boundary

The primary application in this repository is a static, browser-executed front end. It must not claim consumer authentication, private cloud persistence, production model inference or remote Hub agent execution unless the corresponding backend capability is enabled and verified end to end.

## Front-end layers

1. **Presentation:** semantic HTML, RTL layout, responsive CSS, keyboard navigation, dialogs, status indicators.
2. **Client application:** module registry, hash routing, saved-module state, local task operations, JSON import/export, and Academy course-progress/resume state through a validated browser-local utility.
3. **Browser persistence:** versioned localStorage keys. Academy progress and resume metadata remain in the existing mr-siavash-ai.academy.v1 key; legacy completion arrays are preserved and normalized. Tasks and favorites synchronize across same-origin tabs through validated storage events with last-write-wins semantics. Data remains scoped to the browser profile; there is no cross-device or cloud synchronization. While explicit workspace recovery is pending, incoming task writes and storage-clear events are ignored.
4. **Offline shell:** service worker uses an explicit exact-URL allowlist for static application resources, including the Academy progress module (cache version v43). It bypasses API, authenticated, query-string, cross-origin, unknown-route, and non-GET requests; navigation fallback is limited to the app document and stores only successful HTML responses.

## Module boundaries

| Module | Responsibility | Current state |
| --- | --- | --- |
| AI Hub | Knowledge-grounded site assistant and normalized Workers AI provider adapter | Production inference is enabled through the AI binding; the release smoke verified a grounded response with sources |
| Agents Lab | Agent planning, tools, workflows and approvals | Runtime is developed in the separate MR_SIAVASH_HUB_AI project; no live connection to this site |
| Digital Studio | Public portfolio, evidence-linked case studies and local project bookmarks | Implemented as a static/public page |
| Secure Lab | Defensive security concepts and authorized learning | Academy includes a defensive web-security path; no live attack lab is exposed |
| Network & Linux Lab | Networking, Linux and troubleshooting learning | Academy includes a Linux path; no live VM or network lab is connected |
| Knowledge Library | Searchable public learning material and private research knowledge | Site search is local/public; Hub memory and knowledge remain in its separate runtime |
| Creator Studio | Media planning and production workflows | Not yet available as a connected site module |
| Digital Identity | Public project identity and privacy information | Static/public identity only; no consumer login or private profile |
| Learning Academy | Six learning paths, 30 chapters, aggregate progress dashboard and resume to last active/next incomplete chapter | Implemented; progress and resume metadata are validated and stored only in the current browser; no cloud sync or learner account |
| Python Course | Beginner Python lessons, examples, knowledge checks and guided practical tasks | Implemented; 12 lessons with task steps, acceptance criteria and sample outputs; browser-local progress; code is not executed by the site |
| Personal Workspace | Local tasks, favorites and backup/restore | Browser-only prototype |

## Backend and production boundary

MR_SIAVASH_AI has separate production and preview Cloudflare environments. Production Worker `mr-siavash-ai-gateway` is bound to `mr-siavash-ai-prod`; preview Worker `mr-siavash-ai-gateway-preview` is bound to the isolated `mr-siavash-ai-preview` database.

Production Worker `mr-siavash-ai-gateway` is bound to the dedicated `mr-siavash-ai-prod` D1 database. The 2026-11-10 control-plane readback confirms active deployment `cb861582-86ea-4899-8cff-273062d9b36c`, with version `146709f7-8158-40c8-aa80-b8b0772787f1` receiving 100% of traffic; version 12 records source commit `971a5e702876a0bc78b19c55b8b0daf358471c5b`. Production exposes health/readiness, public module metadata, a grounded Workers AI assistant, support-ticket routes, and Access-protected administrator routes. The successful production release run `42801780384` verified D1 readiness, module propagation, CORS/privacy boundaries, and a real assistant request returning `ai_grounded` with non-empty sources. The Preview Worker remains separate, uses its isolated D1 database, and has its own Access/AI configuration and daily retention schedule; Preview state does not imply shared data or configuration.

Production has the `AI` Workers AI binding and the `DB` D1 binding. The owner-selected 90-day support-retention setting is active with a daily `0 3 * * *` cleanup schedule. The schedule is configured, but the first scheduled execution still requires operational verification. Ticket intake remains gated server-side by explicit privacy acknowledgement and retention readiness; existing records were not inspected or changed. Do not reapply migrations 0001–0003.

Cloudflare Access is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker independently validates Access JWT signature, issuer, audience, expiry and administrator allowlist. Production One-time PIN sign-in was owner-confirmed on 2026-11-10; end-to-end administrator ticket workflow acceptance remains a separate manual check.

The repository contains a manual-only production release workflow. Its default action is read-only binding validation; production traffic changes require `deploy=true` and the `cloudflare-production` environment secret. The release client preserves current bindings and hidden secret types, verifies the dedicated production D1 ID and Access configuration, checks readiness and module propagation, performs support/privacy/CORS and grounded Workers AI smoke requests, and restores the prior traffic split and schedules if post-deploy checks fail. Workers AI and support retention remain explicit release inputs; the current Production configuration enables Workers AI and the owner-selected 90-day retention schedule.

On this site, consumer accounts, private profiles, cloud workspace sync and remote agent execution are not live. Production model-generated grounded assistant responses are enabled through Workers AI. MR_SIAVASH_HUB_AI is a separate local-first agent runtime; it is not connected to this site. Any future connection requires the explicit trust boundary in docs/decisions/0004-hub-integration-boundary.md.

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


## Academy chapter content model

The six Academy paths retain their existing course IDs, lesson arrays and browser-local progress key. Detailed instructional material is stored separately in `academy-guides.mjs` and accessed by the stable `courseId + lessonIndex` pair. Each of the 30 guide records includes an objective, concepts, guided practice, independent challenge, assessment checklist and common pitfalls. The UI creates semantic disclosure and section elements and assigns all authored content through `textContent`; the guide module is part of the explicit offline shell allowlist (cache v44). This separation allows instructional content to expand without changing completion-index compatibility.


## Academy assessment and capstone model

`academy-assessments.mjs` owns immutable assessment definitions for the six stable course IDs. Each path has five multiple-choice questions with one keyed answer and a post-submission explanation, plus a capstone brief, deliverable checklist and self-review rubric. `gradeAcademyAssessment` returns a deterministic score and applies the 80% pass threshold.

The UI renders question fieldsets, native radio inputs and checklist controls with semantic DOM elements. Learner results and project checklist selections are normalized and serialized separately from lesson completion, using `mr-siavash-ai.academy.assessments.v1`; the existing `mr-siavash-ai.academy.v1` progress contract is unchanged. Both stores are browser-local only. The module is precached by service-worker shell v45.


## Academy portfolio and tutor boundary

The Academy portfolio module derives achievements and course summaries from the existing validated browser-local progress and assessment stores. It exports a versioned JSON report and offers print output. The report is explicitly self-reported local evidence, not an identity-verified credential or independent project review. The Academy tutor calls the existing public Gateway route `POST /v1/assistant/chat` with a bounded message, no credentials, browser-stored secrets, or action execution, and a 15-second timeout. The Gateway enforces a 1,200-character message limit, rate limiting, verified knowledge retrieval, and a grounded response contract; the browser only renders source links that resolve to the same site origin. Both modules are in the exact offline shell allowlist (cache v46).
