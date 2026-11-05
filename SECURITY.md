# Security Policy

## Scope

This repository currently contains a static front-end prototype. It does not provide authentication, remote AI execution, private account storage, or a backend API.

## Reporting

Do not publish credentials, private user data, exploit details against third-party systems, or sensitive reproduction material in public issues. Use GitHub's private vulnerability reporting feature for security-sensitive reports when it is enabled for this repository.

## Client-side boundaries

- Never commit API keys, access tokens, passwords, cookies, private keys, or personal secrets.
- Browser storage is not a secure vault. Do not store authentication secrets or sensitive personal data in localStorage.
- Treat imported JSON files and all user-provided content as untrusted.
- Future server-side features must enforce authentication and authorization on the server, not only in the interface.
- Security learning modules are intended for defensive education and explicitly authorized lab environments.

## Supported security posture

The current app only stores user-created workspace tasks and favorite module IDs in the local browser profile. The service worker caches static same-origin application files and does not intercept non-GET requests or remote API traffic.


## CI supply-chain controls

- Third-party GitHub Actions in the deployment workflow are pinned to full commit SHAs rather than mutable version tags.
- Dependabot checks GitHub Actions references weekly so pinned revisions can be reviewed and updated deliberately.
- Workflow permissions remain scoped to read-only repository access for quality checks; Pages write and OIDC permissions are limited to the deployment job.
