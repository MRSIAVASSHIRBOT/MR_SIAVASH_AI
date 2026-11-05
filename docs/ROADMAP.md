# Product roadmap — parallel workstreams

The workstreams progress together behind shared release gates. A module is not production-ready merely because its card or UI exists. Shared integration rules are defined in docs/PLATFORM_CONTRACTS.md.

| Workstream | Near-term deliverable | Acceptance gate |
| --- | --- | --- |
| Product and identity | Versioned external module registry with runtime validation, public/private information boundary | JSON Schema and runtime validator remain in parity; IDs, categories and capability states validate before rendering; released module IDs are protected by a compatibility regression test; persistent retry/recovery UI is available when catalog loading fails; local cross-tab updates are validated and explicitly documented as last-write-wins; favorites survive catalog outages and reconcile after recovery; UI never implies unimplemented capabilities |
| Front-end platform | Accessible navigation, restrictive static CSP, robust local state, atomic offline shell precache with network-first module metadata refresh | Keyboard, mobile-navigation accessibility, shortcut focus-safety, validated cross-tab storage-event synchronization, CSP and referrer-policy regression checks, schema-driven backup import/export, import/export regression tests, full-capacity and failed-storage rollback tests, plus install tests proving an incomplete shell cannot activate, module registry network-refresh/offline-fallback tests, and runtime tests proving API/private responses bypass the service-worker cache |
| Backend/API | Versioned OpenAPI contract and health/public metadata boundary | Automated OpenAPI reference/security/limit validation in CI, then contract and server integration tests |
| Identity and privacy | Authentication lifecycle and authorization matrix | Negative tests prove cross-account access is denied |
| AI and agents | Provider adapter interface and bounded tool permissions | Secrets stay server-side; human approval for consequential actions |
| Learning and security | Defensive learning paths and authorized-lab boundaries | Content review and safe lab framing |
| Creator and knowledge | Reusable content/resource metadata contracts | Search, export and ownership rules documented |
| Operations | Main-only CI deployment gate, monitoring, backup and rollback | Only successful main-branch runs can deploy; deployment URL is surfaced; restoration is tested |

## Release stages

### Stage A — static product baseline
Current site, local workspace, module catalog, PWA shell and repository checks. This is a prototype, not a hosted account platform.

### Stage B — backend contract and threat model
The OpenAPI contract and threat model in this change are design artifacts. No backend endpoints are live.

### Stage C — first real service
Implement public health and module metadata, then authenticated task persistence. Add integration and isolation tests before enabling cloud sync.

### Stage D — independent modules
Add AI, agent, developer, security, learning, creator and knowledge capabilities through versioned contracts and shared identity/permission boundaries.

### Stage E — production readiness
Complete accessibility, security, reliability, privacy, observability, backup/restore and incident-response reviews.
