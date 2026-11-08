# Product roadmap — parallel workstreams

> Runtime status verified 2026-11-08: the isolated preview Worker runs the current source and passes health, D1 readiness, module catalog, assistant fallback, support validation, administrator fail-closed, and CORS smoke checks. Production still runs an older Worker version: it serves health/readiness, knowledge-fallback assistant, public support-ticket create/read/reply, and Access-protected administrator routes, but does not yet serve the current nine-module API or scheduled retention handler. The production release workflow is manual-only and defaults to read-only validation.

The workstreams progress together behind shared release gates. A module is not production-ready merely because its card or UI exists. Shared integration rules are defined in docs/PLATFORM_CONTRACTS.md.

| Workstream | Near-term deliverable | Acceptance gate |
| --- | --- | --- |
| Product and identity | Versioned external module registry with runtime validation, public/private information boundary | JSON Schema and runtime validator remain in parity; IDs, categories and capability states validate before rendering; released module IDs are protected by a compatibility regression test; persistent retry/recovery UI is available when catalog loading fails; local cross-tab updates are validated and explicitly documented as last-write-wins; favorites survive catalog outages and reconcile after recovery; UI never implies unimplemented capabilities |
| Front-end platform | Accessible navigation, responsive motion system, restrictive static CSP, robust local state, atomic offline shell precache with network-first module metadata refresh | Keyboard, mobile-navigation accessibility, shortcut focus-safety, bounded and frame-throttled pointer parallax with reduced-motion and coarse-pointer fallbacks, validated cross-tab storage-event synchronization, CSP and referrer-policy regression checks, schema-driven backup import/export, import/export regression tests, full-capacity and failed-storage rollback tests, non-destructive recovery after unreadable, malformed, unsupported-version, or repaired snapshots; explicit validated-backup recovery; legacy migration validation; cross-tab recovery-lock enforcement for remote writes and storage-clear events, plus install tests proving an incomplete shell cannot activate, bounded module-registry network-refresh/offline-fallback cache validation (64 KiB envelope cap), plus registry network-refresh/offline-fallback tests, and runtime tests proving API/private responses bypass the service-worker cache |
| Backend/API | Versioned OpenAPI contract, tenant-scoped D1 schema, internal principal mapping, and health/public metadata boundary | Automated OpenAPI validation plus in-memory migration/backfill/foreign-key tests in CI; then Wrangler-local D1 tests, preview migration, contract tests and cross-account isolation tests before production |
| Identity and privacy | Authentication lifecycle and authorization matrix | Negative tests prove cross-account access is denied |
| AI and agents | Provider adapter interface and bounded tool permissions | Secrets stay server-side; human approval for consequential actions |
| Learning and security | Defensive learning paths and authorized-lab boundaries | Content review and safe lab framing |
| Creator and knowledge | Reusable content/resource metadata contracts | Search, export and ownership rules documented |
| Operations | Main-only CI deployment gate, monitoring, backup and rollback | Only successful main-branch runs can deploy; deployment URL is surfaced; restoration is tested |

## Release stages

### Stage A — static product baseline
Current site, local workspace, module catalog, PWA shell and repository checks. This is a prototype, not a hosted account platform.

### Stage B — backend contract and threat model

The OpenAPI contract and threat model remain design artifacts, while the Worker implementation is now running in an isolated preview environment. The production Worker currently serves health/readiness, a knowledge-fallback assistant endpoint, public support-ticket routes, and Access-protected administrator routes. Its deployed bundle is behind current `main`: public module metadata and scheduled retention are present in preview/source but not yet in production. Production D1 already contains support records; contents were not inspected. Do not reapply migrations 0001–0003 or clear existing data.

Cloudflare Access is configured for `/admin` and `/v1/admin/*`; the Worker independently verifies Access JWT signature, issuer, audience, expiry and administrator allowlist. Query-string redaction is enabled and persistent invocation logs/traces remain enabled. Production has no Workers AI binding and no retention cron. The preview Worker runs current source with isolated D1; runtime smoke checks passed for health, readiness, module catalog, knowledge fallback, support validation, admin fail-closed behavior and CORS.

A manual-only production release workflow is now present. It defaults to read-only binding validation, checks the exact production D1 and Access configuration, preserves secret bindings, verifies routes and CORS after deployment, and rolls back the prior Worker traffic split on failure. Workers AI and automatic support retention are opt-in. Retention is a destructive data-lifecycle choice and remains disabled until the owner explicitly selects a period. The public ticket UI stays disabled until the production release and retention decision are verified.

### Stage C — first real service

Complete the production Worker release only after the owner approves the deployment and any retention/AI options. Then verify the nine-module API, ticket lifecycle, Access-protected admin session, observability, rollback and mobile/offline behavior. Only after that should the public ticket forms be enabled. User accounts and cloud workspace persistence remain blocked on choosing and reviewing an identity provider and cross-user isolation model.


### Stage D — independent modules
Add AI, agent, developer, security, learning, creator and knowledge capabilities through versioned contracts and shared identity/permission boundaries.

### Stage E — production readiness
Complete accessibility, security, reliability, privacy, observability, backup/restore and incident-response reviews.
