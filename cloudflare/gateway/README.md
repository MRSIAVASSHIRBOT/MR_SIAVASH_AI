# Cloudflare Gateway

The production Worker and isolated preview Worker are dedicated Cloudflare services for MR_SIAVASH_AI. They are isolated from GShop and use separate production and preview D1 databases.\n\nThe deployed production Worker currently exposes public support ticket creation/read/reply endpoints; this describes the deployed bundle, not every route in the current repository source.

## Cloudflare resources

| Environment | Worker | D1 |
| --- | --- | --- |
| Production | `mr-siavash-ai-gateway` | `mr-siavash-ai-prod` |
| Preview | `mr-siavash-ai-gateway-preview` | `mr-siavash-ai-preview` |

Never bind this project to GShop's `gahop` Worker or `gshop-db`.

## Verified production state — 2026-11-08

Cloudflare control-plane inspection identified deployed Worker version `f7d5a92e-2694-4af1-8b99-18d04742925d`. Its deployed bundle is older than the current repository source.

The deployed version contains:
- `GET /v1/health/live` and `GET /v1/health/ready`.
- `POST /v1/assistant/chat`. Without a Workers AI binding, this uses verified knowledge fallback only; it is not model-generated.
- `POST /v1/support/tickets`.
- `GET /v1/support/tickets/:code` and `POST /v1/support/tickets/:code/messages`, protected by a one-time bearer token.
- `GET /admin` and administrator support list/detail/reply/status routes under `/v1/admin/support/tickets`.

The deployed bundle does **not** yet contain `GET /v1/modules` or the scheduled retention handler. The current `main` source and isolated preview Worker contain both. The static website deliberately keeps public ticket submission and tracking disabled until the reviewed production release, retention decision and post-deployment checks are complete.

The production Access application is configured for `/admin` and `/v1/admin/*` with a single-administrator allow policy. The Worker also validates the Access JWT signature, issuer, audience, expiry and administrator allowlist. Authorized browser-session verification is still a manual acceptance test.

Production D1 already contains support records. Their contents were not inspected or exported. Do not reset the database, reapply migrations 0001–0003, or run destructive cleanup without explicit approval.

Production has no Workers AI binding and no cron schedule for retention. Query-string redaction is enabled; persistent invocation logs and traces remain enabled. The production support API code exists in the deployed bundle, but the user-facing forms remain disabled.

## Preview state

The isolated preview Worker is deployed from current repository source and uses only the dedicated preview D1 database. Migrations 0001–0003 are recorded in the preview `d1_migrations` table. Runtime smoke checks passed for:
- liveness and D1 readiness;
- public module metadata;
- grounded knowledge fallback;
- support-ticket validation and private-not-found behavior;
- administrator fail-closed behavior;
- exact-origin CORS.

Preview intentionally has no Access audience/administrator bindings and no Workers AI binding. Its admin routes must remain fail-closed. Preview retention is configured for 90 days with a daily 03:00 UTC cron; the preview database is isolated from production.

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

Preview uses 90 days. Production retention is an explicit opt-in in the manual release workflow and defaults to disabled. This matters because production D1 already contains support records. Do not enable a retention cron or delete existing records without the repository owner's explicit selection of the retention period.

Ticket creation requires an explicit privacy acknowledgement and an active 30–365-day retention setting. The public interface is feature-gated until both the Worker release and the exact retention period are approved. Ticket tokens are returned once and stored only as SHA-256 hashes. The browser sends ticket tokens in the Authorization header and never places them in URLs, logs, localStorage or analytics. Do not collect passwords, payment data, API keys or authentication codes.

## Production release boundary

`.github/workflows/gateway-production.yml` is manual-only. Its `deploy` input defaults to false; the default path performs read-only validation of the production D1 binding and Access configuration. A real deployment requires an explicit manual dispatch with `deploy=true`, a configured `cloudflare-production` GitHub environment, and its narrowly scoped `CLOUDFLARE_API_TOKEN` secret.

The release client uploads a version through the Cloudflare Workers Versions API, creates a separate 100% deployment, configures retention only when explicitly selected, runs route/readiness/CORS smoke checks, verifies observability privacy settings, and restores the previous traffic split and schedules if post-deploy verification fails. Workers AI is a separate opt-in because it can consume account quota or paid usage. No production release was executed by this change.

See [PRODUCTION_RELEASE.md](./PRODUCTION_RELEASE.md) and [PREVIEW_RELEASE.md](./PREVIEW_RELEASE.md).

## Local checks

```bash
node --check cloudflare/gateway/src/index.js
node --test cloudflare/gateway/tests/*.test.mjs scripts/deploy-production-worker.test.mjs
ruby scripts/validate-openapi.rb
python scripts/test-d1-migrations.py
```
