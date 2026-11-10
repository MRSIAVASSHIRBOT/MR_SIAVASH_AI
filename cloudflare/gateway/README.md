# Cloudflare Gateway

The production Worker and isolated preview Worker are dedicated Cloudflare services for MR_SIAVASH_AI. They are isolated from GShop and use separate production and preview D1 databases.

The active production deployment is tracked separately from source uploads; a successful version upload does not mean that version is receiving live traffic.

## Cloudflare resources

| Environment | Worker | D1 |
| --- | --- | --- |
| Production | `mr-siavash-ai-gateway` | `mr-siavash-ai-prod` |
| Preview | `mr-siavash-ai-gateway-preview` | `mr-siavash-ai-preview` |

Never bind this project to GShop's `gahop` Worker or `gshop-db`.

## Verified production state — 2026-11-08

Cloudflare control-plane inspection on 2026-11-08 verified that 100% of production traffic is on Worker version 5, `f7d5a92e-2694-4af1-8b99-18d04742925d`. Version 6 (`864e90b3-d163-41d6-84f6-6e87dd0960d7`, source commit `b060beeecd13196d1143187a518962379a696c22`) was uploaded with the scheduled handler and a 90-day retention binding, but its deployment was rolled back within seconds to version 5 after post-deployment smoke checks failed. Version 6 is not active. The rollback restored the previous traffic split and left the production cron schedule empty.

The deployed version contains:
- `GET /v1/health/live` and `GET /v1/health/ready`.
- `POST /v1/assistant/chat`. Without a Workers AI binding, this uses verified knowledge fallback only; it is not model-generated.
- `POST /v1/support/tickets`.
- `GET /v1/support/tickets/:code` and `POST /v1/support/tickets/:code/messages`, protected by a one-time bearer token.
- `GET /admin` and administrator support list/detail/reply/status routes under `/v1/admin/support/tickets`.

The deployed bundle does **not** yet contain `GET /v1/modules` or the scheduled retention handler. The current `main` source and isolated preview Worker contain both. The static website keeps new ticket submission disabled until the reviewed production release enables an explicit 30–365 day retention policy. Existing ticket tracking remains available when D1 is healthy. The Worker enforces this intake gate server-side; the UI gate is not the security boundary.

The production Access application is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker also validates the Access JWT signature, issuer, audience, expiry and administrator allowlist. Authorized browser-session verification is still a manual acceptance test.

Production D1 already contains support records. Their contents were not inspected or exported. Do not reset the database, reapply migrations 0001–0003, or run destructive cleanup without explicit approval.

Production version 5 has no Workers AI binding or scheduled handler, and the live Worker has no cron schedule for retention. The uploaded version 6 includes a scheduled handler but is not active. The latest upload's 90-day binding is not an active production retention policy. Query-string redaction is enabled; persistent invocation logs and traces remain enabled. The production support API code exists in the deployed bundle, but the user-facing forms remain disabled.

## Preview state

The preview Worker uses only the dedicated preview D1 database; migrations 0001–0003 are recorded there. On 2026-11-09, Worker version 6 (`2b737abb-0303-41cc-b96d-2b02bdb1dea8`) was uploaded from `main` commit `92ef4c4fb646cd7c9045de5aacffa6d161f84a2d` and activated at 100% traffic under deployment `29a0269b-3fd8-4211-b1db-fd59e697db5d`. Its bindings include the isolated preview D1 database, the exact website origin, `SUPPORT_RETENTION_DAYS=90`, and the dedicated Cloudflare Access team domain, application audience, and administrator allowlist. A separate Access application (`3c1f14e3-c6ac-4dc9-9575-859a71694a24`) protects both `/admin` and `/v1/admin/*` using the existing single-administrator reusable policy and an 8-hour session. The existing daily 03:00 UTC schedule was preserved. No Workers AI binding or service token was added. Version 5 (`2376809c-6fbb-46e2-8d27-a7df5f104926`) is the immediate rollback target. Runtime smoke verification against version 5 passed before the Access rollout. After version 6 was activated, anonymous admin requests were additionally checked at the Access edge and must remain blocked; the post-rollout smoke run is tracked in GitHub Actions. Cryptographic unit tests now cover signed JWT acceptance, issuer, audience, expiry, not-before, administrator allowlist, signature tampering, and fail-closed behavior when the signing-key endpoint is unavailable. The separate production read-only runtime smoke also passed without changing the production deployment. The earlier version 4 attempt was rolled back after failed verification.

## Assistant provider adapter

The Gateway source now contains a normalized Cloudflare Workers AI adapter at `src/assistant-provider.js`. It validates the message envelope, bounds output tokens, normalizes supported text/usage shapes, and converts provider failures into typed categories. The request path remains knowledge-grounded: model inference is attempted only when verified site context exists, and provider failure returns the existing knowledge fallback without exposing upstream error text.

The adapter performs one attempt with no automatic retry. Streaming, request timeout and cancellation are explicitly unavailable in this initial binding adapter. Production has no Workers AI binding, so this source-level refactor does not activate model inference or change production traffic. Workers AI usage can incur account charges; binding activation is a separate, explicit release decision.

## Current source API

| Route | Method | Purpose |
| --- | --- | --- |
| `/v1/health/live` | GET | Process liveness |
| `/v1/health/ready` | GET | D1 readiness |
| `/v1/modules` | GET | Public module catalog with bounded filtering and pagination |
| `/v1/assistant/chat` | POST | Grounded assistant; knowledge fallback without AI binding |
| `/v1/support/tickets` | POST | Create ticket and return one-time bearer token |
| `/v1/support/tickets/:code` | GET | Read ticket with bearer token |
| `/v1/support/tickets/:code/messages` | POST | Add user reply with bearer token |
| `/admin` | GET | Access-protected administrator console |
| `/v1/admin/support/tickets` | GET | Access-protected ticket inbox |
| `/v1/admin/support/tickets/:id` | GET | Access-protected ticket detail |
| `/v1/admin/support/tickets/:id/messages` | POST | Access-protected administrator reply |
| `/v1/admin/support/tickets/:id/status` | PATCH | Access-protected status update |

## Privacy and retention

The Worker source contains a scheduled cleanup handler. It deletes support tickets after the configured number of days without an update; the D1 foreign-key cascade deletes linked messages. It also deletes expired idempotency records and rate-limit buckets. Allowed retention periods are 30–365 days.

Preview uses 90 days. The owner-selected production policy is 90 days, matching the existing production binding and Preview policy. The manual release workflow remains opt-in and defaults to disabled; no production cron is configured. This matters because production D1 already contains support records. Do not enable a retention cron or delete existing records without the repository owner's explicit selection of the retention period.

Ticket creation requires an explicit privacy acknowledgement and an active 30–365-day retention setting. The public interface enables new intake only after the Worker confirms both. Existing-ticket tracking remains available when D1 is healthy. Ticket tokens are returned once and stored only as SHA-256 hashes; the browser sends them in the Authorization header and never puts them in URLs, logs, localStorage or analytics. Do not collect passwords, payment data, API keys or authentication codes.

## Production release boundary

`.github/workflows/gateway-production.yml` is manual-only. Its `deploy` input defaults to false; the default path performs read-only validation of the production D1 binding and Access configuration. A real deployment requires an explicit manual dispatch with `deploy=true`, a configured `cloudflare-production` GitHub environment, and its narrowly scoped `CLOUDFLARE_API_TOKEN` secret.

The release client uploads a version through the Cloudflare Workers Versions API, creates a separate 100% deployment, configures retention only when explicitly selected, runs route/readiness/CORS smoke checks, verifies observability privacy settings, and restores the previous traffic split and schedules if post-deploy verification fails. Workers AI is a separate opt-in because it can consume account quota or paid usage. The production release remains manual-only and must use the exact reviewed `main` commit. The uploader must include both `index.js` and its imported `assistant-provider.js` module.

See [PRODUCTION_RELEASE.md](./PRODUCTION_RELEASE.md) and [PREVIEW_RELEASE.md](./PREVIEW_RELEASE.md).

## Local checks

```bash
node --check cloudflare/gateway/src/index.js
node --test cloudflare/gateway/tests/*.test.mjs scripts/deploy-production-worker.test.mjs
ruby scripts/validate-openapi.rb
python scripts/test-d1-migrations.py
```
