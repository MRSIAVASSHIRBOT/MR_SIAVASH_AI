# Cloudflare Gateway

The production Worker and isolated preview Worker are dedicated Cloudflare services for MR_SIAVASH_AI. They are isolated from GShop and use separate production and preview D1 databases.

The active production deployment is tracked separately from source uploads; a successful version upload does not mean that version is receiving live traffic.

## Cloudflare resources

| Environment | Worker | D1 |
| --- | --- | --- |
| Production | `mr-siavash-ai-gateway` | `mr-siavash-ai-prod` |
| Preview | `mr-siavash-ai-gateway-preview` | `mr-siavash-ai-preview` |

Never bind this project to GShop's `gahop` Worker or `gshop-db`.

## Verified production state — 2026-11-10

Cloudflare control-plane inspection on 2026-11-10 confirms active deployment `cb861582-86ea-4899-8cff-273062d9b36c`: Worker version 12 (`146709f7-8158-40c8-aa80-b8b0772787f1`) receives 100% of production traffic and records source commit `971a5e702876a0bc78b19c55b8b0daf358471c5b`. Production workflow run `42801780384` completed successfully. Its post-deployment smoke verified readiness, module propagation, privacy/consent behavior, trusted and untrusted CORS, and a real Workers AI response with `mode: ai_grounded` and non-empty sources. The previous rollback version remains available as a recovery target.

The deployed version contains:
- `GET /v1/health/live` and `GET /v1/health/ready`.
- `POST /v1/assistant/chat`. With the production Workers AI binding and verified site context, this returns a grounded model response; provider failures safely fall back to verified knowledge.
- `POST /v1/support/tickets`.
- `GET /v1/support/tickets/:code` and `POST /v1/support/tickets/:code/messages`, protected by a one-time bearer token.
- `GET /admin` and administrator support list/detail/reply/status routes under `/v1/admin/support/tickets`.

The deployed bundle contains `GET /v1/modules` and the scheduled retention handler. New ticket intake is gated server-side by explicit privacy acknowledgement and a valid 30–365-day retention configuration; the website follows the Worker's readiness/consent response. Existing ticket tracking remains available when D1 is healthy. The UI gate is not the security boundary.

The production Access application is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker also validates the Access JWT signature, issuer, audience, expiry and administrator allowlist. Production One-time PIN sign-in was owner-confirmed on 2026-11-10; end-to-end administrator ticket workflow acceptance remains a separate manual test.

Production D1 already contains support records. Their contents were not inspected or exported. Do not reset the database, reapply migrations 0001–0003, or run destructive cleanup without explicit approval.

Production has the `AI` Workers AI binding, `SUPPORT_RETENTION_DAYS=90`, and the daily `0 3 * * *` UTC cleanup schedule. The schedule is configured; verify the first scheduled execution through operational telemetry rather than assuming it has already run. Query-string redaction is enabled and persistent invocation logs/traces remain enabled. The deployed version includes the complete module graph (`index.js` and `assistant-provider.js`) from the reviewed `main` commit. The UI and API continue to enforce explicit consent and retention readiness for new ticket intake.

## Preview state

The preview Worker uses only the dedicated preview D1 database; migrations 0001–0003 are recorded there. On 2026-11-09, Worker version 6 (`2b737abb-0303-41cc-b96d-2b02bdb1dea8`) was uploaded from `main` commit `92ef4c4fb646cd7c9045de5aacffa6d161f84a2d` and activated at 100% traffic under deployment `29a0269b-3fd8-4211-b1db-fd59e697db5d`. A fresh control-plane readback on 2026-11-10 confirms Preview Worker traffic is at 100% on version 6 under latest deployment `66ccb720-01cb-43e0-9b14-6d1500fa2581`. Its bindings include the isolated preview D1 database, the exact website origin, `AI` (Workers AI), `SUPPORT_RETENTION_DAYS=90`, and the dedicated Cloudflare Access team domain, application audience, and administrator allowlist. A separate Access application (`3c1f14e3-c6ac-4dc9-9575-859a71694a24`) protects both `/admin` and `/v1/admin/*` using the existing single-administrator reusable policy and an 8-hour session. The daily `0 3 * * *` UTC schedule remains configured. Preview AI binding presence is verified; successful model-inference behavior still requires an authenticated runtime smoke test. No service token was added. Version 5 (`2376809c-6fbb-46e2-8d27-a7df5f104926`) is the immediate rollback target. Runtime smoke verification against version 5 passed before the Access rollout. After version 6 was activated, anonymous admin requests were additionally checked at the Access edge and must remain blocked; the post-rollout smoke run is tracked in GitHub Actions. Cryptographic unit tests now cover signed JWT acceptance, issuer, audience, expiry, not-before, administrator allowlist, signature tampering, and fail-closed behavior when the signing-key endpoint is unavailable. The separate production read-only runtime smoke also passed without changing the production deployment. The earlier version 4 attempt was rolled back after failed verification.

## Assistant provider adapter

The Gateway source now contains a normalized Cloudflare Workers AI adapter at `src/assistant-provider.js`. It validates the message envelope, bounds output tokens, normalizes supported text/usage shapes, and converts provider failures into typed categories. The request path remains knowledge-grounded: model inference is attempted only when verified site context exists, and provider failure returns the existing knowledge fallback without exposing upstream error text.

The adapter performs one attempt with no automatic retry. Streaming, request timeout and cancellation are explicitly unavailable in this initial binding adapter. Production inference is enabled through the `AI` binding; the production release smoke verified a grounded response with non-empty sources. Workers AI usage can consume account quota or incur usage charges, so keep model usage bounded and observable.

## Current source API

| Route | Method | Purpose |
| --- | --- | --- |
| `/v1/health/live` | GET | Process liveness |
| `/v1/health/ready` | GET | D1 readiness |
| `/v1/modules` | GET | Public module catalog with bounded filtering and pagination |
| `/v1/assistant/chat` | POST | Grounded assistant; Workers AI when configured, verified knowledge fallback when unavailable |
| `/v1/support/tickets` | POST | Create ticket and return one-time bearer token |
| `/v1/support/tickets/:code` | GET | Read ticket with bearer token |
| `/v1/support/tickets/:code/messages` | POST | Add user reply with bearer token |
| `/admin` | GET | Access-protected administrator console |
| `/v1/admin/support/tickets` | GET | Access-protected ticket inbox |
| `/v1/admin/support/tickets/:id` | GET | Access-protected ticket detail |
| `/v1/admin/support/tickets/:id/messages` | POST | Access-protected administrator reply |
| `/v1/admin/support/tickets/:id/status` | PATCH | Access-protected status update |

## Privacy and retention

The Worker source contains a scheduled cleanup handler. It deletes support tickets after the configured number of days without an update; the D1 foreign-key cascade deletes linked messages. It also deletes expired idempotency records and rate-limit buckets. Allowed retention periods are 30–365 days. Each successful run emits a structured Workers log event, `support_retention_cleanup_completed`, containing only the scheduled timestamp, retention period, and aggregate deletion counts. It does not log ticket IDs, message bodies, bearer tokens, or contact data. A configured schedule is not proof of a successful run; verify the event and invocation outcome in telemetry.

Preview and Production each use separate 90-day retention configurations and their own daily schedules. Production's owner-selected 90-day policy is active with the daily `0 3 * * *` UTC cron. The schedule is configured, but the first scheduled execution still requires operational verification. Production D1 contains existing support records; do not change the selected period or run manual destructive cleanup without the repository owner's approval.

Ticket creation requires an explicit privacy acknowledgement and an active 30–365-day retention setting. The public interface enables new intake only after the Worker confirms both. Existing-ticket tracking remains available when D1 is healthy. Ticket tokens are returned once and stored only as SHA-256 hashes; the browser sends them in the Authorization header and never puts them in URLs, logs, localStorage or analytics. Do not collect passwords, payment data, API keys or authentication codes.

## Production release boundary

`.github/workflows/gateway-production.yml` is manual-only. Its `deploy` input defaults to false; the default path performs read-only validation of the production D1 binding and Access configuration. A real deployment requires an explicit manual dispatch with `deploy=true`, a configured `cloudflare-production` GitHub environment, and its narrowly scoped `CLOUDFLARE_API_TOKEN` secret.

The release client uploads a version through the Cloudflare Workers Versions API, creates a separate 100% deployment, applies only explicitly selected retention/AI settings, runs readiness/module/privacy/CORS and grounded AI smoke checks, verifies observability privacy settings, and restores the previous traffic split and schedules if post-deploy verification fails. Workers AI and support retention remain explicit inputs because they affect account usage and data lifecycle. The production release remains manual-only and must use the exact reviewed `main` commit. The uploader must include both `index.js` and its imported `assistant-provider.js` module.

See [PRODUCTION_RELEASE.md](./PRODUCTION_RELEASE.md) and [PREVIEW_RELEASE.md](./PREVIEW_RELEASE.md).

## Local checks

```bash
node --check cloudflare/gateway/src/index.js
node --test cloudflare/gateway/tests/*.test.mjs scripts/deploy-production-worker.test.mjs
ruby scripts/validate-openapi.rb
python scripts/test-d1-migrations.py
```
