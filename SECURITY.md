# Security Policy

## Scope

The deployed Production Worker serves health/readiness, public module metadata, a grounded Workers AI assistant, support-ticket routes, and Access-protected administrator routes.

The public website is a static GitHub Pages application. The production Worker, `mr-siavash-ai-gateway`, is deployed on its `workers.dev` hostname. A separate Preview Worker, `mr-siavash-ai-gateway-preview`, uses an isolated D1 database. On 2026-11-10, Cloudflare confirmed Production version `146709f7-8158-40c8-aa80-b8b0772787f1` at 100% traffic under deployment `cb861582-86ea-4899-8cff-273062d9b36c`.

Production contains health/readiness, public `/v1/modules` metadata, a grounded Workers AI assistant, public support-ticket routes, a scheduled retention handler, and Access-protected administrator console/API routes. The production release run `42801780384` passed the grounded assistant smoke request, which returned `mode: ai_grounded` with non-empty sources. Preview remains a separate environment with its own isolated D1 and Access/AI configuration.

The public UI gates new ticket intake on explicit privacy acknowledgement and the Worker's retention-readiness response; ticket tracking requires the one-time bearer token. Production D1 contains support records; their contents were not inspected or exported. Do not reset the database, reapply migrations 0001–0003, or change the owner-selected retention period without approval.

## Administrator access boundary

A Cloudflare Access self-hosted application is configured for:
- `/admin`
- `/v1/admin/*`

The application has a single-administrator email allow policy. Its audience matches the Worker's configured Access audience; the Worker's Access team-domain, audience and administrator allowlist bindings are present. The application uses an eight-hour session, path-scoped cookies and HttpOnly cookies.

The Worker independently validates Access JWT signature, issuer, audience, expiry and the administrator email allowlist. Keep this server-side validation. Production One-time PIN sign-in was owner-confirmed on 2026-11-10; end-to-end administrator ticket workflow acceptance remains a separate test.

## Gateway privacy and telemetry

Support ticket text and optional contact email are stored in D1. Ticket credentials are returned once and stored only as SHA-256 hashes. Ticket credentials are sent in the Authorization header, not URLs. Assistant prompts and ticket messages are request-body data; do not put them in query strings, logs or analytics.

A Cloudflare settings readback verified `observability.redact_query_string: true`. Persistent invocation logs and traces remain enabled. Query-string redaction does not redact request bodies, headers, D1 records or other telemetry fields.

The current Worker includes a scheduled cleanup handler for inactive support tickets, expired idempotency records and rate-limit buckets. Production and Preview each have separate 90-day inactivity settings and daily `0 3 * * *` schedules. Production's schedule is configured; verify the first scheduled execution through telemetry. The owner explicitly selected the 90-day period; do not change it or run manual destructive cleanup without approval.

## Production release boundary

The production release workflow is manual-only and defaults to read-only configuration validation. A production traffic change requires `deploy=true`, a configured `cloudflare-production` GitHub environment and a scoped Cloudflare API token. Workers AI and support retention remain separate explicit inputs. The release client validates the production D1 identifier and Access bindings, preserves hidden secret binding types, performs readiness/module/privacy/CORS and grounded AI smoke checks, verifies observability settings, and restores the previous traffic split/schedules if post-deploy checks fail.

## Reporting

Do not publish credentials, private user data, exploit details against third-party systems, or sensitive reproduction material in public issues. Use GitHub's private vulnerability reporting feature for security-sensitive reports when it is enabled for this repository.

## Client-side boundaries

- Never commit API keys, access tokens, passwords, cookies, private keys, or personal secrets.
- Browser storage is not a secure vault. Do not store authentication secrets or sensitive personal data in localStorage.
- The current browser application stores workspace tasks, favorite module IDs and Academy course progress locally in the browser profile. These values are not cloud-synchronized.
- Treat imported JSON files and all user-provided content as untrusted.
- Future server-side features must enforce authentication and authorization on the server, not only in the interface.
- Security learning modules are intended for defensive education and explicitly authorized lab environments.
- The service worker caches static same-origin application files and does not intercept non-GET requests or remote API traffic.

## CI supply-chain controls

- Third-party GitHub Actions in deployment workflows are pinned to full commit SHAs.
- Dependabot checks GitHub Actions references weekly so pinned revisions can be reviewed and updated deliberately.
- Workflow permissions remain scoped to read-only repository access for quality checks; Pages write and OIDC permissions are limited to the deployment job.
- Protect `main` with pull-request and current-head CI requirements, prohibit force pushes and branch deletion, and document a narrowly scoped sole-maintainer-safe bypass. As of 2026-11-08, the branch reports `protected: false` and the repository rulesets endpoint returns an empty list. The connected GitHub integration does not expose the required branch-protection/ruleset write operation; this setting remains an owner action.
