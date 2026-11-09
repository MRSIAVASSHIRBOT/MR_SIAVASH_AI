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

The first implementation is the Cloudflare Workers AI adapter in \`cloudflare/gateway/src/assistant-provider.js\`. It provides a normalized provider/model identifier, validates message envelopes, bounds output tokens, normalizes supported text and usage response shapes, and maps upstream failures to typed categories without returning raw provider errors to the browser.

The adapter's retry policy is explicit: one attempt and no automatic retry. This avoids silently multiplying model calls and potential usage. Its current capabilities explicitly report streaming, request timeout, and cancellation as unavailable; the current non-streaming \`env.AI.run()\` binding contract does not expose a documented cancellation parameter. Do not describe the adapter as meeting the full production provider contract until bounded execution/cancellation is supported and tested.

The adapter is dormant when the \`AI\` binding is absent. Production currently has no Workers AI binding, so this source refactor does not activate model inference, create model usage, or change production behavior. Provider credentials stay in server-side secret storage. Never put keys in HTML, JavaScript bundles, localStorage, service-worker caches, or public logs. Provider output is untrusted data and must be rendered as text by default.

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

The current site remains a static browser application; its workspace is local to the browser profile. Production Worker version `f7d5a92e-2694-4af1-8b99-18d04742925d` currently serves health/readiness, knowledge-fallback assistant, public support-ticket routes and Access-protected administrator routes. The production bundle is behind current `main`: it does not yet expose `GET /v1/modules` or the scheduled retention handler. The isolated preview Worker runs current source and passed runtime checks for health, D1 readiness, module metadata, grounded knowledge fallback, support validation, administrator fail-closed behavior and CORS.

Production has no Workers AI binding. The support API is present in the deployed bundle, but public ticket forms remain disabled until the reviewed Worker release and retention decision are complete. During normal operation, a browser storage-clear event resets both local views. While explicit workspace recovery is pending, incoming task writes and storage-clear events are ignored. Production D1 already contains support records; their contents were not inspected. Do not reapply migrations 0001–0003 or clear production data.

Cloudflare Access protects `/admin` and `/v1/admin/*`; the Worker independently verifies the Access JWT and administrator allowlist. Query-string redaction is enabled and persistent invocation logs/traces remain enabled. The manual-only production release workflow defaults to read-only binding validation and rolls back the previous traffic split if post-deployment checks fail. Workers AI and automatic support retention are explicit opt-ins.

No consumer user accounts, identity-provider login, private profiles, cloud workspace sync, model-generated assistant or agent runtime are live. The OpenAPI and threat-model documents remain contracts/design artifacts, not proof of those capabilities.
