# Current source, Pages and PR checkpoint — 2026-11-21 17:46 UTC

This is a GitHub/Pages evidence checkpoint. It is not a fresh Cloudflare control-plane inventory and must not be read as proof that the current Gateway source is deployed to Production.

- Current GitHub `main`: `78b28cb89cdf4ff70106071740060c7e3f3327a0`.
- The main-branch Quality / GitHub Pages run [44929243795](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243795) completed successfully for that exact commit. Repository tests, OpenAPI validation, isolated D1 migration tests, Academy Chromium E2E, accessibility/responsive audit, Pages deployment, and the post-deploy exact-asset verification all passed.
- Gateway CI [44929243774](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243774), Workflow Security Audit [44929243855](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243855), OpenSSF Scorecard [44929243798](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243798), Cloudflare Gateway Runtime Smoke [44929243776](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243776), and Preview Runtime Smoke [44929243761](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44929243761) completed successfully on the same main SHA. Runtime smoke success is not a Cloudflare version/source readback.
- PR [#244](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/pull/244) remains open and unmerged. Its latest reviewed head is `a65a883351a0b05deb7846293aa935277875d532`. That branch restores the Dark Emerald theme, adds the privacy page and dedicated stylesheet, and extends Service Worker v69 navigation/offline tests. Exact-head CI passed **369/369 repository tests**, OpenAPI validation, isolated D1 migration validation (**5 migrations, 10 tables, 18 indexes**), Academy Chromium E2E, accessibility/responsive audit, Gateway CI, and Workflow Security Audit. Its Pages deploy job was skipped because it is a pull request.
- The PR's browser audit covered ten routes at 390×844 and 1440×900 with no horizontal overflow. It verified active Service Worker v69 and cached privacy HTML/CSS; the audit reported no console errors, failed same-origin requests, failed HTTP responses, uncaught page errors, or axe critical/serious violations.
- PR #244 is not part of the deployed `main` site. Its merge would trigger the main-branch Pages deployment workflow. No merge, Pages deployment from that PR, Cloudflare Worker release, Production D1 mutation, secret change, Access-policy change, DNS change, or traffic change is recorded here.
- No fresh Cloudflare control-plane inventory was performed in this checkpoint. Treat the dated Production/Preview versions and source annotations recorded in the historical sections below as historical until separately re-read from Cloudflare.

## Release boundary

GitHub Pages source and publication are verified for `78b28cb`. PR #244 is validated but awaiting owner authorization for merge and publication. A green PR check does not authorize a Production Pages release or a Cloudflare Worker deployment.

---

# GitHub source and Pages publication snapshot — 2026-11-21

This addendum records GitHub evidence for the current website source and static-site publication. It is not a fresh Cloudflare deployment inventory.

- Current GitHub `main`: `f5f98497de5811cb1601a1fc4058d0d8739af9ab`.
- Compared with the last recorded Production Worker source annotation `1616545a2e204cb378e2c824299412ca20ef598b`, GitHub reports **94 commits ahead and 0 behind**. This is a source comparison only.
- The current-main checks succeeded:
  - Gateway CI [44898889484](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889484).
  - Production Gateway runtime smoke [44898889412](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889412).
  - Preview Gateway runtime smoke [44898889504](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889504).
  - Quality checks / Pages [44898889442](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889442): syntax, OpenAPI, repository tests, isolated SQLite D1 migration tests, Academy Chromium acceptance, and accessibility/responsive smoke all passed.
  - The same Quality run's **Deploy static site** job succeeded, including upload, publication, and verification that published static assets match this commit.
  - Workflow Security Audit [44898889435](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889435) and OpenSSF Scorecard [44898889475](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44898889475) succeeded.
- The latest source includes the editorial homepage refresh, shared light color-scheme metadata, and service-worker cache version 67. PR #235 was merged as `f5f98497de5811cb1601a1fc4058d0d8739af9ab`.
- **GitHub Pages publication is verified for this commit. Cloudflare Worker deployment is not.** The Production and Preview runtime smoke jobs exercised their configured endpoints; they do not prove that the current 94-commit source delta was deployed to either Worker.
- Cloudflare was not re-read during this run. The last recorded inventory in the 2026-11-20 section below lists Production Worker version 14 and Preview version 8; those are historical observations until a fresh Cloudflare inventory confirms them.
- No Worker, D1 database, migration ledger, route, DNS record, secret, Access policy, or traffic split was changed in this run. Do not infer a Worker release or Production approval from green GitHub checks or successful Pages publication.

---

# Live Preview smoke-test reconciliation — 2026-11-20 15:30 UTC

This addendum records a failed runtime smoke and the source-level correction. It does not assert a new Preview deployment.

- The Preview runtime smoke on source commit `0e6df446a49bc599b8c16f5b4fa76b5d75894585` failed only at **Check grounded assistant response and fallback**. Liveness, D1 readiness, and the public module catalog passed.
- Job `136368326327` in workflow run [44759607643](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44759607643) shows `curl` timed out after 45 seconds with zero response bytes while calling `POST /v1/assistant/chat`. The failure is an observed request timeout; it is not evidence that the D1 database or public routes were unavailable.
- The smoke request previously had a 45-second maximum. The browser support client also used a 50-second timeout. The smoke did not have enough time to cover the longer tail of the non-streaming Workers AI call and fallback path.
- The Preview runtime smoke is now bounded at 75 seconds with a 10-second connect timeout and a 7-minute job budget. The Preview release acceptance uses a single 75-second assistant request without curl retries, avoiding duplicate model inference requests on an uncertain POST outcome. The browser client timeout is 80 seconds.
- This does **not** add provider retries or claim model cancellation. The current Workers AI adapter still documents one provider attempt and no request-timeout/cancellation capability. A timed-out provider request may therefore still end as a knowledge fallback or a smoke failure; the next exact workflow result is the acceptance evidence.
- The exact-head automated checks passed on source commit `230933b5cef14de176306fde28032ba0c5216972`:
  - Gateway CI [44764820219](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44764820219): passed.
  - Cloudflare Gateway Runtime Smoke [44764820326](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44764820326): passed.
  - Cloudflare Gateway Preview Runtime Smoke [44764821935](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44764821935): passed all seven steps, including the 75-second grounded-assistant request, D1 readiness, support/admin fail-closed checks, and trusted/untrusted CORS checks.
  - Quality checks / GitHub Pages workflow [44764819820](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44764819820): syntax/structure, repository tests, isolated D1 migrations, Academy Chromium acceptance, and accessibility/responsive audit all passed. The static-site Deploy job was skipped because this was a push-triggered run, not a manual deployment.
  - Workflow Security Audit [44764820823](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44764820823): passed.
- The timeout correction is therefore verified for the deployed Preview endpoint and exact source commit. This demonstrates a successful request under the 75-second bound; it does not prove provider-side cancellation or guarantee all future model requests finish within that bound.

**Release boundary:** no Cloudflare Worker was deployed by this work, no D1 migration or row was changed, and no secret, binding, route, Cron, Access policy, or Production traffic split was modified. Preview validation exercised the already deployed Preview Worker only. Production remains on its previously recorded version 14.

---

# Live Cloudflare and GitHub reconciliation — 2026-11-20 13:10 UTC

This is a fresh operational snapshot after Preview acceptance work and Production D1 migration reconciliation. Earlier snapshots below remain historical records; this section supersedes their live-state statements where they differ.

## Production Worker

- Active Worker: `mr-siavash-ai-gateway`.
- Active Production deployment remains deployment `5d335319-826a-40b0-8d65-cd9fdbe1c4ad`; version **14** (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`) still receives **100%** of traffic.
- The deployed version annotation identifies source commit `1616545a2e204cb378e2c824299412ca20ef598b`. The current Gateway source has not yet been rolled out to Production.
- The live Worker configuration still contains the Workers AI binding with `@cf/zai-org/glm-4.7-flash`, `SUPPORT_RETENTION_DAYS=90`, and daily Cron `0 3 * * *` UTC. Query-string redaction, logs, and traces remain enabled.
- Production D1 schema was inspected without reading ticket/message bodies or contact information. The existing schema matched the final forms of migrations 0001–0003; its migration ledger was absent. The standard `d1_migrations` ledger was reconciled on 2026-11-20 from that verified schema, then migrations 0004 and 0005 were applied.
- The ledger timestamps for migrations 0001–0003 are **reconciliation timestamps**, not claims about their original historical application dates.
- Migration 0005 created two truthful baseline status events for the two existing open tickets. Aggregate counts after migration remain **2 tickets and 5 messages**; status-event count is **2**. No support ticket or message was deleted or edited. `PRAGMA foreign_key_check` returned no violations.
- A D1 Time Travel bookmark was captured immediately before the Production schema writes. No restore was performed.

## Preview Worker

- Preview Worker `mr-siavash-ai-gateway-preview` now runs version **8** (`144012c6-6731-476c-8127-70fade6585b3`) at **100%** traffic.
- Version 8 carries the reviewed current-main source annotation `6c459596cf1211667995d6b2f6b815de1dae17f5`. It preserves the isolated Preview D1 binding and the existing Cloudflare Access administrator variables, and includes the Workers AI binding/model.
- Preview D1 migrations 0001–0005 are present in its migration ledger. Migrations 0004/0005 created the retention-run and ticket-status-history tables, indexes, and status triggers. The Preview database had zero tickets before migration, so no ticket baseline rows were written.
- Live HTTP checks passed: `/v1/health/live` **200**, `/v1/health/ready` **200** (database ready, retention 90 days), and `/v1/modules` **200** (9 modules).
- The Workers AI model API returned a Persian final answer when given sufficient output-token budget. The full Gateway `POST /v1/assistant/chat` acceptance request has **not yet been independently verified**; the production release workflow includes this grounded-response smoke check.

## GitHub source comparison and CI

- Current GitHub `main`: `6c459596cf1211667995d6b2f6b815de1dae17f5`.
- Compared with the active Production source annotation, GitHub reports **56 commits ahead and 0 behind**.
- PR #204 (Preview AI binding, migration acceptance, and rollback checks) was merged to `main`. Its exact PR head `d4046e6288b284f4be36e062ab6f8123d35bea0e` passed Gateway CI, Workflow Security Audit, and Quality checks. The static Pages deployment job was skipped.
- The Production release script and workflow remain manual-only. A current-main Preview deployment is not itself approval to change Production Worker traffic.

## Release decision and safety boundary

**Production Worker code remains on version 14.** Production D1 migrations 0004/0005 are applied and additive, while the old Worker remains healthy and compatible. A Production code rollout still requires the existing manual workflow on `main`, first with `deploy=false` for read-only validation, followed by the protected `deploy=true` release with Workers AI and 90-day retention explicitly preserved. Its grounded AI, consent-gate, CORS, readiness, and rollback checks must pass before the release is considered complete.

No DNS, route, Cloudflare Access policy, administrator allowlist, secret, Production Worker traffic split, or Cron schedule was changed during this reconciliation. No ticket/message content was read; only schema and aggregate row counts were queried.

---

## GitHub source-drift verification — 2026-11-19 UTC

This is a GitHub-only comparison against the last Production source annotation recorded below. It is not a fresh Cloudflare deployment inventory.

- Current GitHub `main`: `17e190e7876e4955845876c9188f9e0eb65f785c`.
- Last recorded Production source annotation: `1616545a2e204cb378e2c824299412ca20ef598b` (Worker version 14, recorded in the 2026-11-16 evidence snapshot below; not independently re-read from Cloudflare during this verification).
- GitHub compare from that recorded annotation to current `main`: **49 commits ahead, 0 behind**.
- The source delta includes Gateway runtime and tests, D1 migrations `0004_support_retention_runs.sql` and `0005_support_ticket_status_history.sql`, Academy and support workflows, and the private local Subtitle Studio.
- Current-main check-runs on this SHA: repository tests, syntax/structure, Workflow Security Audit, supply-chain posture, Preview API smoke, and Gateway health/CORS smoke succeeded. The static Pages deployment job was skipped because it is not an automatic deployment on this event.
- The isolated SQLite migration tests validate the repository migration chain; they do not prove that migrations 0004/0005 are applied to Production D1. The live Production D1 migration state was not queried.
- Cloudflare Production and Preview deployment metadata were not re-read during this verification. The active Worker/version and Preview version therefore remain **last-recorded values**, not newly confirmed current state.
- The Production release workflow remains manual, defaults to `deploy=false`, requires `main` for a requested deployment, and retains the owner-controlled `cloudflare-production` environment gate.

**Release decision:** keep Production deployment blocked pending a fresh read-only Cloudflare deployment inventory, migration-state verification without application-row access, exact-candidate Preview acceptance, backup/rollback rehearsal, and explicit owner approval. Do not infer deployment from green GitHub checks or this commit comparison.

No Worker deployment, D1 migration or application-row read, route/DNS change, secret, schedule, or Cloudflare setting was changed for this snapshot.

---

## Live Production/source-drift addendum — 2026-11-16 UTC

This is a new read-only evidence snapshot. It supersedes the older commit-count statements below only for current source-drift status; historical deployment and telemetry records remain unchanged.

- Current GitHub `main`: `00f653837e1796ee85d0587f2c4095b3c7f0a258`.
- Active Production Worker: `mr-siavash-ai-gateway`, version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`) at 100% traffic.
- Latest observed Production deployment: `5d335319-826a-40b0-8d65-cd9fdbe1c4ad`, created 2026-11-11 12:31:27 UTC.
- The active version-14 source annotation identifies `1616545a2e204cb378e2c824299412ca20ef598b`.
- GitHub compare from that deployed source annotation to current `main` reports **40 commits ahead, 0 behind**. The delta includes Gateway runtime/tests, Academy/support changes, and D1 migrations `0004_support_retention_runs.sql` and `0005_support_ticket_status_history.sql`.
- Current-main checks on `00f653837e1796ee85d0587f2c4095b3c7f0a258` succeeded: Gateway CI, Quality/Pages, Production Runtime Smoke, Preview Runtime Smoke, Workflow Security Audit and OpenSSF Scorecard. The static Pages deployment job was skipped on the push event; no Pages deployment is claimed.
- The isolated SQLite migration suite validates the ordered migration chain, the retention-run constraints, support-ticket status-history baseline/transition triggers, indexes and cascade behavior. This is not evidence that migrations 0004/0005 have been applied to Production D1. The live Production D1 migration state was not queried.
- The separate Preview Worker is not Production. The latest observed Preview state is version 6; a version-7 deployment was followed by rollback to version 6. Preview acceptance must be repeated against the exact release candidate before any Production decision.
- The Production release workflow remains manual-only, defaults to `deploy=false`, requires `main` when deployment is requested, and uses the owner-controlled `cloudflare-production` environment gate.
- [Issue #120](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/120) remains open for complete source review, Preview acceptance, Production D1 migration-state verification, backup/rollback review and explicit owner approval.
- [Issue #70](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70) remains open for owner-managed branch protection. No access-control settings were changed.

**Release decision:** do not deploy Production from green CI or the commit comparison alone. First verify the live migration state without exposing application rows, rehearse the candidate against isolated Preview, validate backups and rollback, and obtain explicit owner approval.

No Production Worker deployment, D1 migration, application-row read, route/DNS change, secret, schedule or Cloudflare setting was changed for this snapshot.

---

# Production/source drift evidence snapshot — 2026-11-15 12:40 UTC

This is a timestamped evidence snapshot. Later documentation commits may advance `main`; re-run the source comparison before any release decision.

- GitHub `main` at snapshot time: `c5a0dcd0f50e83a1f5651ae845ac179975ce10eb`.
- Production Worker at snapshot time: `mr-siavash-ai-gateway`, version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`) at 100% traffic.
- The Production version annotation identifies source commit `1616545a2e204cb378e2c824299412ca20ef598b`.
- GitHub compare from the deployed source commit to snapshot `main` reports **36 commits ahead and 0 behind**. The diff includes `cloudflare/gateway/src/index.js` (+223/-13), `cloudflare/gateway/tests/gateway.test.mjs` (+311/-20), and migration `0004_support_retention_runs.sql`, plus workflow, API, and site changes. Production source parity is therefore **not established** for the snapshot.
- The separate `mr-siavash-ai-gateway-preview` Worker is version 7 at 100% of that preview script; it is not the Production Worker and does not authorize a Production release.
- Production query-string redaction is enabled and the daily `0 3 * * *` UTC schedule remains configured. The 2026-11-13 scheduled cleanup completion event was confirmed by a read-only telemetry query on 2026-11-14 with aggregate counts of 0 support tickets, 0 idempotency records, and 0 rate-limit buckets; Issue #169 was closed.
- Exact-snapshot main-head checks succeeded: Gateway CI [#43709258387](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258387), Quality/Pages [#43709258423](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258423), Production runtime smoke [#43709258353](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258353), Preview runtime smoke [#43709258499](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258499), Workflow Security Audit [#43709258378](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258378), and OpenSSF Scorecard [#43709258385](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/43709258385). The Pages deployment job is manual-only and was not run by these push checks. These results do not establish a Cloudflare Production deployment.
- The Production release workflow remains manual-only, defaults to `deploy=false`, and requires the configured production environment review gate. No deployment, D1 application-row read, route change, or Cloudflare setting mutation occurred in this review.
- GitHub branch metadata reports `main.protected=false`; see [Issue #70](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70).
- Keep [Issue #120](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/120) open until current source review, preview acceptance, migration/backup/rollback review, and explicit owner approval are complete.

**Release decision:** do not deploy Production solely because current-main CI is green. Review the full 36-commit snapshot delta and migration/operational impact first.

# MR_SIAVASH_AI — verified release and acceptance status

## Live status addendum — 2026-11-14 (supersedes the 2026-11-13 telemetry finding)

A fresh read-only Workers Observability query over **2026-11-13 02:50–03:30 UTC** returned the completion record for the scheduled invocation at **2026-11-13 03:00:23.971 UTC**:

- Worker: `mr-siavash-ai-gateway`, Production version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`).
- Cron: `0 3 * * *`; scheduled invocation outcome: `ok`.
- Completion event: `support_retention_cleanup_completed`.
- Retention period: 90 days.
- Aggregate deleted counts: 0 support tickets, 0 idempotency records, and 0 rate-limit buckets.

This confirms successful completion for that invocation and that no records met the deletion criteria. A follow-up read-only query using an explicit service filter and a case-sensitive event needle returned the completion event with no query errors; the earlier no-match was a query/filter mismatch, not evidence of a failed cleanup. Issue #169 was closed on 2026-11-14 after this reconciliation. Continue monitoring the next scheduled run; no manual cleanup or production change was needed.

The current repository `main` head at this verification is `c35299be035a973d6921707c6f8f002af09e0e95`. Production remains on version 14 from source commit `1616545a2e204cb378e2c824299412ca20ef598b`; this documentation change is not a deployment.

No cleanup was manually invoked. No Production D1 application rows, Worker configuration, deployment, or retention setting were changed. The telemetry query returned only the scheduled event and aggregate completion counts; no support-ticket content was queried.

## Live status addendum — 2026-11-13

This addendum supplements the 2026-11-11 release snapshot below. Historical verification values are preserved.

- The latest recorded Production deployment remains Worker version 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`) at 100% traffic, deployed from source commit `1616545a2e204cb378e2c824299412ca20ef598b` on 2026-11-11 12:31:27 UTC. The repository's current `main` has advanced to `0dd9d7752dd6410592e9dba815b2b4d0dfaa6a56`; this documentation update is not a Production deployment.
- The first post-version-14 scheduled cleanup emitted `support_retention_cleanup_completed` at 2026-11-12 03:00:24.092 UTC. The aggregate counts were 0 support tickets, 0 idempotency records, and 3 rate-limit buckets. The scheduled handler awaits the cleanup batch before emitting this event.
- A later scheduled invocation was recorded on 2026-11-13 03:00:23.971 UTC. At the time of this 2026-11-13 addendum, the initial read-only query did not find a matching completion event, so completion was left unverified; the 2026-11-14 follow-up query resolved this as a query/filter mismatch and confirmed the completion event. See the live status addendum above; Issue #169 was closed on 2026-11-14.
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
- The **2026-11-13 03:00:23.971 UTC** invocation was initially unverified, but the 2026-11-14 read-only query with an explicit service filter and case-sensitive event needle confirmed `support_retention_cleanup_completed`. Aggregate deletion counts were 0 support tickets, 0 idempotency records, and 0 rate-limit buckets. The earlier no-match was a query/filter mismatch, not a cleanup failure.
- Resolution: [Issue #169](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/169) was closed on 2026-11-14 after telemetry reconciliation. The first-run acceptance record is [Issue #140](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/140) (closed). Continue monitoring subsequent scheduled runs.
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

- [Issue #70 — main branch protection and current-head CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/issues/70)

**Release verdict:** Production version 14 and the deployed web experience passed the checks listed above. Both the 2026-11-12 and 2026-11-13 scheduled cleanup completion events were verified with aggregate-only counts; the 2026-11-13 query discrepancy was reconciled and Issue #169 was closed. Repository governance and the remaining explicitly scoped acceptance work also remain open; do not label the complete product vision “fully complete.”


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



---

## GitHub-only source-drift checkpoint — 2026-11-20 UTC

This checkpoint updates the source comparison only. It does not represent a new Cloudflare inventory or a release approval.

- Observed GitHub `main` at the start of this checkpoint: `046dcdbc8add03fac4ffa92cb281bdf51e952f06`.
- Compared with the last recorded Production source annotation `1616545a2e204cb378e2c824299412ca20ef598b`, GitHub reports **52 commits ahead and 0 behind**.
- On the exact observed `main` SHA, Gateway CI, Quality/structure checks, Workflow Security Audit, OpenSSF Scorecard, Preview runtime smoke, and Gateway health/CORS smoke completed successfully. The static-site deployment job was skipped; these checks do not establish a Pages or Cloudflare deployment.
- The comparison includes the current Subtitle Studio and WebVTT cue-preservation work, as well as the previously documented Gateway, Academy, support, and migration changes. The complete file list is available in the GitHub compare view.
- The last Cloudflare inventory recorded in this document remains historical evidence: Production version 14 and Preview version 6. Cloudflare deployment metadata and D1 migration state were **not re-read during this GitHub-only checkpoint**.
- Production release remains blocked pending a fresh read-only deployment inventory, verification of D1 migration state without application-row access, exact-candidate Preview acceptance, backup/rollback rehearsal, and explicit owner approval.

No Worker deployment, D1 migration or application-row read, route/DNS change, secret, schedule, or Cloudflare setting was changed for this checkpoint.


---

## GitHub-only source-drift checkpoint — 2026-11-20 12:45 UTC

This checkpoint updates GitHub source evidence only. It is not a fresh Cloudflare inventory, a D1 migration check, or a release approval.

- Current GitHub `main`: `d444fed420a047ba35b6734b77ce0e045b4624fe`.
- Compared with the last recorded Production source annotation `1616545a2e204cb378e2c824299412ca20ef598b`, GitHub reports **53 commits ahead and 0 behind**.
- On this exact `main` SHA, the latest observed push runs completed successfully: Gateway CI (44727884979), Quality checks (44727885094), Workflow Security Audit (44727885016), OpenSSF Scorecard (44727885042), Preview runtime smoke (44727885090), and Gateway runtime smoke (44727885117).
- The delta includes the Gateway runtime and tests, D1 migrations `0004_support_retention_runs.sql` and `0005_support_ticket_status_history.sql`, Academy/support changes, and the local Subtitle Studio. The exact file list is available in the GitHub compare view.
- The latest Cloudflare deployment inventory recorded in this document remains historical: Production version 14 and Preview version 6. Cloudflare deployment metadata and Production D1 migration state were **not re-read in this checkpoint**.
- The isolated SQLite migration suite validates the repository migration chain; it does not prove that migrations 0004/0005 are applied to Production D1.
- Production release remains blocked pending a fresh read-only Cloudflare deployment inventory, verification of D1 migration state without application-row access, exact-candidate Preview acceptance, backup/rollback rehearsal, and explicit owner approval.

No Worker deployment, D1 migration or application-row read, route/DNS change, secret, schedule, or Cloudflare setting was changed for this checkpoint.


---

## GitHub-only source-drift checkpoint — 2026-11-20 12:08 UTC

This checkpoint follows the documentation-only merge of PR #202. It updates GitHub source evidence only; it is not a fresh Cloudflare inventory, D1 migration check, or release approval.

- Current GitHub `main`: `e16009ba5b0a42cfa7e59ded6346b35bb688c42d`.
- Compared with the last recorded Production source annotation `1616545a2e204cb378e2c824299412ca20ef598b`, GitHub reports **54 commits ahead and 0 behind** (79 changed paths in the compare result).
- On this exact `main` SHA, the latest observed push runs all completed successfully: Gateway runtime smoke (44733034614), Preview runtime smoke (44733034598), Gateway CI (44733034654), Quality checks (44733034684), Workflow Security Audit (44733034633), and OpenSSF Scorecard (44733034761).
- The static Pages deployment job was skipped. These checks do not establish a Pages deployment or a new Cloudflare Worker deployment.
- The latest Cloudflare deployment inventory recorded in this document remains historical: Production version 14 and Preview version 6. Cloudflare deployment metadata and Production D1 migration state were **not re-read** after this source comparison.
- The isolated SQLite migration suite validates the repository migration chain; it does not prove that migrations 0004/0005 are applied to Production D1.
- Production release remains blocked pending a fresh read-only Cloudflare deployment inventory, verification of D1 migration state without application-row access, exact-candidate Preview acceptance, backup/rollback rehearsal, and explicit owner approval.

No Worker deployment, D1 migration or application-row read, route/DNS change, secret, schedule, or Cloudflare setting was changed for this checkpoint.


---

## Live release reconciliation — 2026-11-20 (supersedes earlier same-day snapshots)

This section records a fresh, read-only GitHub and Cloudflare inventory after PR #216. It does not authorize or represent a new deployment.

### GitHub source and automation

- Default branch `main`: **`21faae3e88d2f10a653948e75a42447141ed202a`**. No newer commit was present at the time of this inspection, and no open pull requests were found.
- The six main-branch workflows associated with this exact SHA completed successfully:
  - [Gateway Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774478418)
  - [OpenSSF Scorecard](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774475839)
  - [Quality](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774475707)
  - [Preview Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774475588)
  - [Workflow Security Audit](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774475459)
  - [Gateway CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44774475434)
- The Quality run's `Syntax and structure checks` job succeeded; its `Deploy static site` job was **skipped** because this was a push event, not a manual dispatch. This is not evidence of a Pages publication.
- `main` remains unprotected and the repository rulesets endpoint returned an empty list. No branch-protection setting was changed.

### Cloudflare Worker source drift

| Environment | Active version | Active version ID | Source annotation | Current main ahead |
| --- | ---: | --- | --- | ---: |
| Production | 14 | `62e8a337-d804-4748-8bb2-d5e0180ee2f8` | `1616545a2e204cb378e2c824299412ca20ef598b` | 76 commits |
| Preview | 8 | `144012c6-6731-476c-8127-70fade6585b3` | `6c459596cf1211667995d6b2f6b815de1dae17f5` | 20 commits |

Both comparisons report **0 commits behind** for the deployed source relative to `main`. Each active Worker receives 100% of its environment's traffic. These are separate environments; Preview version 8 is not the current `main` candidate, and Production version 14 is not current `main`.

Both Workers currently expose the AI binding and configured model, their environment-specific D1 binding, a 90-day support-retention variable, and the `0 3 * * *` UTC Cron schedule. This verifies configuration only, not deployment of the latest source.

### D1 schema and audit evidence

- Production (`mr-siavash-ai-prod`) and Preview (`mr-siavash-ai-preview`) each report 10 tables.
- Both migration ledgers contain `0001_workspace_tasks.sql` through `0005_support_ticket_status_history.sql`.
- Read-only migration-ledger and aggregate queries returned `rows_written=0` and `changed_db=false`; no support-ticket or message contents were read.
- Aggregate row count for `support_retention_runs` is currently **0** in both databases. The schema exists, but a persisted retention-run audit record has not been demonstrated in either environment by this query. Do not describe the retention audit history as operationally verified until an exact-source Preview release and a subsequent scheduled execution are checked.
- A D1 Time Travel bookmark was returned for each database, but a bookmark is not a separately exported backup and does not prove that restore works. No export/import or restore rehearsal was performed.

### Release decision and remaining gates

- Keep Production release blocked. The deployed Production Worker remains 76 commits behind current `main`; the official release workflow defaults to `deploy=false` and uses the separate `cloudflare-production` environment.
- Deploy the current reviewed candidate to Preview only through the repository's official manual `gateway-preview.yml` workflow, then verify its exact source annotation, readiness, grounded assistant response, admin-access denial, CORS behavior, and retention audit behavior.
- Verify a restorable backup using a separate, approved test target before any Production migration or release. Do not restore over either live database as a test.
- GitHub Pages publication also requires its official manual `workflow_dispatch` on `main`; the connected GitHub actions used for this inspection do not expose a workflow-dispatch operation. Public asset versions were not verified during this inspection.
- Repository branch protection remains an owner/admin configuration action; no write operation for it was available in the connected GitHub action set.

No Worker version, traffic split, D1 application data, migration, secret, Access policy, DNS record, Cron schedule, Pages deployment, or repository governance setting was changed during this reconciliation.


---

## Preview release reconciliation after PRs #218–#220 — 2026-11-20 UTC

This checkpoint supersedes the earlier 2026-11-20 source and Preview-release snapshots above. It records GitHub Actions and Cloudflare evidence after the Preview secret compatibility, search, and release-diagnostics changes were merged. It does not authorize Production release.

### Current source and CI

- Current `main`: **`78a53457c0de96a376ff73c0dd2e55571efc2b2e`**.
- PR #218 (`84ced97560fcd775cca8c71da7bec930295b4a76`) accepts either `CLOUDFLARE_API_TOKEN` or the legacy `CF_API_TOKEN` in the `gateway-preview` environment. The selected secret remains a GitHub Actions control-plane credential and is not a Worker binding.
- PR #219 (`5428acbfe658ed8dac5b3bc88371f543f6dcdad1`) adds the global Ctrl/Cmd+K search shortcut, Persian/Arabic letter and numeral normalization, bounded typo tolerance, and service-worker cache v62.
- PR #220 (`78a53457c0de96a376ff73c0dd2e55571efc2b2e`) adds named Preview acceptance checks with bounded/redacted diagnostics. It avoids logging the generated answer or full response body and escapes GitHub workflow-command control characters.
- All six main-branch workflows associated with this exact SHA completed successfully: [Preview Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687651), [Gateway CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687620), [Workflow Security Audit](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687579), [Production Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687578), [OpenSSF Scorecard](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687577), and [Quality](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44790687490).
- The Preview Runtime Smoke's seven checks all passed against the **currently active Preview endpoint**. The Quality job passed, but its Pages deployment job was skipped on the push event. Neither result establishes deployment of current-main source to Preview or Pages.

### Official Preview dispatch and rollback — run 44788083549

The official manual Preview workflow was dispatched on `main` at source SHA `84ced97560fcd775cca8c71da7bec930295b4a76` (after PR #218, before PRs #219 and #220).

- The secret-configuration preflight passed, demonstrating that one of the supported secret names was populated for this run; no secret value was read or logged.
- The workflow captured the existing 100% traffic split and Cron schedule, built the isolated Preview configuration, ran the Preview-only D1 migration command (Wrangler reported `No migrations to apply`), and passed the Preview migration-ledger check.
- Worker version upload completed, and the following binding/admin-configuration verification passed.
- The combined deployed-route and grounded-AI acceptance step failed. The older workflow version emitted only the step exit code and did not expose which inner request/contract failed; therefore the exact failing sub-check is **not established** from this run's logs.
- The workflow's automatic rollback completed successfully and restored Preview traffic and Cron schedules to the captured pre-release state.
- Cloudflare records an uploaded Preview version **9** (`9e15434e-df74-41a7-995c-c4611e5e0de4`) created at 2026-11-20 17:57:03 UTC. It has no source-commit annotation in the version record and is not receiving traffic after rollback.

### Current Cloudflare state after rollback

| Environment | Active Worker version | Active version ID | Source annotation | Current main ahead |
| --- | ---: | --- | --- | ---: |
| Production | 14 | `62e8a337-d804-4748-8bb2-d5e0180ee2f8` | `1616545a2e204cb378e2c824299412ca20ef598b` | 80 commits |
| Preview | 8 | `144012c6-6731-476c-8127-70fade6585b3` | `6c459596cf1211667995d6b2f6b815de1dae17f5` | 24 commits |

Both deployed-source comparisons report zero commits behind current `main`. Production and Preview each have 100% of their respective traffic on the active version shown above. Preview version 9 is an uploaded candidate only; the post-rollback Preview smoke success applies to active version 8, not version 9 or current `main`.

Both active Workers retain the AI binding, configured `@cf/zai-org/glm-4.7-flash` model, environment-specific D1 binding, 90-day support-retention variable, and `0 3 * * *` UTC Cron schedule.

### D1 and retention audit

- Production and Preview each report 10 tables and migration ledger entries `0001` through `0005`.
- Read-only aggregate queries report `support_retention_runs=0` in both databases. The query metadata returned `rows_written=0` and `changed_db=false`; no support-ticket or message contents were inspected.
- The existence of the migration/table is not proof of an observed scheduled retention completion. Verify a persisted audit row after the exact current-main Preview release and a later scheduled execution.
- Previously recorded D1 Time Travel bookmarks are not exported backups and do not prove a tested restore path.

### Remaining gates

- Re-dispatch the official Preview workflow from current `main` so the #220 diagnostic changes are included. Review its named failing check if acceptance fails; confirm active version annotation, 100% traffic, D1 isolation, admin fail-closed, CORS, and grounded-AI acceptance before considering Preview accepted.
- Do not deploy Production. It remains 80 commits ahead of its active source annotation; the separate production workflow defaults to `deploy=false` and requires the `cloudflare-production` environment gate plus explicit owner approval.
- No Pages `workflow_dispatch` run was observed in the current Actions inventory. Public assets could not be fetched from the current network context, so the live Pages cache version is **unverified**. Run the official manual Pages workflow on `main`, then verify `support.js`, `search-index.json`, `site-search.js`, and `sw.js` from the public origin.
- `main` remains unprotected and the repository Rulesets endpoint is empty; governance configuration remains an owner/admin action.
- No Backup/Restore rehearsal has been completed. Use a separate test target; never restore over either live D1 database as a test.

No Production Worker, Production D1, secret, Access policy, DNS, Production traffic, or Pages configuration was changed during this reconciliation. The Preview-side effects were the official manual release workflow's no-op migration check, candidate upload, and automatic rollback; no manual D1 application-row write or traffic override was performed outside that workflow.


---

## Successful current-code Preview release — 2026-11-20 UTC

This addendum supersedes the earlier same-day Preview failure-only status above. It records the later successful manual release, independent Cloudflare state, and post-merge smoke results.

### Exact-source release evidence

- Official manual Preview workflow: [run 44792360116](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792360116), `workflow_dispatch`, source SHA `78a53457c0de96a376ff73c0dd2e55571efc2b2e`, conclusion **success**.
- Preview D1 migration command reported `No migrations to apply`; the D1 ledger check for migrations 0004 and 0005 succeeded.
- Worker upload and Preview binding/admin-configuration checks succeeded. The automatic rollback step was skipped because acceptance passed.
- Release acceptance evidence from the workflow log:
  - `/v1/health/live`: HTTP 200.
  - `/v1/health/ready`: HTTP 200.
  - `/v1/modules`: HTTP 200; nine modules.
  - Trusted-origin CORS preflight: HTTP 204.
  - Assistant endpoint: HTTP 200, `mode=ai_grounded`, **2 source references**, and a non-empty answer (590 characters). The answer text was not logged.
- Cloudflare independently reports active Preview Worker version **10**, version ID `5c02fb2b-6d7a-4aed-a3ff-2b0cfeb05f9c`, receiving **100%** of Preview traffic. Deployment ID: `1f5cda65-e086-446f-a0af-c03ce07697b5`, created 2026-11-20 18:24:19 UTC.
- The successful deployment ran from `78a5345`. Current `main` is now `858b66f2f0b2169a8e4949efc225a9b2677282aa`; the only commit after the Preview release is PR #221, a documentation-only change to `docs/RELEASE_STATUS.md`. Therefore no runtime-source code changed after the successful Preview release.

**Version metadata limitation:** Cloudflare's active Preview version-10 metadata does not expose a `workers/commit_sha` or `workers/message` annotation. The source SHA above is verified from the successful GitHub Actions run that checked out and deployed it, not from a Cloudflare version annotation. Retain this distinction until deployment annotations are made consistent.

### Post-merge operational verification

All six workflows on current main `858b66f` completed successfully:

- [Gateway Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852376)
- [Preview Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852492)
- [Workflow Security Audit](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852586)
- [OpenSSF Scorecard](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852454)
- [Gateway CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852446)
- [Quality](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44792852432)

Preview Runtime Smoke passed all seven checks, including support/admin fail-closed behavior and trusted/untrusted CORS. Production Runtime Smoke passed liveness/readiness, read-only public support checks, anonymous administrator-route denial, and trusted/untrusted CORS. Quality passed; its Pages deployment job was **skipped** on the push event.

### Current deployment and data boundaries

- Preview active version: 10 (`5c02fb2b-6d7a-4aed-a3ff-2b0cfeb05f9c`), 100% traffic, released from `78a5345`.
- Production active version: 14 (`62e8a337-d804-4748-8bb2-d5e0180ee2f8`), 100% traffic, annotated to `1616545a2e204cb378e2c824299412ca20ef598b`. Current main is **81 commits ahead** of this Production source.
- Production release remains blocked. No Production Worker, D1 migration, application data, traffic, secret, Access policy, or DNS configuration was changed.
- Both D1 databases still report migrations 0001–0005 and 10 tables. Read-only queries show `support_retention_runs=0` in both and `rows_written=0`, `changed_db=false`. A persisted scheduled-retention audit run is still unverified.
- No D1 export/restore rehearsal is recorded. Time Travel bookmarks are not tested backups.
- No GitHub Pages `workflow_dispatch` run has been observed. The latest Quality push skipped the Pages deploy job; public asset versions remain unverified.
- `main` remains unprotected and repository Rulesets are empty. Owner/admin governance configuration remains outstanding.

No Pages publication or Production release occurred as part of the successful Preview deployment. The next safe operations are Pages publication with an authenticated GitHub session, a separate-target backup/restore rehearsal, and continued observation of the Preview retention audit after its scheduled run.


---

## Final release and automation reconciliation — 2026-11-20 UTC

This addendum supersedes the earlier same-day state snapshots. It records the post-merge result of PR #223 and the latest read-only Cloudflare inventory. It does not represent a new Preview or Production release.

### GitHub source and CI

- Current `main`: **`a1aeffee8d701b31f4ecae2c3d9372330e58c20c`**. No open PRs remain.
- PR #223 was squash-merged. It changes only the official Preview release workflow, its regression tests, and the small metadata validator; it does not change Worker runtime source.
- All six post-merge workflows on this exact SHA succeeded:
  - [Quality](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794857904) — repository tests, OpenAPI, isolated D1 migration tests, Academy Chromium E2E, and accessibility/responsive checks passed; Pages deploy job skipped.
  - [Workflow Security Audit](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794858205)
  - [Production Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794858137)
  - [Gateway CI](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794858182)
  - [OpenSSF Scorecard](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794858179)
  - [Preview Runtime Smoke](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44794858064)
- The repository's Pages deployment job remains manual-only and was skipped on the push event. No Pages `workflow_dispatch` run was found in the current Actions inventory.

### Preview provenance improvement (PR #223)

- The official Preview deploy command now supplies the full `GITHUB_SHA` to Wrangler through `--tag` and `--message`.
- Before binding checks and runtime acceptance continue, the workflow reads the latest active 100%-traffic version and verifies that Cloudflare's `workers/tag` and `workers/message` annotations exactly match the workflow SHA.
- A missing/mismatched source annotation fails acceptance and enters the existing automatic Preview traffic/Cron rollback path.
- Unit tests cover a correct tag/message, mismatched tag, mismatched message, missing annotations, malformed SHA, and the workflow wiring. They passed as part of PR #223 Quality.
- **Not yet remotely exercised:** PR #223 has merged, but no new manual Preview dispatch has run after it. Do not claim the active Preview version has the new annotations yet.

### Current Cloudflare state

| Environment | Active version | Version ID | Traffic | Active source |
| --- | ---: | --- | ---: | --- |
| Preview | 10 | `5c02fb2b-6d7a-4aed-a3ff-2b0cfeb05f9c` | 100% | Released by successful run `44792360116` from `78a53457c0de96a376ff73c0dd2e55571efc2b2e` |
| Production | 14 | `62e8a337-d804-4748-8bb2-d5e0180ee2f8` | 100% | `1616545a2e204cb378e2c824299412ca20ef598b` |

The active Preview version still has no Cloudflare source tag/message annotations because it predates PR #223. Since its release at `78a5345`, the three commits now on `main` modify only documentation, Preview release automation, and tests; the Gateway Worker runtime source has not changed. Current `main` is 3 commits ahead of the active Preview release source and 83 commits ahead of the Production source.

Both active Workers retain their AI binding and configured `@cf/zai-org/glm-4.7-flash` model, environment-specific D1 connection, 90-day retention configuration, and `0 3 * * *` UTC Cron schedule.

### D1 and data boundaries

- Production and Preview each have migration ledger entries `0001` through `0005`.
- Read-only aggregate queries continue to report `support_retention_runs=0` in each environment, with `rows_written=0` and `changed_db=false`.
- No support-ticket or message contents were read.
- The prior Time Travel bookmarks are not exported backups and do not prove restore capability. No backup/restore rehearsal has been completed.

### Remaining operational gates

- **Preview:** run the official manual `gateway-preview.yml` from current `main` to exercise PR #223's source-tag/message verification and confirm the new version becomes active at 100% traffic.
- **Pages:** dispatch the official `deploy.yml` workflow manually from `main`; then fetch and verify the published `support.js`, `search-index.json`, `site-search.js`, and `sw.js`. Public asset version remains unverified.
- **Production:** keep the release gate closed. The active Production version is 83 commits behind current `main`; a complete source/migration/backup/rollback review and explicit owner approval are required before deployment.
- **Governance:** `main.protected=false` and the repository Rulesets endpoint remains empty. Branch protection is still an owner/admin configuration action.

No Production Worker, Production D1 data or migration, Pages configuration, DNS, Access policy, Secret, Cron schedule, or traffic split was changed in this reconciliation.


---

## Direct public Pages asset verification — 2026-11-20 UTC

This is a read-only comparison of public GitHub Pages assets against current source. It supersedes the earlier statement that public asset versions were unverified.

### Public origin result

A browser read of `https://mrsiavasshirbot.github.io/MR_SIAVASH_AI/` confirmed the page loads. These same-origin assets all returned **HTTP 200**: `support.js`, `search-index.json`, `site-search.js`, and `sw.js`.

The public assets are served, but their content is stale relative to the current source checkpoint `44554134d4c55f1861d6037d22f1f49bd71e27cc`:

| Indicator | Public Pages response | Current `main` source |
| --- | --- | --- |
| Service-worker shell cache | `mr-siavash-ai-shell-v51` | `mr-siavash-ai-shell-v62` |
| Online assistant request timeout in `support.js` | `15000` ms | `ASSISTANT_REQUEST_TIMEOUT_MS = 80_000` |
| `search-index.json` items | 15 | 74 |
| Dedicated Python course overview | Missing; 12 individual `python-lesson` entries observed | `course-python` course entry present, describing 12 lessons, 12 exercises, and a final project |
| `site-search.js` | HTTP 200 | Current source blob recorded below |

### Current source blob IDs

- `support.js`: `cdd0b16fc5a41b85b3b20f2373427f65be79e29d`
- `search-index.json`: `586ad78d1182456906030f021f87b9c1929e942f`
- `site-search.js`: `16b1d0f11f96a29b441d440b27e61b110b672b85`
- `sw.js`: `04e41959cc1985f1195232fe0cc7142fb09287a0`
- Pages workflow: `47dcee6fcc35c4816c653f8944bb10b73edbb5e8`

The deployment workflow explicitly gates its static-site job to `workflow_dispatch` on `refs/heads/main`. The most recent push-triggered Quality run [44796927816](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/runs/44796927816) passed its Quality job but skipped `Deploy static site`. No manual Pages dispatch was found in the current Actions inventory.

**Operational conclusion:** this is a confirmed publication lag, not a website outage and not a source/CI failure. Keep Issue #207 open until the official manual Pages workflow is dispatched and all four public assets are re-fetched with cache v62, the 80-second request timeout, the 74-item search index, and the `course-python` overview confirmed.

No Pages setting, workflow trigger, GitHub Pages configuration, or public asset was changed by this verification.

---

## Pages publication verification checkpoint — 2026-11-20 UTC

This addendum supersedes earlier same-day repository/Pages checkpoints and records the operational state after PR #226 merged. It does not record a Pages deployment.

### GitHub source and CI

- Current `main`: `87a3eb962b95eeedd86372f958d7f18b2316ba8d`.
- PR [#226](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/pull/226) was squash-merged. No open PRs remained at this checkpoint.
- The PR added `scripts/verify-pages-publication.mjs` and a post-deploy verification step to `.github/workflows/deploy.yml`.
- The verifier checks the exact published bytes of `support.js`, `search-index.json`, `site-search.js`, and `sw.js` against the checked-out source using SHA-256. It sends no-store/cache-busted requests, allows bounded retries for CDN propagation, and fails the deploy job if any asset remains unavailable or differs.
- The existing Pages job condition is unchanged: `github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'`. Pushes and pull requests still do not publish the site.
- All six post-merge workflows on `87a3eb9` succeeded: Quality (including repository tests, isolated D1 migration checks, Academy Chromium E2E, and accessibility/responsive audit), Gateway CI, Workflow Security Audit, OpenSSF Scorecard, Production Runtime Smoke, and Preview Runtime Smoke.
- The Pages deployment job was skipped on the push-triggered Quality run as designed. No manual Pages dispatch has been recorded after PR #226.

### Last public Pages asset observation

The last read-only public-site verification on 2026-11-20 fetched the site and all four assets successfully (HTTP 200). The public bytes were stale relative to the current source; the PR #226 change does not modify these assets.

| Indicator | Last public response | Current source on `main` |
| --- | --- | --- |
| Service-worker shell cache | `mr-siavash-ai-shell-v51` | `mr-siavash-ai-shell-v62` |
| Online support request timeout | `15000` ms | `ASSISTANT_REQUEST_TIMEOUT_MS = 80_000` |
| Search-index item count | 15 | 74 |
| Dedicated Python course overview | Missing; 12 individual `python-lesson` entries | `course-python` entry present, summarizing 12 lessons, 12 exercises, and a final project |
| Local relevance filtering | Any positive score; top 3 results | Relevance floor `Math.max(8, Math.ceil(ranked[0].score * 0.6))`; top 3 results |
| `site-search.js` | HTTP 200 | Current source remains present |

The public page is reachable; this is a publication lag, not evidence of an outage. HTTP 200 alone does not establish that the current source has been published.

### Remaining operational action

- Dispatch the official `Quality checks and GitHub Pages deployment` workflow manually from current `main`: https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_AI/actions/workflows/deploy.yml
- After a successful dispatch, the new post-deploy verifier will require exact-byte agreement for all four assets. Re-fetch the public assets independently and confirm cache v62, the 80-second timeout, the 74-item index, and the `course-python` overview before resolving Issue #207.
- The connected GitHub actions available to this session support workflow-run inspection but do not expose a workflow-dispatch operation. An authenticated GitHub session is therefore still required for the manual dispatch.

No Pages publication, Pages configuration, Worker deployment, D1 migration or data change, Secret change, Access policy change, DNS change, or traffic change occurred in this checkpoint.

