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



## Workspace recovery and overwrite protection

- If stored task data is unreadable, has an invalid or unsupported versioned envelope (including a JSON `null` value or empty snapshot), has an invalid task container, or requires record repair/discard/capacity trimming, ordinary task mutations are blocked.
- A validated backup import is the explicit recovery path that may replace the damaged snapshot; a normal add, toggle, delete, bulk cleanup, cross-tab workspace update, or cross-tab storage-clear event must not silently replace or discard the protected in-memory view.
- Export remains available so the user can preserve the normalized view before explicitly restoring it.
- This is a browser-local data-integrity guard, not a guarantee against browser profile loss, storage eviction, or device failure.

## Cross-tab local-storage boundary

- Storage events are treated as untrusted input and validated before state replacement.
- The browser's local storage remains user-controlled and same-origin; it is not an authentication or authorization boundary.
- Concurrent edits from multiple tabs are last-write-wins. The prototype does not promise conflict-free merging, durable multi-device synchronization, or recovery from every browser storage failure.


## Static browser security policy

- The HTML entry document declares a restrictive meta-delivered Content Security Policy: scripts, styles, connections, manifests and workers are same-origin; objects and frames are denied; inline script/style and eval are not permitted.
- The policy is compatible with the current static asset inventory and is covered by repository regression tests.
- GitHub Pages does not let this repository configure arbitrary HTTP response headers. A meta CSP cannot enforce frame-ancestors, X-Frame-Options, HSTS, or other response-header-only controls. Those require hosting/CDN response-header configuration and must not be claimed as enforced by this HTML policy.


## Deployment workflow boundary

- The quality job runs with read-only repository permissions; pull-request events never receive Pages deployment permissions.
- The deploy job runs only after quality succeeds and only when the ref is refs/heads/main for non-pull-request events, including manual dispatch.
- Pages write and OIDC token permissions are scoped to the deploy job; both jobs have bounded execution time.


## D1 tenant persistence design boundary

- Workspace task rows carry an internal owner UUID. The trusted auth adapter must resolve that value from a verified identity-provider issuer/subject pair; client-supplied owner IDs are never authorization inputs.
- Every repository read, update, and delete must predicate on the authenticated owner ID. A tenant-leading index improves the expected listing path but is not an authorization control by itself.
- Idempotency keys are unique per owner, not globally. Request hashes prevent a key from being replayed with a different payload; stored responses are size-bounded and carry expiry timestamps for cleanup.
- Migration tests run against an isolated in-memory SQLite database. They do not access or mutate Cloudflare D1. Production migration remains blocked until preview isolation, backups, rollback and cross-account integration tests are in place.


## Principal identity and foreign-key boundary

The D1 schema now separates an opaque internal user ID from external identity claims. The `(issuer, subject)` pair is unique and must be sourced only from a cryptographically verified identity token. Workspace tasks and idempotency records reference the internal user row, and deleting a user cascades to those records and linked identities. Migration 0002 backfills existing owner UUIDs before enforcing the foreign keys.

Residual risks: the schema does not verify tokens, manage sessions, link accounts safely, or authorize HTTP requests. An implementation that trusts request-body owner IDs or omits owner predicates can still disclose another user's data. Issuer/audience/signature/key-rotation validation, account-linking confirmation, per-request authorization, and cross-account API tests remain mandatory. The migration is validated only in local in-memory SQLite; production D1 is unchanged.


## Deployed gateway state and support-data boundary

The latest recorded Production deployment is Worker `mr-siavash-ai-gateway`, version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`), receiving 100% of traffic. It was deployed on 2026-11-11 12:31:27 UTC from source commit `1616545a2e204cb378e2c824299412ca20ef598b`. That deployed snapshot includes health/readiness, the public module catalog, the grounded assistant, support-ticket create/track/reply routes, and Access-protected administrator APIs. Its Production bindings include D1 database `mr-siavash-ai-prod` and Workers AI model `@cf/zai-org/glm-4.7-flash`. The release smoke verified one grounded response with non-empty sources; this is evidence for the tested path, not a guarantee of continuous availability or answer correctness. The repository's current `main` has advanced since the deployed source commit, so current-main changes must not be assumed to be live.

Cloudflare Access protects `/admin` and `/v1/admin/*`; the Worker independently validates the Access JWT signature, issuer, audience, expiry, not-before time, and administrator allowlist. The static website still does not provide consumer accounts, private browser profiles, cloud workspace synchronization, or remote Hub agent execution. The website Gateway is a public knowledge/assistant service, not a bridge into MR_SIAVASH_HUB_AI.

Production D1 contains support records. Their contents were not inspected or exported. Support-ticket text and optional contact email are personal data once submitted. New ticket intake requires the explicit privacy acknowledgement and a healthy readiness response with the configured retention policy; the UI gate is not the security boundary.

The owner-selected inactivity retention period is 90 days with a daily `0 3 * * *` UTC schedule. A completion event was recorded on 2026-11-12 03:00:24 UTC with aggregate-only deletion counts. A scheduled invocation was recorded on 2026-11-13 03:00:23.971 UTC, but no matching completion event was found in the reviewed telemetry window; successful completion for that invocation remains unverified. This absence does not prove cleanup failed. Follow-up is tracked in [Issue #169](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/169). Do not inspect ticket contents, manually invoke cleanup, change the retention period, or alter Production D1 as part of routine verification. See [docs/RELEASE_STATUS.md](../RELEASE_STATUS.md) and [docs/PLATFORM_CONTRACTS.md](../PLATFORM_CONTRACTS.md) for the dated evidence and remaining limitations.
