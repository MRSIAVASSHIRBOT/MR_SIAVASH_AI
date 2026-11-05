# MR_SIAVASH_AI — Threat Model (Initial)

**Scope:** current static website and proposed future API contract. This is a design baseline, not a penetration-test report or security certification.

## Assets
- User-created workspace tasks and saved module IDs.
- Future account identity, session credentials and private profile data.
- Future AI-provider credentials and agent execution permissions.
- Repository integrity, deployment workflow and public static assets.
- Availability and integrity of module metadata and user data.

## Trust boundaries
1. Browser UI ↔ browser storage: all stored values are user-controlled.
2. Browser ↔ public static hosting: assets must be served over HTTPS.
3. Browser ↔ future API: requests are untrusted; authorization is server-side.
4. Backend ↔ database: tenant boundaries and least-privilege identities are mandatory.
5. Backend ↔ AI providers/tools: secrets and tool permissions remain server-side.

## STRIDE review

| Threat | Example | Required mitigation before production |
| --- | --- | --- |
| Spoofing | Forged or replayed session token | Validated identity provider, issuer/audience checks, expiry, rotation and revocation |
| Tampering | Modified local task or imported JSON | Treat browser data as untrusted; validate schemas and enforce ownership server-side |
| Repudiation | Sensitive action has no audit record | Correlation IDs and privacy-aware audit events |
| Information disclosure | One user reads another user's tasks | Derive principal from verified session; tenant-scoped queries and isolation tests |
| Denial of service | Large payloads or request floods | Body limits, pagination caps, rate limits, timeouts and bounded queues |
| Elevation of privilege | Client changes role or module permissions | Deny-by-default server authorization; never trust UI role state |

## Current prototype controls
- No provider API key or server credential is embedded in client JavaScript.
- Imported workspace files are size-limited and schema-checked.
- Task text is rendered as text, not interpreted as HTML.
- Service worker uses an exact-URL allowlist for public static shell assets; it bypasses API-like, authenticated, query-string, unknown-route, cross-origin and non-GET requests.
- Navigation caching is limited to the app document and stores only successful HTML responses; it is not a general response cache.
- Static prototype does not claim account authentication or cloud persistence.

## Production release blockers
- Authentication and account recovery threat review.
- Authorization matrix and automated cross-user isolation tests.
- Secret manager and credential rotation process.
- CSRF/CORS/session design for the chosen authentication model.
- Input validation, output encoding, rate limits, request-size and timeout controls.
- Audit event policy, retention schedule and deletion/export workflow.
- Dependency, container, secret and static analysis checks in CI.
- Backup restoration test and incident response procedure.

## Security acceptance rule
A feature touching private data, credentials, billing, external tools or consequential agent actions must not be released based on front-end checks alone. It requires server-side enforcement, negative tests, reviewable audit behavior and a documented rollback path.


## Cross-tab local-storage boundary

- Storage events are treated as untrusted input and validated before state replacement.
- The browser's local storage remains user-controlled and same-origin; it is not an authentication or authorization boundary.
- Concurrent edits from multiple tabs are last-write-wins. The prototype does not promise conflict-free merging, durable multi-device synchronization, or recovery from every browser storage failure.
