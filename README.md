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
- Accessible global search with weighted Persian/Arabic normalization, module discovery, all 30 academy chapters and all 12 Python lessons, keyboard result navigation, and direct lesson deep links (Ctrl/Cmd + K).
- A local support guide that searches the public site index without sending chat text to a server, plus a public ticket create/track/reply flow with an explicit privacy acknowledgement. New ticket intake stays disabled until production confirms a valid support-retention policy; tracking existing tickets remains available while D1 is healthy.
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

Remote agent execution, consumer user accounts, private profiles, cloud synchronization, billing, and authenticated workspace persistence are not live product features. The production Worker already exposes health, knowledge-fallback assistant, support-ticket and Access-protected administrator routes, but it is behind current main and does not yet expose the public module catalog or scheduled retention handler.

A Cloudflare Access self-hosted application is configured for the Worker paths `/admin` and `/v1/admin/*`, with an allow policy restricted to the designated administrator identity. The Worker source also validates the Access JWT and administrator allowlist. Cloudflare Access is configured and the deployed Worker serves the protected administrator routes; end-to-end authorized browser-session verification remains outstanding. The production Worker has no Workers AI binding, so model-generated assistant responses are not active. Do not enter secrets, passwords, private keys, or sensitive personal data into the static site.

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
- manifest.webmanifest — installable web-app metadata
- sw.js — static-shell offline cache
- tests/site.test.mjs — dependency-free Node.js structure and safety checks
- tests/academy.test.mjs — academy curriculum, rendering, and progress safety checks
- tests/python-course.test.mjs — Python curriculum and safety regression checks
- tests/service-worker.test.mjs — runtime regression tests for static-cache isolation and navigation boundaries
- .github/workflows/deploy.yml — quality checks and GitHub Pages deployment
- .github/workflows/gateway-smoke.yml — read-only deployed Worker liveness/readiness and CORS smoke checks
- cloudflare/gateway/ — Worker source, D1 migrations, tests, isolated preview and guarded production release documentation
- docs/ARCHITECTURE.md — current boundaries and future integration plan
- docs/decisions/0001-cloudflare-backend-boundary.md — Cloudflare backend decision record
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

## Backend contract (design and source stage)

- docs/backend/openapi.yaml defines the v1 API boundary.
- docs/THREAT_MODEL.md records the initial security threat model.
- docs/backend/README.md explains the implementation gates.
- docs/ROADMAP.md coordinates the workstreams and release stages.
- docs/PLATFORM_CONTRACTS.md defines shared integration and production-readiness requirements.

The frontend remains static and does not itself provide consumer authentication or cloud synchronization. The production Worker exposes assistant knowledge fallback, public support ticket routes and Access-protected administrator routes, but current main has additional module metadata and scheduled retention functionality not yet deployed. Production D1 already contains support records; their contents were not inspected. Workers AI is not bound to the production Worker.

## Local support guide and global search

- Global search indexes site sections, module cards and the Python Academy course; use Ctrl+K.
- The floating support center currently provides a browser-local, keyword-ranked guide over public site metadata. It is not an LLM chatbot and does not send chat text to a server. Ticket submission and tracking remain disabled in the deployed UI until the reviewed production Worker release and explicit retention decision are complete.
- Gateway endpoints in source: POST /v1/assistant/chat; POST /v1/support/tickets; GET /v1/support/tickets/:code; POST /v1/support/tickets/:code/messages; administrator list/detail/reply/status routes under /v1/admin/support/tickets.
- D1 migration 0003 adds support tickets, messages and hashed-IP rate-limit buckets. Read-only inspection on 2026-11-08 confirmed the production support tables and existing records; record contents were not inspected. Do not reset the database or enable automatic deletion without explicit approval.
- AI generation is optional and runs only with an AI binding and configured AI_MODEL. Production currently has no AI binding; verified FAQ fallback is available in source.
- Admin APIs verify Cloudflare Access JWT signature, issuer, audience, expiry and administrator email allowlist. Cloudflare Access protects /admin and /v1/admin/* for the designated administrator identity.
- A ticket token is displayed once and never persisted in browser storage. Store it privately to check replies later.
