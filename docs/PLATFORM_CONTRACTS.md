# Platform integration contracts

Status: living architecture and integration contract. The Production Worker has an active Workers AI binding and grounded-assistant release evidence. Browser-to-Hub integration remains proposed; the separate Telegram-facing EL_AI client has its own opt-in Hub pairing boundary.

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

The first implementation is the Cloudflare Workers AI adapter in `cloudflare/gateway/src/assistant-provider.js`. It provides a normalized provider/model identifier, validates message envelopes, bounds output tokens, normalizes supported text and usage response shapes, and maps upstream failures to typed categories without returning raw provider errors to the browser.

The adapter's retry policy is explicit: one attempt and no automatic retry. This avoids silently multiplying model calls and potential usage. Its current capabilities explicitly report streaming, request timeout, and cancellation as unavailable; the current non-streaming `env.AI.run()` binding contract does not expose a documented cancellation parameter. Do not describe the adapter as meeting the full production provider contract until bounded execution/cancellation is supported and tested.

The adapter is dormant when the `AI` binding is absent. The latest recorded Production release has the `AI` binding enabled with model `@cf/zai-org/glm-4.7-flash`; its release smoke verified a grounded assistant response with non-empty sources. The assistant falls back to verified site knowledge when Workers AI is unavailable or returns unusable output. The adapter still performs one attempt without automatic retry and does not provide streaming or caller-controlled cancellation through the current non-streaming `env.AI.run()` contract. Do not infer uninterrupted availability or answer correctness from the smoke result. Provider credentials stay in server-side secret storage (Cloudflare bindings). Never put keys in HTML, JavaScript bundles, localStorage, service-worker caches, or public logs. Provider output is untrusted data and must be rendered as text by default.

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

The current site remains a static browser application; its workspace is local to the current browser profile. During normal operation, a browser storage-clear event resets both local views. While explicit workspace recovery is pending, incoming task writes and storage-clear events are ignored. The public Cloudflare Worker is a separate backend for the grounded assistant, module metadata, support tickets, and Access-protected administration. It does not provide consumer accounts, private browser profiles, cloud workspace synchronization, or remote Hub agent execution.

The latest recorded Production deployment is Worker `mr-siavash-ai-gateway`, version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`), receiving 100% of traffic. It was deployed on 2026-11-11 12:31:27 UTC from source commit `1616545a2e204cb378e2c824299412ca20ef598b`. The recorded Production bindings include D1 database `mr-siavash-ai-prod` and Workers AI model `@cf/zai-org/glm-4.7-flash`. The deployed routes include health/readiness, public module metadata, the grounded assistant, support-ticket create/track/reply, and Access-protected administrator APIs. The release smoke verified a grounded response with non-empty sources; it is evidence for that tested request path, not a guarantee of continuous model availability or answer correctness. Preview remains a separate environment with its own D1 database and Access/AI configuration.

The owner-selected support-retention policy is 90 days, with daily Cron `0 3 * * *` UTC. The 2026-11-12 completion event reported aggregate counts of zero support tickets, zero idempotency records, and three rate-limit buckets. A corrected read-only query on 2026-11-14 confirmed the 2026-11-13 completion event at 03:00:23.971 UTC; its aggregate counts were zero support tickets, zero idempotency records, and zero rate-limit buckets. The earlier no-match was caused by a query/filter mismatch, not a cleanup failure, and Issue #169 was closed on 2026-11-14. These events confirm successful completion for those invocations, but do not prove every individual record or retention edge case. Continue routine monitoring of later scheduled runs. Do not invoke cleanup manually, inspect ticket contents, or modify Production D1 to simulate a scheduled run.

Cloudflare Access protects `/admin` and `/v1/admin/*`; the Worker independently verifies the Access JWT and administrator allowlist. Query-string redaction is enabled and persistent invocation logs/traces remain enabled. The manual-only Production release workflow defaults to read-only binding validation and includes rollback behavior for failed post-deployment checks. Do not change the owner-selected retention period or disable the existing Workers AI/retention bindings when deploying.

Within MR_SIAVASH_AI, consumer user accounts, identity-provider login, private profiles, cloud workspace sync, billing, and remote Hub agent execution are not live. MR_SIAVASH_HUB_AI has a separate local-first agent runtime, but it is not connected to this website. The website's Hub panel is a build-time snapshot of public GitHub metadata only; it does not expose Hub runtime health, private memory, tasks, files, or agent tools. The OpenAPI and threat-model documents remain contracts/design artifacts, not proof of future capabilities.

## 10. Cross-project integration: MR_SIAVASH_HUB_AI

MR_SIAVASH_HUB_AI is a separate local-first runtime, not a connected backend for this static site. Its authentication, owner identity, local memory, knowledge, tools, workflow state, approvals and audit trail remain authoritative inside that project. The separate MR_SIAVASH_EL_AI Telegram client has an opt-in, owner-paired Hub integration; that does not create a browser-to-Hub connection or shared identity/data plane for this website. No shared database, shared session, direct browser-to-Hub API call or remote agent execution from this site is currently active.

Integration must be opt-in and staged:

1. **Public read-only metadata — implemented:** the Digital Studio reads a build-time generated hub-status.json snapshot containing only the Hub main-branch commit and latest main-branch CI metadata from the public GitHub API. The generator enforces response-size limits, validates GitHub URLs, allowlists fields, and writes an unavailable fallback if the upstream API fails. This is not a direct Hub API connection and does not report local runtime health. Never include private task names, prompts, memory, local paths, credentials, support records or raw logs.
2. **Private local pairing:** require an owner-initiated local bridge or equivalent reviewed connector. Bind the exact site origin and a paired client identity; use short-lived, narrowly scoped credentials, replay protection, request limits and revocation. Exact-origin CORS is necessary but is not authentication.
3. **Controlled agent operations:** route requests through Hub authentication, ownership checks, the policy engine, bounded tool schemas, idempotency, audit events and per-action human approval for consequential side effects.
4. **Remote hosting, if ever selected:** treat it as a separate product/security decision requiring verified identity, tenant isolation, TLS, monitoring, backup/restore, data retention and budget controls. Do not silently expose the local runtime.

Prohibited shortcuts: wildcard CORS, unauthenticated local endpoints, public tunnels to a developer machine, browser-stored long-lived Hub tokens, client-supplied owner IDs, shared SQLite/D1 files, and model-proposed actions that bypass Hub policy.

Acceptance gates include negative origin and authentication tests, pairing/revocation tests, cross-user isolation, request-size/rate limits, replay/idempotency checks, audit redaction, offline behavior, and end-to-end verification that no consequential action executes without the Hub's approval boundary. Until those gates pass, all UI copy must say the projects are separate and not connected.
