# MR_SIAVASH_AI

A Persian-first, modular digital workspace for AI, software development, network and Linux learning, defensive cybersecurity, knowledge, and creative production.

## Product model

MR_SIAVASH_AI is one ecosystem made of independently usable modules. Modules have explicit boundaries and can collaborate through documented interfaces when integrations are implemented. The product favors transparent capability status: a prototype is not presented as a production service.

## Current front-end release

The repository provides a static web application with:
- Responsive Persian / RTL interface and hash-based navigation.
- Searchable module catalog with category filters and saved modules.
- A Persian beginner Python course with 12 lessons, practical code samples, expected outputs, knowledge checks, and browser-local progress. The site does not execute Python; learners run copied examples in Python 3.
- A Persian multi-course academy with six learning paths and 30 chapters covering HTML, CSS, JavaScript, Git/GitHub, Linux, and defensive web security. Course progress is stored locally in the current browser.
- A dedicated Digital Studio portfolio with guided visitor paths, evidence-linked project case studies, curated official references, local project bookmarks, and a concise print-ready project profile. Project statuses are reviewed against each repository README and commit history; the page does not invent credentials or claim unverified production capabilities.
- The Digital Studio registers the same versioned service worker for direct entry, includes its page and assets in the offline shell, and clearly distinguishes the browser-local support guide from the optional, consent-gated gateway assistant API.
- Accessible global search with weighted Persian/Arabic normalization, module discovery, all 30 academy chapters and all 12 Python lessons, keyboard result navigation, and direct lesson deep links (Ctrl/Cmd + K).
- A support assistant with a browser-local guide by default and a separately selectable online AI mode that sends only the current question after explicit per-question consent, plus a public ticket create/track/reply flow with an explicit privacy acknowledgement. Ticket intake is enabled only when the gateway readiness endpoint confirms a healthy D1 database and the configured support-retention policy; ticket tracking requires database readiness.
- Browser-local workspace task manager with search, status filters, progress counts and confirmed bulk cleanup.
- Non-destructive workspace recovery: unreadable or repaired snapshots block implicit overwrites until an explicit validated-backup import; cross-tab writes and storage-clear events cannot bypass the recovery lock.
- Local workspace recovery repairs missing or duplicate task IDs and explicitly reports discarded invalid or over-capacity records instead of silently truncating task text.
- JSON export and validated, bounded JSON import for local workspace data, defined by schemas/workspace-backup.schema.json.
- Restrictive same-origin Content Security Policy and Referrer-Policy on the static entry document.
- PWA manifest and versioned service-worker cache for the static app shell, including the module registry.
- Accessible CSS 3D hero motion with bounded pointer-responsive parallax on fine pointers, frame-throttled updates in an isolated scene layer, manual pause control, live reduced-motion preference handling, hidden-tab suspension, and progressive scroll reveals.
- GitHub Actions workflow with syntax, API-contract and repository tests; GitHub Pages deployment is gated to successful pushes or manual runs on main.
- Separate read-only Cloudflare gateway smoke workflow checks deployed liveness/readiness and allowed-origin CORS and verifies that untrusted origins receive no CORS grant; it requires no API token.

### What is not connected yet

Remote agent execution from this site, consumer user accounts, private profiles, cloud synchronization, billing, and authenticated workspace persistence are not live product features. MR_SIAVASH_HUB_AI is a separate local-first project; the Digital Studio shows a build-time snapshot of public GitHub commit and CI metadata only. There is no direct API connection to the Hub runtime, shared identity, private-data sync or remote agent session; the panel does not report local runtime health. The integration boundary is documented in docs/decisions/0004-hub-integration-boundary.md. The Production Worker release at commit `080c007` exposes liveness/readiness, a nine-module public catalog, the grounded assistant API, support-ticket endpoints, Access-protected administrator routes, and the scheduled retention cleanup handler. The floating support guide defaults to browser-local search; its optional online mode sends only the current question to the grounded assistant API after explicit consent.

Production and Preview each have a dedicated Cloudflare Access self-hosted application protecting `/admin` and `/v1/admin/*` with the same single-administrator allow policy. The Worker independently validates the Access JWT signature, issuer, audience, expiry, not-before time and administrator email allowlist. Anonymous requests to protected paths are blocked at the Access edge; end-to-end authorized browser-session acceptance testing remains outstanding. The Production Worker is configured with the Cloudflare Workers AI binding and model `@cf/zai-org/glm-4.7-flash`. The reviewed release smoke test exercised `POST /v1/assistant/chat` and required a grounded response with source references. This verifies the tested request path, not a guarantee of uninterrupted model availability or answer correctness. Do not enter secrets, passwords, private keys, or sensitive personal data into the static site.

## Browser quality and accessibility checks

- The pinned Chromium workflow runs real-browser acceptance for Academy learning progress, the isolated JavaScript practice runner, local draft CRUD/export, storage-failure recovery, and mobile search.
- A separate pinned Chromium audit checks the five primary public routes with axe-core against WCAG 2.1 A/AA and axe best-practice rules; critical and serious violations fail CI. Structural checks also cover language/direction, title, main landmark, visible heading, unique IDs, labelled controls, accessible names, image alternative text, iframe titles, safe external links, mobile/desktop content overflow, and uncaught page errors.
- This automated subset is not a formal WCAG conformance claim. Manual keyboard, screen-reader, zoom/reflow, and real-device evaluation remain necessary.

## Repository structure

- index.html — application shell and page sections
- styles.css — visual system and responsive layouts
- app.js — navigation, registry validation, favorites, local workspace and data portability
- python.html, python-course.js, python-course.css — standalone interactive Python beginner course
- academy.html, academy.js, academy.css — searchable multi-course learning academy and local progress tracker
- modules.json — versioned, validated module catalog (public static metadata)
- bounded-json.js — shared same-origin JSON loader with timeout, content-type validation, and streamed byte limits
- search-index.json and site-search.js — bounded, validated global search index and accessible result navigation
- Workspace tasks and favorites synchronize between same-origin tabs through validated browser storage events (last-write-wins; no cloud sync)
- schemas/module-registry.schema.json — formal JSON Schema 2020-12 contract for module metadata
- schemas/workspace-backup.schema.json — formal JSON Schema 2020-12 contract for local workspace backups
- schemas/hub-public-status.schema.json and hub-status.json — versioned, public-only Hub repository/CI metadata contract and safe fallback
- scripts/generate-hub-public-status.mjs — bounded build-time fetch of public GitHub metadata; no Hub credentials or private runtime access
- manifest.webmanifest — installable web-app metadata
- sw.js — static-shell offline cache
- tests/site.test.mjs — dependency-free Node.js structure and safety checks
- tests/academy.test.mjs — academy curriculum, rendering, and progress safety checks
- tests/python-course.test.mjs — Python curriculum and safety regression checks
- tests/service-worker.test.mjs — runtime regression tests for static-cache isolation and navigation boundaries
- scripts/generate-hub-public-status.test.mjs — allowlist, response-size, stale-CI and fallback tests
- .github/workflows/deploy.yml — quality checks and GitHub Pages deployment
- .github/workflows/gateway-smoke.yml — read-only deployed Worker liveness/readiness and CORS smoke checks
- cloudflare/gateway/ — Worker source, D1 migrations, tests, isolated preview and guarded production release documentation
- docs/ARCHITECTURE.md — current boundaries and future integration plan
- docs/decisions/0001-cloudflare-backend-boundary.md — Cloudflare backend decision record
- docs/decisions/0004-hub-integration-boundary.md — safe integration boundary for MR_SIAVASH_HUB_AI
- SECURITY.md — security reporting and current security boundaries

## Run locally

Use Node.js 22 or a Python static server from the repository root:

    python -m http.server 8080

Then open http://localhost:8080. Service-worker installation requires HTTPS or localhost.

Run repository checks:

    node --check app.js
    node --check sw.js
    node --test tests/*.test.mjs
    node --check cloudflare/gateway/src/index.js
    node --test cloudflare/gateway/tests/*.test.mjs

## Deploy with GitHub Pages

1. Open repository Settings → Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push to main, or run the workflow manually from Actions.

The workflow runs syntax and structure tests before uploading the static site. The first deployment still requires GitHub Pages to be enabled for this repository.

## Engineering principles

- Modular boundaries before feature sprawl.
- Least privilege and no secrets in browser code.
- Validate imported data and treat user-generated content as untrusted.
- Accessibility, responsive behavior, and clear empty / error states.
- Explicitly distinguish implemented behavior from roadmap items.
- Prefer small, reviewable changes and automated checks.

## License

No license has been granted yet. All rights are reserved by the repository owner unless a license is added.

## Backend API and production status

- docs/backend/openapi.yaml defines the v1 API boundary.
- docs/THREAT_MODEL.md records the initial security threat model.
- docs/backend/README.md explains the implementation gates.
- docs/ROADMAP.md coordinates the workstreams and release stages.
- docs/PLATFORM_CONTRACTS.md defines shared integration and production-readiness requirements.

The frontend remains static and does not itself provide consumer authentication or cloud synchronization. The Production Worker release at `080c007` is deployed with the Workers AI binding, public module catalog, support-ticket API, Access-protected administrator routes, D1 binding, and 90-day support-retention configuration with a daily `0 3 * * *` UTC cleanup schedule. The production release workflow verifies readiness, module propagation, privacy/consent behavior, CORS policy, and a grounded AI request. Production D1 contains support records; their contents were not inspected. Automatic cleanup is limited by the configured inactivity policy; do not reset the database or inspect ticket contents as part of routine verification.

## Local support guide and global search

- Global search indexes site sections, module cards and the Python Academy course; use Ctrl+K.
- The floating support center defaults to a browser-local, keyword-ranked guide over public site metadata. Users may explicitly switch to the online assistant; each submitted question requires a separate privacy acknowledgement and only that current question is sent to `POST /v1/assistant/chat` (no conversation history or ticket creation). The Gateway uses verified site context and falls back to verified knowledge if Workers AI is unavailable. Ticket submission becomes available only after the frontend readiness gate confirms D1 and the 90-day retention configuration; tracking is gated on database readiness.
- Gateway endpoints in source: POST /v1/assistant/chat; POST /v1/support/tickets; GET /v1/support/tickets/:code; POST /v1/support/tickets/:code/messages; administrator list/detail/reply/status routes under /v1/admin/support/tickets.
- D1 migration 0003 adds support tickets, messages and hashed-IP rate-limit buckets. Read-only inspection on 2026-11-08 confirmed the production support tables and existing records; record contents were not inspected. Do not reset the database, manually trigger destructive cleanup, or change the configured retention period without explicit approval.
- AI generation is optional at the source/configuration level and uses the Workers AI binding plus `AI_MODEL`. The current Production release has the binding enabled and was smoke-tested against the grounded assistant contract; if the provider is unavailable or returns unusable output, the Worker falls back to verified site knowledge.
- Admin APIs verify Cloudflare Access JWT signature, issuer, audience, expiry and administrator email allowlist. Cloudflare Access protects /admin and /v1/admin/* for the designated administrator identity.
- A ticket token is displayed once and never persisted in browser storage. Store it privately to check replies later.
