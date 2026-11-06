# Platform integration contracts

Status: architecture specification; not an implementation or deployed service.

This document defines shared rules for the parallel product workstreams so that modules can evolve independently without creating incompatible identity, data, AI, or agent boundaries.

## 1. Shared principles

- The server is authoritative for identity, authorization, secrets, billing, and durable shared data.
- Browser input, imported files, model output, tool output, and connector payloads are untrusted.
- Every module declares its owner, data classification, required permissions, failure behavior, and operational owner.
- No module may claim a capability is connected until an end-to-end integration test proves it.
- Prefer additive, versioned contracts. Breaking changes require an explicit migration plan.

## 2. Module manifest contract

The runtime catalog is stored in `modules.json` using the `mr-siavash-ai-module-registry` schema at version 1. Its machine-readable JSON Schema is maintained at `schemas/module-registry.schema.json`; changes to the runtime validator and schema must remain in parity. The browser validates the complete registry, rejects unknown or malformed fields and duplicate IDs, caps the response at 64 KiB (checking both declared length and streamed bytes), then freezes the accepted records before rendering. If the registry is temporarily unavailable, syntactically valid favorite IDs are retained locally and reconciled against known module IDs after recovery; an outage must not erase user preferences. The loader requests this public static manifest without credentials, enforces an application/json media type, and aborts a stalled request after five seconds where AbortController is available. The service worker precaches this public static manifest as part of the application shell, then refreshes it network-first while retaining the last valid cached JSON for offline use.

Each module specification must declare:

| Field | Requirement |
| --- | --- |
| id | Stable lowercase identifier; immutable after release; changing an ID requires a compatibility migration for favorites, bookmarks, and references |
| version | Semantic version |
| status | planned, prototype, beta, or production |
| audience | public, authenticated, or both |
| data_classes | public, user, sensitive, or secret |
| permissions | Explicit capability names; empty by default |
| dependencies | Versioned module/API dependencies |
| owner | Maintainer responsible for support |
| failure_mode | User-visible behavior when unavailable |

The UI must render status from trusted application configuration, not infer production readiness from a visible card.

## 3. Identity and authorization

- Authentication establishes a principal; it does not grant access by itself.
- Authorization is evaluated server-side for every protected operation.
- Derive user ownership from the verified session, never from a request body or URL parameter.
- Deny by default. Use explicit role and resource checks.
- Session expiry, revocation, account recovery, and logout must have documented lifecycle behavior.
- Cross-user isolation tests are a release blocker for any shared-data endpoint.

## 4. Data and API conventions

- Keep the OpenAPI document as the source of truth for HTTP request/response schemas.
- Reject unknown fields for security-sensitive write operations unless a schema explicitly allows them.
- Bound request sizes, pagination, list lengths, and execution time.
- Use idempotency keys for retryable create operations.
- Return stable machine-readable error codes and avoid leaking stack traces or internal identifiers.
- Define retention, export, deletion, and backup-restore semantics before collecting user data.
- Treat browser localStorage as device-local convenience storage, never as a secure vault.

## 5. AI provider adapter

A provider adapter should expose a normalized interface with:
- provider and model identifiers;
- supported modalities and context limits;
- request timeout and cancellation;
- normalized response and usage metadata;
- typed error categories (authentication, rate limit, timeout, unavailable, invalid request);
- explicit retry policy and bounded retry count.

Provider credentials stay in server-side secret storage. Never put keys in HTML, JavaScript bundles, localStorage, service-worker caches, or public logs. Provider output is untrusted data and must be rendered as text by default.

## 6. Agent execution boundary

An agent run is a server-side job with:
- an authenticated owner and immutable run identifier;
- a declared tool allowlist and per-tool input schema;
- resource, time, and step budgets;
- audit events for tool requests and outcomes;
- cancellation and timeout behavior;
- human confirmation before external, destructive, financial, or otherwise consequential actions.

Do not expose arbitrary shell, filesystem, network, or repository write access to a model. Each tool should be narrow, scoped, and independently authorized.

## 7. Observability and operations

- Emit structured events with correlation IDs, timestamps, module/version, outcome, and latency.
- Exclude secrets, access tokens, and unnecessary personal content from logs.
- Define service-level indicators before service-level objectives.
- Provide health/readiness checks that distinguish process liveness from dependency readiness.
- Document deployment rollback, backup restoration, and incident ownership.
- Alerts must be actionable and have a named response owner.

## 8. Release gates

A module cannot move to production until all applicable gates pass:

1. Contract/schema review and compatibility check.
2. Unit, integration, and negative authorization tests.
3. Input validation, rate-limit, and abuse-case review.
4. Accessibility and responsive UI checks.
5. Privacy/data-retention and deletion review.
6. Observability, failure-mode, and rollback checks.
7. Documentation accurately reflects the shipped capability.

## 9. Current implementation boundary

The current site remains a static browser application. The workspace is local to the browser profile. This document, the OpenAPI file, and the threat model are design artifacts. They do not create a backend, accounts, cloud sync, AI provider integration, or agent runtime.


### Browser-local cross-tab synchronization

The static workspace listens for same-origin browser storage events for its task and favorites keys. Incoming snapshots are parsed and bounded before replacing in-memory state; malformed updates are ignored and the current view is preserved. During normal operation, a browser storage-clear event resets both local views. If workspace recovery is blocked because stored task data was unreadable or required repair, incoming task writes and storage-clear events are ignored so another tab cannot replace or discard the protected in-memory snapshot; a validated backup import remains the explicit recovery path. This is best-effort, same-origin synchronization only: localStorage provides last-write-wins behavior and does not provide transactions, conflict resolution, cross-device sync, or account isolation.


### Workspace backup contract

Workspace backup version 1 is defined in schemas/workspace-backup.schema.json and enforced by the browser importer. The root envelope and task records reject unknown fields; task count, text length, optional task ID, favorites count and favorite identifier format are bounded. Import validates the entire document before preparing any mutation, regenerates local task IDs, and merges unique task text. The browser-only importer remains a local portability feature, not an account or cloud synchronization API.


### Static delivery security headers

The static HTML entry point supplies a restrictive meta CSP and Referrer-Policy. The CSP permits only same-origin executable code, styles, connections, manifests and workers; it blocks objects, frames, inline script/style, and eval. Because the deployment uses GitHub Pages, response-header-only controls (including frame-ancestors, HSTS and X-Frame-Options) remain an infrastructure-level release gate and are not replaced by the meta policy.


### Offline module-registry cache boundary

The service worker may cache `modules.json` only when the response is successful JSON, no larger than 64 KiB, and has the exact versioned registry envelope (`schema`, `version`, and a bounded `modules` array). It validates both network and previously cached entries before use. An invalid or oversized network response never replaces the last valid cache; an invalid cached entry is not served as an offline fallback. The application remains responsible for full per-module runtime validation before rendering.
