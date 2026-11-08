# Product roadmap — parallel workstreams

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
The OpenAPI contract and threat model remain design artifacts. The deployed health-only Worker passed automated liveness, D1-readiness and CORS smoke checks on 2026-11-08. Production D1 contains the workspace, identity and support schemas; the checked application tables were empty at the last read-only inspection. Cloudflare Access is configured for `/admin` and `/v1/admin/*` with a single-administrator Allow policy, and its audience matches the Worker's configured audience. Query-string redaction is enabled; existing persistent invocation logs and traces remain at their previously configured sampling rates. The production Worker still exposes health endpoints only, has no Workers AI binding, and has no reproducible Wrangler manifest or Worker release workflow. Support, assistant, module metadata and administrator routes remain source-only. No user-facing product API, authentication, or cloud workspace endpoint is live. Aligning the production Worker source remains pending until a reproducible release workflow, isolated preview environment and route-level verification are ready.

### Stage C — first real service
Maintain automated runtime smoke checks for the deployed health/CORS boundary, then implement public module metadata and only later authenticated task persistence. Add integration and isolation tests before enabling cloud sync.

### Stage D — independent modules
Add AI, agent, developer, security, learning, creator and knowledge capabilities through versioned contracts and shared identity/permission boundaries.

### Stage E — production readiness
Complete accessibility, security, reliability, privacy, observability, backup/restore and incident-response reviews.
