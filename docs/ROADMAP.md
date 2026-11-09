# Product roadmap — parallel workstreams

> Runtime status verified 2026-11-09: main source is commit d7c9fb9a66fc41d5d4f7fab4e7d56d58a4b8aaa1; Quality checks and GitHub Pages deployment run 42602173411 succeeded, and Cloudflare Gateway Runtime Smoke (42602173433) plus Preview Runtime Smoke (42602173397) succeeded on the same main revision. This confirms the GitHub workflow results, not independent visual acceptance in a physical browser; that review remains outstanding. Source now contains a normalized Workers AI adapter, but production still has no AI binding and model inference remains inactive. Cloudflare control-plane state remains separate: production traffic is on Worker v5; Worker v6 was rolled back after failed post-deployment smoke checks; no production retention cron is active. Preview traffic remains rolled back to v3 after the v4 deployment attempt. The selected future support-retention period is 30 days, but automatic deletion remains disabled pending a separately approved release and review of existing-ticket impact. GitHub main branch protection remains disabled (issue #70 is open).

The workstreams progress together behind shared release gates. A module is not production-ready merely because its card or UI exists. Shared integration rules are defined in docs/PLATFORM_CONTRACTS.md.

| Workstream | Near-term deliverable | Acceptance gate |
| --- | --- | --- |
| Product and identity | Versioned external module registry with runtime validation, public/private information boundary | JSON Schema and runtime validator remain in parity; IDs, categories and capability states validate before rendering; released module IDs are protected by a compatibility regression test; persistent retry/recovery UI is available when catalog loading fails; local cross-tab updates are validated and explicitly documented as last-write-wins; favorites survive catalog outages and reconcile after recovery; UI never implies unimplemented capabilities |
| Front-end platform | Accessible navigation, responsive motion system, restrictive static CSP, robust local state, atomic offline shell precache with network-first module metadata refresh | Keyboard, mobile-navigation accessibility, shortcut focus-safety, bounded and frame-throttled pointer parallax with reduced-motion and coarse-pointer fallbacks, validated cross-tab storage-event synchronization, CSP and referrer-policy regression checks, schema-driven backup import/export, import/export regression tests, full-capacity and failed-storage rollback tests, non-destructive recovery after unreadable, malformed, unsupported-version, or repaired snapshots; explicit validated-backup recovery; legacy migration validation; cross-tab recovery-lock enforcement for remote writes and storage-clear events, plus install tests proving an incomplete shell cannot activate, bounded module-registry network-refresh/offline-fallback cache validation (64 KiB envelope cap), plus registry network-refresh/offline-fallback tests, and runtime tests proving API/private responses bypass the service-worker cache |
| Backend/API | Versioned OpenAPI contract, tenant-scoped D1 schema, internal principal mapping, and health/public metadata boundary | Automated OpenAPI validation plus in-memory migration/backfill/foreign-key tests in CI; then Wrangler-local D1 tests, preview migration, contract tests and cross-account isolation tests before production |
| Identity and privacy | Authentication lifecycle and authorization matrix | Negative tests prove cross-account access is denied |
| AI and agents | Normalized Workers AI adapter is implemented in source; bounded agent runtime is maintained separately in MR_SIAVASH_HUB_AI | Provider remains disabled in production until an explicit binding/release; cross-project access requires the ADR-0004 pairing and authorization gates |
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

## Digital studio experience — 2026-11-09

The feature branch adds a dedicated studio page for a truthful public profile, selected repositories, learning entry paths, a conceptual architecture view, safe copy-only code snippets, development principles, CI/release links, and locally saved project bookmarks. These are static/public surfaces; they do not imply hosted accounts, cloud synchronization, arbitrary code execution, live uptime monitoring, or unverified skill credentials.

Acceptance gates:
- Portfolio links point to the owner's known public repositories; project status labels remain descriptive rather than fabricated metrics.
- Saved projects are restricted to a small allowlist and remain local to the current browser.
- Code snippets are displayed and copied only; no user-supplied code is executed.
- New page assets are included in the atomic offline shell and syntax-checked in CI.
- Search index validates and exposes studio sections.
- Responsive layout, keyboard focus, reduced-motion and forced-colors behavior remain covered.


## Cross-project integration — proposed, not connected

MR_SIAVASH_AI remains the public identity, portfolio and learning surface. MR_SIAVASH_HUB_AI remains a separate local-first agent runtime. No shared identity, private data store, live API session or agent execution path exists between them.

The first acceptable integration milestone is a read-only, allowlisted public status contract. Private features require a separate owner-initiated pairing mechanism and must preserve Hub-side authentication, ownership, policy checks, approvals and audit. Do not create a public tunnel to the local runtime, wildcard CORS, browser-stored long-lived credentials or direct browser access to private Hub data. See docs/decisions/0004-hub-integration-boundary.md.
