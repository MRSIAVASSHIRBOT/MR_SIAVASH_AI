# Product roadmap — parallel workstreams

> Runtime status verified 2026-11-10 against repository main commit `971a5e702876a0bc78b19c55b8b0daf358471c5b` and live Cloudflare control-plane state. Production release workflow run `42801780384` completed successfully from this exact commit. Cloudflare reports active deployment `cb861582-86ea-4899-8cff-273062d9b36c`, with Worker version `146709f7-8158-40c8-aa80-b8b0772787f1` receiving 100% of traffic; version 12 records the same source commit. The release gate passed 58/58 Node tests, OpenAPI validation (9 operations, 7 paths, 14 schemas), and isolated D1 migration checks (3 migrations, 7 tables, 15 indexes). Its post-deploy smoke verified liveness, D1 readiness, module propagation, privacy-consent enforcement, support-route behavior, trusted/untrusted CORS, and a real Workers AI request that returned `mode: ai_grounded` with non-empty sources. Production has the `AI` binding, `DB` D1 binding, 90-day support-retention setting, and daily `0 3 * * *` cleanup schedule. The schedule is configured; this does not by itself prove that a cleanup execution has occurred. The Preview Worker was last rechecked on 2026-11-10 at 100% traffic on version 6 under deployment `66ccb720-01cb-43e0-9b14-6d1500fa2581`; it uses isolated D1, its own Access/AI configuration, and a separate daily 03:00 UTC retention schedule. Preview must not be treated as sharing Production data or settings. Production administrator One-time PIN sign-in was owner-confirmed on 2026-11-10; end-to-end administrator ticket workflow acceptance and Preview sign-in remain separate checks. GitHub main branch protection remains disabled (issue #70 is open).

The workstreams progress together behind shared release gates. A module is not production-ready merely because its card or UI exists. Shared integration rules are defined in docs/PLATFORM_CONTRACTS.md.

| Workstream | Near-term deliverable | Acceptance gate |
| --- | --- | --- |
| Product and identity | Versioned external module registry with runtime validation, public/private information boundary | JSON Schema and runtime validator remain in parity; IDs, categories and capability states validate before rendering; released module IDs are protected by a compatibility regression test; persistent retry/recovery UI is available when catalog loading fails; local cross-tab updates are validated and explicitly documented as last-write-wins; favorites survive catalog outages and reconcile after recovery; UI never implies unimplemented capabilities |
| Front-end platform | Accessible navigation, responsive motion system, restrictive static CSP, robust local state, atomic offline shell precache with network-first module metadata refresh | Keyboard, mobile-navigation accessibility, shortcut focus-safety, bounded and frame-throttled pointer parallax with reduced-motion and coarse-pointer fallbacks, validated cross-tab storage-event synchronization, CSP and referrer-policy regression checks, schema-driven backup import/export, import/export regression tests, full-capacity and failed-storage rollback tests, non-destructive recovery after unreadable, malformed, unsupported-version, or repaired snapshots; explicit validated-backup recovery; legacy migration validation; cross-tab recovery-lock enforcement for remote writes and storage-clear events, plus install tests proving an incomplete shell cannot activate, bounded module-registry network-refresh/offline-fallback cache validation (64 KiB envelope cap), plus registry network-refresh/offline-fallback tests, and runtime tests proving API/private responses bypass the service-worker cache |
| Backend/API | Versioned OpenAPI contract, tenant-scoped D1 schema, internal principal mapping, and health/public metadata boundary | Automated OpenAPI validation plus in-memory migration/backfill/foreign-key tests in CI; then Wrangler-local D1 tests, preview migration, contract tests and cross-account isolation tests before production |
| Identity and privacy | Authentication lifecycle and authorization matrix | Negative tests prove cross-account access is denied |
| AI and agents | Production Workers AI assistant uses the normalized provider adapter and grounded-source response contract; bounded agent runtime remains separate in MR_SIAVASH_HUB_AI | Provider errors fail closed to the safe fallback; rate limits and grounded-source checks remain enforced; cross-project access requires the ADR-0004 pairing and authorization gates |
| Learning and security | Six-path Academy (30 chapters), browser-local progress dashboard, resume position, Python course and defensive web-security learning | Progress migration, malformed-storage recovery, resume logic, mobile/accessibility behavior and offline-shell coverage remain tested; no cloud account or remote execution is implied |
| Creator and knowledge | Reusable content/resource metadata contracts | Search, export and ownership rules documented |
| Operations | Main-only CI deployment gate, monitoring, backup and rollback | Only successful main-branch runs can deploy; deployment URL is surfaced; restoration is tested |

## Release stages

### Stage A — static product baseline
Current site, local workspace, module catalog, PWA shell and repository checks. This is a prototype, not a hosted account platform.

### Stage B — backend contract and threat model

The OpenAPI contract and threat model are implemented and validated in CI. The Worker is now deployed to both Production and an isolated Preview environment. Production serves health/readiness, versioned public module metadata, a grounded Workers AI assistant, public support-ticket routes, and Access-protected administrator routes. Production and Preview use separate D1 resources; do not reapply migrations 0001–0003 or clear existing data as part of routine deployment.

Cloudflare Access protects `/admin` and `/v1/admin/*`; the Worker independently verifies Access JWT signature, issuer, audience, expiry and administrator allowlist. Query-string redaction and invocation telemetry remain configured. The Production release smoke verifies liveness, D1 readiness, module propagation, privacy-consent enforcement, support-route contracts, trusted/untrusted CORS and a real grounded Workers AI response. The release workflow also verifies the selected retention configuration and restores the previous traffic split if a post-deploy smoke check fails.

Production Workers AI is enabled through the `AI` binding. The owner-selected 90-day support-retention period is configured with a daily `0 3 * * *` cleanup schedule. A configured schedule is not evidence that a scheduled cleanup has already executed; operational monitoring should confirm the first run and subsequent outcomes. The successful release smoke proves key API and security boundaries, not complete end-to-end ticket lifecycle acceptance. Review ticket creation, administrator triage/reply, retention impact, backup/restore and user-facing privacy copy before broad public rollout.

### Stage C — first real service

The initial Production Worker release is complete. The next acceptance gate is end-to-end verification of the nine-module API, support-ticket lifecycle, Access-protected administrator session and ticket workflow, first scheduled-retention execution, observability, backup/restore, rollback and mobile/offline behavior. Do not infer complete service acceptance from a successful release smoke alone. User accounts and cloud workspace persistence remain blocked on choosing and reviewing an identity provider and cross-user isolation model.


### Stage D — independent modules
Add AI, agent, developer, security, learning, creator and knowledge capabilities through versioned contracts and shared identity/permission boundaries.

### Stage E — production readiness
Complete accessibility, security, reliability, privacy, observability, backup/restore and incident-response reviews.

## Learning Academy progress dashboard — 2026-11-09

The Academy now provides six structured learning paths with 30 chapters, plus the separate 12-lesson Python course. Its dashboard summarizes completed chapters, total progress, paths with progress and completed courses. The resume action returns to the saved active course and next incomplete or last active chapter.

Progress remains browser-local under the existing storage key, preserving prior completion arrays while adding validated resume metadata. The new pure progress module normalizes malformed, oversized, duplicate and out-of-range records; it does not introduce user accounts, cloud synchronization or server-side learner profiles. The module is included in the versioned offline shell (service-worker cache v40).

Acceptance gates:
- Legacy progress is preserved and normalized without changing the existing storage key.
- Summary calculations ignore duplicate and invalid chapter indexes.
- Resume logic handles unfinished chapters, completed chapters and fully completed courses.
- Lesson samples continue to render as text; no HTML injection or in-browser code execution is added.
- The progress module is included in the atomic offline shell and its cache version is updated.
- Mobile layout, keyboard focus, reduced motion and forced-colors behavior remain covered.
- UI copy clearly states that progress is stored only in the current browser.

## Digital studio experience — 2026-11-09

The feature branch adds a dedicated studio page for a truthful public profile, selected repositories, learning entry paths, a conceptual architecture view, safe copy-only code snippets, development principles, CI/release links, and locally saved project bookmarks. These are static/public surfaces; they do not imply hosted accounts, cloud synchronization, arbitrary code execution, live uptime monitoring, or unverified skill credentials.

Acceptance gates:
- Portfolio links point to the owner's known public repositories; project status labels remain descriptive rather than fabricated metrics.
- Saved projects are restricted to a small allowlist and remain local to the current browser.
- Code snippets are displayed and copied only; no user-supplied code is executed.
- New page assets are included in the atomic offline shell and syntax-checked in CI.
- Search index validates and exposes studio sections.
- Responsive layout, keyboard focus, reduced-motion and forced-colors behavior remain covered.


## Cross-project integration — public metadata implemented; private pairing proposed

MR_SIAVASH_AI remains the public identity, portfolio and learning surface. MR_SIAVASH_HUB_AI remains a separate local-first agent runtime. No shared identity, private data store, live API session or agent execution path exists between them.

Stage 1 is implemented as a build-time generated, versioned snapshot of the Hub's public main-branch commit and latest CI metadata. The generator allowlists fields, bounds response size, validates GitHub URLs and falls back to an explicit unavailable state. It does not call the Hub API or report local runtime health. Stage 2 remains owner-initiated pairing; private features must preserve Hub-side authentication, ownership, policy checks, approvals and audit. Do not create a public tunnel to the local runtime, wildcard CORS, browser-stored long-lived credentials or direct browser access to private Hub data. See docs/decisions/0004-hub-integration-boundary.md.
