# MR_SIAVASH_AI — Threat Model (Initial)

**Scope:** current static website and proposed future API contract. This is a design baseline, not a penetration-test report or security certification.

## Assets
- User-created workspace tasks and saved module IDs.
- Future account identity, session credentials and private profile data.
- Future AI-provider credentials and agent execution permissions.
- Repository integrity, deployment workflow and public static assets.
- Availability and integrity of module metadata and user data.

## Trust boundaries
1. Browser UI ↔ browser storage: all stored values are user-controlled and readable by the browser profile owner.
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

## Client-side attack surface
- Stored and imported task text must remain text-only at render time; it must never be interpreted as HTML.
- Local storage is mutable by the user and accessible to scripts executing in the origin. It is not a credential store or a confidentiality boundary.
- JSON import must remain size-bounded, schema-checked, and defensive against malformed or oversized collections.
- Service-worker cache scope must remain same-origin and scoped to the app path; non-GET requests must not be cached or intercepted.
- Dependency-free checks can detect selected dangerous patterns but cannot prove runtime safety or replace browser testing.

## Current prototype controls
- No provider API key or server credential is embedded in client JavaScript.
- Imported workspace files are size-limited and schema-checked.
- Task text is rendered as text, not interpreted as HTML.
- Service worker handles same-origin GET resources only and does not intercept writes.
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
- Manual keyboard, screen-reader, mobile, offline and install verification.

## Security acceptance rule
A feature touching private data, credentials, billing, external tools or consequential agent actions must not be released based on front-end checks alone. It requires server-side enforcement, negative tests, reviewable audit behavior and a documented rollback path.
