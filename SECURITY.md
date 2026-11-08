# Security Policy

## Scope

The public website is a static GitHub Pages application. A separate Cloudflare Worker, `mr-siavash-ai-gateway`, is deployed on its `workers.dev` hostname, but the production script was last verified on 2026-11-08 to expose health endpoints only:

- `GET /v1/health/live`
- `GET /v1/health/ready`

The repository also contains source for module metadata, assistant, support-ticket and administrator routes. Those routes are **source-only** and are not available in the deployed production Worker until a separately reviewed release is completed and verified. Do not infer that authentication, AI assistance, private support or cloud workspace features are live from a successful health response.

Cloudflare Access was not enabled for this account at the 2026-11-08 inspection. The administrator experience must not be exposed until a path-scoped Access application, verified identity configuration and Worker-side authorization are deployed and tested.

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

A read-only Cloudflare settings inspection on 2026-11-08 found query-string redaction disabled for the deployed Worker, with persistent invocation logs and traces enabled. Platform telemetry may therefore retain query strings. Do not put credentials, ticket secrets, personal data or other sensitive values in URLs. Enable platform-level query-string redaction and review log/trace persistence and sampling before expanding production routes. Any account-level telemetry change must be reviewed and approved by the account owner.

## CI supply-chain controls

- Third-party GitHub Actions in the deployment workflow are pinned to full commit SHAs rather than mutable version tags.
- Dependabot checks GitHub Actions references weekly so pinned revisions can be reviewed and updated deliberately.
- Workflow permissions remain scoped to read-only repository access for quality checks; Pages write and OIDC permissions are limited to the deployment job.
- Protect `main` with pull-request and current-head CI requirements, prohibit force pushes and branch deletion, and document a narrowly scoped sole-maintainer-safe bypass. These repository governance settings were not enabled as of the 2026-11-08 read-only inspection and require owner-level configuration.
