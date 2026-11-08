# Backend and API boundary

MR_SIAVASH_AI uses a dedicated Cloudflare Worker and D1 database. This backend is separate from the static GitHub Pages frontend and from the GShop resources.

## Current environment state

The deployed production Worker currently exposes public support-ticket create/read/reply endpoints; this describes the deployed bundle, not every route in the current repository source.

### Production

The production Worker is `mr-siavash-ai-gateway`; its dedicated D1 database is `mr-siavash-ai-prod`. A Cloudflare control-plane readback on 2026-11-08 identified deployed version `f7d5a92e-2694-4af1-8b99-18d04742925d`.

The deployed bundle currently serves health/readiness, a knowledge-fallback assistant endpoint, public support ticket create/read/reply endpoints, and the Access-protected administrator console and support APIs. New ticket intake in the current source requires explicit privacy acknowledgement and a configured 30–365-day inactivity-retention period; existing ticket tracking is separate. It does not yet expose the current repository's public `/v1/modules` endpoint or scheduled retention cleanup. The production Worker has no Workers AI binding, so the assistant endpoint does not perform model inference.

Production D1 already contains the workspace, identity and support schema. Support records are present; their contents were not inspected. Migrations 0001–0003 are already applied. Do not reapply them or clear production data.

The Cloudflare Access application protects `/admin` and `/v1/admin/*`; the Worker independently verifies Access JWT signature, issuer, audience, expiry and the administrator allowlist. End-to-end authorized browser verification remains outstanding.

### Preview

The isolated preview Worker `mr-siavash-ai-gateway-preview` is deployed from current repository source and uses the separate `mr-siavash-ai-preview` D1 database. Migrations 0001–0003 are recorded in its migration ledger. Preview smoke checks passed for liveness, D1 readiness, module catalog, knowledge fallback, support validation, administrator fail-closed behavior and CORS. Preview has no AI or administrator Access binding.

## Current source routes

The current source implements health, module metadata, assistant, support-ticket and administrator routes. The production bundle is behind the source; consult [the gateway status](../../cloudflare/gateway/README.md) before claiming a route is live.

## Privacy, retention and support

Ticket creation stores the request text and optional contact email in D1. The ticket access token is returned once and only its SHA-256 hash is stored. The public website keeps ticket submission and tracking disabled until the reviewed production release and retention decision are complete.

The Worker source includes a scheduled cleanup handler that deletes tickets after 30–365 configured days without an update, cascading to linked messages, and clears expired idempotency/rate-limit records. Preview uses 90 days. Production retention remains disabled until the owner explicitly opts in to a selected period; production D1 already contains support records.

## Production release

The manual-only [production release workflow](../../.github/workflows/gateway-production.yml) defaults to validation-only. A production traffic change requires `deploy=true`, the `cloudflare-production` GitHub environment and a scoped Cloudflare API token. The release client verifies the exact production D1 binding and Access configuration, preserves hidden secret bindings and observability settings, runs smoke checks, and rolls back to the previous traffic split on failure. Workers AI and automatic support retention are separate opt-ins.

No account login, user identity lifecycle, authenticated cloud workspace, model-generated assistant or autonomous agent runtime is currently live. These require a separate identity-provider and privacy design; they must not be inferred from the existing D1 schema.

## Contracts and tests

- `openapi.yaml` — versioned API design contract.
- `../THREAT_MODEL.md` — trust boundaries and security review.
- `../PLATFORM_CONTRACTS.md` — shared module, identity, data, AI and agent contracts.
- `../../cloudflare/gateway/tests/gateway.test.mjs` — route, support-token, AI fallback and retention tests.
- `../../scripts/deploy-production-worker.test.mjs` — production release safety gates.
- `../../.github/workflows/gateway-preview-smoke.yml` — live preview runtime checks.
- `../../.github/workflows/gateway-smoke.yml` — production health/CORS/support-route checks.

Never reuse GShop's `gahop` Worker or `gshop-db` database.
