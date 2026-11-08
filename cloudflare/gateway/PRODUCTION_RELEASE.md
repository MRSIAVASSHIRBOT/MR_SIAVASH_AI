# Production Worker release

This release path is deliberately separate from GitHub Pages and the isolated preview pipeline.

## Safety model

- The workflow is manual-only: `.github/workflows/gateway-production.yml`.
- Its `deploy` input defaults to `false`. With that default, it only reads and validates production Worker settings; it uploads no version and changes no traffic or schedules.
- A production deployment requires a manual dispatch with `deploy=true`. Configure the GitHub environment `cloudflare-production` with a required reviewer before using that option.
- The workflow pins the target Worker name and validates the existing `DB` binding against the dedicated production D1 ID. It refuses a GShop or unknown database.
- Existing Access bindings, allowlisted origin, compatibility settings, and hidden secret binding types are preserved. It refuses to release if the Access audience, team domain, or administrator allowlist is missing.
- No production D1 migration is run. Migrations 0001–0003 are already present; production schema changes require a separate reviewed migration.
- The upload uses the Cloudflare Workers Versions API and a separate deployment operation. After deployment, route, D1 readiness, support validation, and CORS smoke checks run. If a check fails, the workflow restores the previous 100% Worker version and the prior cron schedule.
- Workers AI is an explicit opt-in input and defaults to disabled. Enabling it adds the AI binding and performs one small grounded inference smoke request.

## Required GitHub configuration

Create the GitHub Actions environment `cloudflare-production` and add:

- Secret `CLOUDFLARE_API_TOKEN`: narrowly scoped to this Cloudflare account with Workers Scripts read/edit permissions.

The account ID and dedicated D1 ID are non-secret identifiers pinned in the workflow. The script reads and preserves the current Access configuration from Cloudflare rather than asking for those values as new secrets. Configure required reviewers on the environment; the repository branch-protection setting is a separate owner-controlled task.

## Retention

The Worker scheduled handler removes support tickets after the selected 30, 60, 90 or 180 days without an update, which also removes their messages through the D1 foreign-key cascade. It also removes expired idempotency records and rate-limit buckets. The preview workflow configures a daily 03:00 UTC cron with a 90-day period. Production retention is disabled by default. The chosen policy default for a future activation is 30 days; the workflow still requires `enable_support_retention=true` before it adds the retention binding and daily cleanup schedule. Do not activate automatic deletion until the existing production ticket records have been reviewed and the owner explicitly approves the deletion impact.

## Manual release procedure

1. Merge the reviewed source to `main`.
2. Confirm the production environment secret is configured and required reviewers are enabled.
3. Run **Cloudflare Gateway Production Release** with `deploy=false` first. This performs a read-only binding validation.
4. After reviewing the validation result, dispatch again with `deploy=true`.
5. Keep `enable_workers_ai=false` unless AI usage is explicitly approved.
6. Keep `enable_support_retention=false` until the owner explicitly approves automatic deletion of inactive support tickets. The selected period is 30 days. Because the cleanup query cascades to ticket messages, enabling it can permanently delete existing production records older than the inactivity window.
7. Confirm the workflow's post-deployment smoke checks and inspect Cloudflare logs. The workflow rolls back automatically if the checks fail.

A successful preview is necessary but does not replace production approval. The production workflow must never be triggered automatically by a push or Pages deployment.
