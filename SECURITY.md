# Security Policy

## Scope

The public website is a static GitHub Pages application. A separate Cloudflare Worker, `mr-siavash-ai-gateway`, is deployed on its `workers.dev` hostname. A Cloudflare control-plane inspection on 2026-11-08 identified deployed version `f7d5a92e-2694-4af1-8b99-18d04742925d`.

The deployed Worker currently contains health/readiness, a knowledge-fallback assistant endpoint, public support ticket creation/read/reply endpoints, and Access-protected administrator console/API routes. It does not yet contain the current repository's public `/v1/modules` route or scheduled retention handler. The current `main` source and isolated preview Worker contain those newer capabilities. Production has no Workers AI binding; no model-generated assistant response is active.

The public UI continues to disable ticket submission and tracking until the reviewed production release and retention decision are complete. Production D1 already contains support records; their contents were not inspected or exported. Do not reset the database, reapply migrations 0001–0003, or enable automatic deletion without explicit owner approval.

## Administrator access boundary

A Cloudflare Access self-hosted application is configured for:
- `/admin`
- `/v1/admin/*`

The application has a single-administrator email allow policy. Its audience matches the Worker's configured Access audience; the Worker's Access team-domain, audience and administrator allowlist bindings are present. The application uses an eight-hour session, path-scoped cookies and HttpOnly cookies.

The Worker independently validates Access JWT signature, issuer, audience, expiry and the administrator email allowlist. Keep this server-side validation. A protected route and a configured Access application do not replace an end-to-end authorized browser-session test.

## Gateway privacy and telemetry

Support ticket text and optional contact email are stored in D1. Ticket credentials are returned once and stored only as SHA-256 hashes. Ticket credentials are sent in the Authorization header, not URLs. Assistant prompts and ticket messages are request-body data; do not put them in query strings, logs or analytics.

A Cloudflare settings readback verified `observability.redact_query_string: true`. Persistent invocation logs and traces remain enabled. Query-string redaction does not redact request bodies, headers, D1 records or other telemetry fields.

The current Worker source includes a scheduled cleanup handler for inactive support tickets, expired idempotency records and rate-limit buckets. Preview uses a 90-day inactivity period. Production has no retention cron. Enabling production retention deletes existing inactive support tickets and linked messages after the explicitly selected period; it is disabled by default in the production release workflow and requires owner approval.

## Production release boundary

The production release workflow is manual-only and defaults to read-only configuration validation. A production traffic change requires `deploy=true`, a configured `cloudflare-production` GitHub environment and a scoped Cloudflare API token. Workers AI and support retention are separate opt-ins. The release client validates the production D1 identifier and Access bindings, preserves hidden secret binding types, performs route/readiness/CORS smoke checks, verifies observability settings, and restores the previous traffic split/schedules if post-deploy checks fail.

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
