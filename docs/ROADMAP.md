# Product roadmap — parallel workstreams

The workstreams progress together behind shared release gates. A module is not production-ready merely because its card or UI exists. Shared integration rules are defined in docs/PLATFORM_CONTRACTS.md.

| Workstream | Near-term deliverable | Acceptance gate |
| --- | --- | --- |
| Product and identity | Clear module contracts, public/private information boundary | UI never implies unimplemented capabilities |
| Front-end platform | Accessible navigation, robust local state, isolated offline shell | Keyboard, mobile, import/export, full-capacity no-data-loss tests and runtime tests proving API/private responses bypass the service-worker cache |
| Backend/API | Versioned OpenAPI contract and health/public metadata boundary | Contract validation and server integration tests |
| Identity and privacy | Authentication lifecycle and authorization matrix | Negative tests prove cross-account access is denied |
| AI and agents | Provider adapter interface and bounded tool permissions | Secrets stay server-side; human approval for consequential actions |
| Learning and security | Defensive learning paths and authorized-lab boundaries | Content review and safe lab framing |
| Creator and knowledge | Reusable content/resource metadata contracts | Search, export and ownership rules documented |
| Operations | CI, deployment, monitoring, backup and rollback | Reproducible deployment and tested restoration |

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
