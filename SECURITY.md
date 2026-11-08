# Security Policy

## Scope

The public website is a static GitHub Pages application. A separate Cloudflare Worker, `mr-siavash-ai-gateway`, is deployed on its `workers.dev` hostname. The production script was last verified on 2026-11-08 to expose only:

- `GET /v1/health/live`
- `GET /v1/health/ready`

The repository also contains source for public module metadata, assistant, support-ticket and administrator routes. Those routes are **source-only** and are not available in the deployed production Worker until a separately reviewed Worker release is completed and verified. A successful health response does not prove that authentication, AI assistance, private support or cloud workspace features are live.

## Administrator access boundary

A Cloudflare Access self-hosted application is configured for the Worker administrator console and API paths:

- `/admin`
- `/v1/admin/*`

The application has a single-administrator email allow policy. Its audience matches the Worker's configured Access audience; the Worker's Access team-domain, audience and administrator allowlist bindings are present. The application uses an eight-hour session, path-scoped cookies and HttpOnly cookies. This configuration protects those paths when the corresponding routes are deployed; it does not make source-only routes available.

The Worker source independently validates the Access JWT signature, issuer, audience, expiry and administrator email allowlist. Keep this server-side validation. Do not rely on a hidden frontend route or the Access proxy alone as the authorization boundary.

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

## Gateway privacy and telemetry

The Worker source currently reads query parameters only for bounded module filtering/pagination (`category`, `limit`, `cursor`) and the administrator ticket status filter (`status`). Support ticket credentials are sent in the Authorization header, not in query strings; ticket messages, contact email and assistant prompts are sent in request bodies. The source does not explicitly log request URLs or user message bodies.

A Cloudflare settings readback on 2026-11-08 verified `observability.redact_query_string: true`. Invocation logs remain enabled and persistent with a 1.0 sampling rate; traces remain enabled and persistent with a 0.1 sampling rate. Query-string redaction removes query strings from request URLs in logs and traces. It does not redact request bodies, headers, D1 records or other telemetry fields. Do not put credentials, ticket secrets or personal data in URLs, and review persistence and sampling before expanding production routes.

## CI supply-chain controls

- Third-party GitHub Actions in the deployment workflow are pinned to full commit SHAs rather than mutable version tags.
- Dependabot checks GitHub Actions references weekly so pinned revisions can be reviewed and updated deliberately.
- Workflow permissions remain scoped to read-only repository access for quality checks; Pages write and OIDC permissions are limited to the deployment job.
- Protect `main` with pull-request and current-head CI requirements, prohibit force pushes and branch deletion, and document a narrowly scoped sole-maintainer-safe bypass. As of 2026-11-08, the branch reports `protected: false` and the repository rulesets endpoint returns an empty list. The connected GitHub integration does not expose the required branch-protection/ruleset write operation; this setting remains an owner action.
