# Production Worker release

This release path is deliberately separate from GitHub Pages and the isolated preview pipeline.

## Safety model

- The workflow is manual-only: `.github/workflows/gateway-production.yml`.
- Its `deploy` input defaults to `false`. With that default, it only reads and validates production Worker settings; it uploads no version and changes no traffic or schedules.
- A production deployment requires a manual dispatch with `deploy=true` from the repository's `main` branch. The workflow rejects deployment dispatches from any other ref, and the release script requires the exact 40-character `GITHUB_SHA` before making any Cloudflare API request.
- Configure the GitHub environment `cloudflare-production` with a required reviewer before using the deployment option.
- The workflow pins the target Worker name and validates the existing `DB` binding against the dedicated production D1 ID. It refuses a GShop or unknown database.
- Existing Access bindings, allowlisted origin, compatibility settings, and hidden secret binding types are preserved. It refuses to release if the Access audience, team domain, or administrator allowlist is missing.
- The Worker release workflow never applies D1 migrations automatically. Production schema migration remains a separate, reviewed operation.
- Production D1's existing schema was reconciled against migrations 0001–0003 on 2026-11-20. Because no migration ledger existed, a standard `d1_migrations` ledger was created from the verified existing schema. The timestamps for entries 1–3 are reconciliation timestamps, not original migration dates.
- Migrations 0004 and 0005 were then applied to Production D1 on 2026-11-20. They add retention-run telemetry and ticket-status history with indexes/triggers; 0005 created two baseline events for the two pre-existing open tickets. No ticket/message rows were deleted or edited.
- A D1 Time Travel bookmark was captured immediately before the Production schema writes. It is a point-in-time recovery reference, not an independent exported backup. No restore was performed.
- The upload uses the Cloudflare Workers Versions API and a separate deployment operation. After deployment, route, D1 readiness, support validation, and CORS smoke checks run. If a check fails, the workflow restores the previous 100% Worker version and the prior Cron schedule.
- The dispatch input for Workers AI defaults to false as a fail-safe. Production version 14 already has the AI binding active. A deployment that would remove active Workers AI is rejected unless `allow_feature_removal=true`; for an ordinary code release, set `enable_workers_ai=true` so the binding and grounded smoke request are preserved.

## Required GitHub configuration

Create the GitHub Actions environment `cloudflare-production` and add:

- Secret `CLOUDFLARE_API_TOKEN`: narrowly scoped to this Cloudflare account with Workers Scripts read/edit permissions.

The account ID and dedicated D1 ID are non-secret identifiers pinned in the workflow. The script reads and preserves the current Access configuration from Cloudflare rather than asking for those values as new secrets. Configure required reviewers on the environment; the repository branch-protection setting is a separate owner-controlled task.

## Current Production retention and preservation

The Worker scheduled handler removes support tickets after the configured inactivity period, which also removes their messages through the D1 foreign-key cascade. It also removes expired idempotency records and rate-limit buckets. Production currently has the owner-selected 90-day period and daily `0 3 * * *` UTC schedule. The first post-version-14 completion event was recorded on 2026-11-12. The 2026-11-13 scheduled invocation was later confirmed by a read-only telemetry query on 2026-11-14: `support_retention_cleanup_completed` was emitted at 03:00:23.971 UTC with aggregate counts of 0 support tickets, 0 idempotency records, and 0 rate-limit buckets. The earlier no-match was a query/filter mismatch, not evidence of a failed cleanup; Issue #169 was closed after reconciliation. See [docs/RELEASE_STATUS.md](../../docs/RELEASE_STATUS.md) for the full dated evidence.

The `enable_support_retention` dispatch input defaults to false for safety. The release script detects active-feature removal and rejects a deployment that would remove the existing retention binding/schedule unless `allow_feature_removal=true`. For an ordinary release, set `enable_support_retention=true` and `retention_days=90` to preserve the current policy; keep `allow_feature_removal=false`. Do not change the selected period or approve feature removal without explicit owner authorization and a reviewed data-impact decision.

## Manual release procedure

1. Confirm the Production D1 ledger and migrations 0001–0005 are present and structurally valid. The 2026-11-20 reconciliation is documented in [docs/RELEASE_STATUS.md](../../docs/RELEASE_STATUS.md).
2. Confirm the production environment secret is configured and required reviewers are enabled.
3. Run **Cloudflare Gateway Production Release** from `main` with `deploy=false` first. This performs a read-only binding validation.
4. After reviewing the validation result and the exact candidate SHA, dispatch again from `main` with `deploy=true`.
5. For a routine release, set `enable_workers_ai=true` to preserve the active Workers AI binding and run one grounded smoke inference using `@cf/zai-org/glm-4.7-flash`.
6. For a routine release, set `enable_support_retention=true` and `retention_days=90` to preserve the active 90-day policy and daily schedule. Keep `allow_feature_removal=false`.
7. Confirm the workflow's post-deployment readiness, support-consent, grounded AI and CORS smoke checks. Inspect Cloudflare logs; if a check fails, the workflow restores the previous Worker version and schedules.

A successful preview is necessary but does not replace production approval. The production workflow must never be triggered automatically by a push or Pages deployment.
