# Backend and API boundary

MR_SIAVASH_AI uses a dedicated Cloudflare Worker and D1 database. This backend is separate from the static GitHub Pages frontend and from the GShop resources.

## Current environment state

The deployed Production Worker serves health/readiness, public module metadata, a grounded Workers AI assistant, public support-ticket routes, and Access-protected administrator routes.

### Production

The production Worker is `mr-siavash-ai-gateway`; its dedicated D1 database is `mr-siavash-ai-prod`. The 2026-11-10 control-plane readback confirms version `146709f7-8158-40c8-aa80-b8b0772787f1` (version 12) at 100% traffic under deployment `cb861582-86ea-4899-8cff-273062d9b36c`, sourced from `main` commit `971a5e702876a0bc78b19c55b8b0daf358471c5b`.

The deployed bundle serves health/readiness, public `/v1/modules` metadata, a grounded Workers AI assistant, public support-ticket create/read/reply endpoints, and the Access-protected administrator console and support APIs. New ticket intake requires explicit privacy acknowledgement and a configured 30–365-day inactivity-retention period; existing ticket tracking is separate. Production Workers AI inference and the scheduled retention handler are enabled. The production release smoke verified a grounded assistant response with non-empty sources.

Production D1 already contains the workspace, identity and support schema. Support records are present; their contents were not inspected. Migrations 0001–0003 are already applied. Do not reapply them or clear production data.

The Cloudflare Access application protects `/admin` and `/v1/admin/*`; the Worker independently verifies Access JWT signature, issuer, audience, expiry and the administrator allowlist. Production One-time PIN sign-in was owner-confirmed on 2026-11-10; end-to-end administrator ticket workflow acceptance remains outstanding.

### Preview

The isolated Preview Worker `mr-siavash-ai-gateway-preview` uses the separate `mr-siavash-ai-preview` D1 database. Migrations 0001–0003 are recorded in its migration ledger. Preview has its own `AI` binding, Cloudflare Access application, 90-day retention setting and daily schedule; these resources are separate from Production. Preview smoke checks passed for liveness, D1 readiness, module catalog, assistant fallback, support validation, administrator fail-closed behavior and CORS.

## Current source routes

The deployed Production Worker and current source both implement health, module metadata, assistant, support-ticket and administrator routes. Consult [the gateway status](../../cloudflare/gateway/README.md) for the exact active deployment and release evidence.

## Privacy, retention and support

Ticket creation stores the request text and optional contact email in D1. The ticket access token is returned once and only its SHA-256 hash is stored. The public website gates new ticket intake on explicit privacy acknowledgement and the Worker's retention-readiness response; ticket tracking uses the one-time bearer token.

The Worker includes a scheduled cleanup handler that deletes tickets after 30–365 configured days without an update, cascading to linked messages, and clears expired idempotency/rate-limit records. Preview and Production each use separate 90-day policies and daily schedules. Production's schedule is configured; verify its first execution through telemetry. Production D1 already contains support records.

## Production release

The manual-only [production release workflow](../../.github/workflows/gateway-production.yml) defaults to validation-only. A production traffic change requires `deploy=true`, the `cloudflare-production` GitHub environment and a scoped Cloudflare API token. The release client verifies the exact production D1 binding and Access configuration, preserves hidden secret bindings and observability settings, runs readiness/module/privacy/CORS and grounded Workers AI smoke checks, and rolls back to the previous traffic split on failure. Workers AI and automatic support retention are separate explicit inputs; the current Production release enabled AI and the owner-selected 90-day retention policy.

No consumer account login, authenticated cloud workspace or autonomous agent runtime is currently live. The grounded model-generated assistant is live through Workers AI. User identity and cloud workspace features still require a separate identity-provider and privacy design; they must not be inferred from the existing D1 schema.

## Contracts and tests

- `openapi.yaml` — versioned API design contract.
- `../THREAT_MODEL.md` — trust boundaries and security review.
- `../PLATFORM_CONTRACTS.md` — shared module, identity, data, AI and agent contracts.
- `../../cloudflare/gateway/tests/gateway.test.mjs` — route, support-token, AI fallback and retention tests.
- `../../scripts/deploy-production-worker.test.mjs` — production release safety gates.
- `../../.github/workflows/gateway-preview-smoke.yml` — live preview runtime checks.
- `../../.github/workflows/gateway-smoke.yml` — production health/CORS/support-route checks.

Never reuse GShop's `gahop` Worker or `gshop-db` database.
