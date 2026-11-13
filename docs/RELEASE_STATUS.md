# MR_SIAVASH_AI — verified release and acceptance status

## Live status addendum — 2026-11-14 (supersedes the 2026-11-13 telemetry finding)

A fresh read-only Workers Observability query over **2026-11-13 02:50–03:30 UTC** returned the completion record for the scheduled invocation at **2026-11-13 03:00:23.971 UTC**:

- Worker: `mr-siavash-ai-gateway`, Production version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`).
- Cron: `0 3 * * *`; scheduled invocation outcome: `ok`.
- Completion event: `support_retention_cleanup_completed`.
- Retention period: 90 days.
- Aggregate deleted counts: 0 support tickets, 0 idempotency records, and 0 rate-limit buckets.

This confirms successful completion for that invocation and that no records met the deletion criteria. It supersedes the earlier statement that completion was unverified. The reason the earlier observability query did not return the completion event is still undetermined; Issue #169 remains open to reconcile that query discrepancy and confirm the next scheduled run.

The current repository `main` head at this verification is `c35299be035a973d6921707c6f8f002af09e0e95`. Production remains on version 14 from source commit `1616545a2e204cb378e2c824299412ca20ef598b`; this documentation change is not a deployment.

No cleanup was manually invoked. No Production D1 application rows, Worker configuration, deployment, or retention setting were changed. The telemetry query returned only the scheduled event and aggregate completion counts; no support-ticket content was queried.

## Live status addendum — 2026-11-13

This addendum supplements the 2026-11-11 release snapshot below. Historical verification values are preserved.

- The latest recorded Production deployment remains Worker version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`) at 100% traffic, deployed from source commit `1616545a2e204cb378e2c824299412ca20ef598b` on 2026-11-11 12:31:27 UTC. The repository's current `main` has advanced to `0dd9d7752dd6410592e9dba815b2b4d0dfaa6a56`; this documentation update is not a Production deployment.
- The first post-version-14 scheduled cleanup emitted `support_retention_cleanup_completed` at 2026-11-12 03:00:24.092 UTC. The aggregate counts were 0 support tickets, 0 idempotency records, and 3 rate-limit buckets. The scheduled handler awaits the cleanup batch before emitting this event.
- A later scheduled invocation was recorded on 2026-11-13 03:00:23.971 UTC, but a read-only query did not find a matching completion event in the 02:50–03:30 UTC window. This does not prove a cleanup failure; it leaves that invocation's completion and aggregate counts unverified. Follow-up is tracked in [Issue #169](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/169).
- Production D1 records were not inspected or changed. No cleanup was invoked manually and no retention setting was changed.
- GitHub currently reports `main.protected = false`; branch protection remains an owner/admin action tracked in [Issue #70](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70).


**Verification date:** 2026-11-11  
**Repository:** `MRSIAVASSHIRBOT/MR_SIAVASH_AI`  
**Default branch head:** `1616545a2e204cb378e2c824299412ca20ef598b`  
**Production Worker:** `mr-siavash-ai-gateway`  
**Status authority:** This dated record supersedes older deployment snapshots elsewhere in the repository. It records only checks completed on or before the verification date; pending checks are not marked complete.

## Executive status

The current static site and Production Gateway release are deployed and responding. Version 14 receives 100% of Production Worker traffic. API readiness, module catalog, CORS policy, PWA offline shell, responsive page rendering, and core browser interactions were verified.

**The complete product vision is not finished.** Two operational acceptance items remain open: the first scheduled retention-cleanup execution (which cannot occur until its next scheduled time) and repository branch protection. End-to-end administrator ticket workflow acceptance and the broader account/cloud-workspace/remote-agent roadmap also remain outside the verified release.

## Source and Production deployment

| Item | Verified value |
| --- | --- |
| Main source commit | `1616545a2e204cb378e2c824299412ca20ef598b` |
| Production workflow run | [43021042712](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43021042712) |
| Worker version ID | `62e8a337-d804-4748-8bb2-d5e0180ee2f8` |
| Production traffic | 100% on version 14 |
| Deployment time | 2026-11-11 12:31:27 UTC |
| Workers AI model | `@cf/zai-org/glm-4.7-flash` |
| D1 binding | `DB` points to the existing Production database |
| Support retention | 90 days, owner-selected |
| Cron | `0 3 * * *` UTC |
| Allowed website origin | `https://mrsiavasshirbot.github.io` |
| Observability | Persistent logs/traces enabled; query-string redaction enabled |

The production release workflow reported validation and deployment success. Its release checks covered liveness/readiness, module catalog, support consent and retention gates, trusted/untrusted CORS, privacy-safe observability configuration, and a grounded Workers AI response with non-empty sources. The release gate reported 67 passing tests, with OpenAPI and isolated D1 migration validation successful.

## Live API checks

| Check | Result |
| --- | --- |
| `GET /v1/health/live` | HTTP 200; status `ok` |
| `GET /v1/health/ready` | HTTP 200; D1 ready; public support and tracking enabled; consent required; 90-day retention |
| `GET /v1/modules` | HTTP 200; nine public module IDs returned |
| Trusted-origin CORS preflight | HTTP 204; exact Pages origin allowed |
| Untrusted-origin CORS preflight | HTTP 403; no CORS grant |
| Observability query for post-deploy error events | No matching error events in the queried window |

The absence of matching error events applies only to the queried observability window; it is not a guarantee that no errors occurred outside that window.

## Browser and PWA acceptance

The deployed Pages site was opened in headless Chromium.

- The home, Academy, Python course, Digital Studio, privacy, and support-admin entry pages returned HTTP 200.
- Desktop page inspection found no browser console or uncaught page errors.
- On a 390-pixel mobile viewport, all six pages rendered without horizontal overflow.
- Global search opened, accepted a Persian query, and returned matching results.
- Module detail dialog opened and closed.
- Workspace task creation, completion toggle, and deletion worked in browser-local storage.
- Academy search and level filtering worked.
- Python lesson completion worked.
- Digital Studio project search and category filtering worked.
- The support form remained gated until the readiness endpoint reported the configured retention policy; privacy acknowledgement remained a required control.
- The service worker reached the activated state and served the application shell after the browser was switched offline.
- The web manifest returned HTTP 200 and parsed successfully; it declares standalone display and an app icon.

No real support ticket was submitted and no production D1 record was changed during these checks.

## AI response latency

The grounded assistant endpoint returned HTTP 200 with `mode: ai_grounded` and source references in repeated direct smoke requests. Observed response times were approximately 13.1–15.1 seconds in this test window. One request exceeded the 15-second browser timeout and the UI correctly displayed its timeout fallback; subsequent direct requests succeeded. This is a latency/UX risk near the configured timeout, not evidence that the endpoint is consistently available. Continue monitoring provider latency; do not claim an uninterrupted AI service.

## Remaining acceptance work

### 1. Scheduled retention telemetry — first run verified; subsequent run follow-up

- Production Cron remains configured for `0 3 * * *` UTC with the owner-selected 90-day retention period.
- The first post-version-14 cleanup event was verified on **2026-11-12 03:00:24.092 UTC** with aggregate-only counts: 0 support tickets, 0 idempotency records, and 3 rate-limit buckets.
- The **2026-11-13 03:00:23.971 UTC** scheduled invocation was recorded, but no matching completion event was found in the reviewed telemetry window. Successful completion and aggregate counts for that invocation remain unverified; this is not proof of failure.
- Follow-up: [Issue #169](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/169). The first-run acceptance record is [Issue #140](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/140) (closed).
- Do not manually invoke cleanup, inspect ticket contents, delete D1 rows, or alter the selected retention period to simulate a scheduled run.

### 2. Protect the main branch — owner/admin action pending

The repository currently reports `main.protected = false` and no configured repository rulesets. The available GitHub integration did not expose the required branch-protection/ruleset write permission. Recommended policy:

- Require pull requests to merge into `main`.
- Require the current-head Quality workflow to pass.
- Require branches to be up to date or use a reviewed merge queue.
- Block force pushes and branch deletion.
- Restrict bypass to the repository owner; avoid a mandatory approval rule that could lock out a sole maintainer.

No branch-protection settings were changed.

Tracking: [Issue #70](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70).

### 3. Additional product acceptance — not claimed complete

- End-to-end administrator browser acceptance: Access sign-in, inbox, ticket detail, reply, status update, and privacy-safe handling still require a controlled authorized session.
- Backup/restore and operational incident-recovery exercise remain separate acceptance work.
- Consumer accounts, private profiles, cloud workspace synchronization, billing, and remote agent execution are not live features.
- `MR_SIAVASH_HUB_AI` remains a separate local-first project. The public site exposes only a build-time snapshot of public GitHub metadata; it does not connect to Hub runtime, private memory, tasks, files, or agent tools.
- Academy progress and workspace tasks remain browser-local; no cross-device sync is provided.

## Safety and data boundary

Production D1 contains support records. Their contents were not inspected or exported during this verification. Do not reset the database, reapply migrations 0001–0003, expose ticket contents, or change retention policy without explicit approval. The browser QA used synthetic local test data only and did not create support tickets.

## Open work

- [Issue #169 — investigate missing completion telemetry on 2026-11-13](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/169)
- [Issue #140 — first post-version-14 scheduled cleanup (closed)](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/140)
- [Issue #70 — main branch protection and current-head CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70)

**Release verdict:** Production version 14 and the deployed web experience passed the checks listed above. The first post-version-14 scheduled cleanup event was verified, but a later invocation still needs telemetry reconciliation. Repository governance and the remaining explicitly scoped acceptance work also remain open; do not label the complete product vision “fully complete.”


## Support retention completion evidence

Scheduled support cleanup now writes one aggregate-only `support_retention_runs`
row in the same D1 batch as the three cleanup statements. If any cleanup
statement fails, the D1 batch rolls back and no successful-run row is committed.
The Cloudflare Access-protected endpoint
`GET /v1/admin/support/retention-runs` returns the latest 30 completion records;
it exposes timestamps, the configured retention period, and aggregate deletion
counts only—never ticket content, contact details, or access tokens. The
Cloudflare Access-protected support console displays the same history for
operators without requiring direct D1 queries. This
endpoint is available after migration `0004_support_retention_runs.sql` has been
applied to the target D1 database. No production migration or Worker deployment
is implied by this source change.



## Public release gate

GitHub Pages quality checks continue to run on pushes and pull requests, but
the public deployment job now runs only after an explicit
`workflow_dispatch` on `main`. Merging ordinary development PRs no longer
publishes the public site automatically.

