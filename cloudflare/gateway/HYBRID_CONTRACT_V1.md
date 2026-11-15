# Hybrid Contract v1 — Public Gateway Boundary

**Component role:** Public website knowledge and public support workflows.  
**Canonical ecosystem contract:** [MR_SIAVASH_HUB_AI — Hybrid Integration Contract v1](https://github.com/MRSIAVASSHIRBOT/MR_SIAVASH_HUB_AI/blob/main/contracts/hybrid/v1/manifest.json)

## Public Gateway responsibility

The Cloudflare Worker under `cloudflare/gateway/` serves the public MR_SIAVASH_AI website. Its supported data class is public website knowledge and public support workflow data. It is not an authenticated proxy to the private Hub.

## Explicit non-permissions

The public Gateway must not:

- Call private Hub endpoints or expose Hub internal routes.
- Receive, store, forward, or return Hub bearer credentials.
- Read private Hub memory, owner tasks, agent state, approvals, or audit records.
- Treat a public website session or a Telegram identity as proof of Hub owner authorization.
- Provide an indirect path from browser requests into private Hub capabilities.

## Future owner-facing features

An owner console or private cross-service workflow requires a separately designed server-side trust path with explicit identity binding, scoped authorization, audit events, bounded requests, and tests. It must not be implemented by adding private Hub credentials to the public Gateway or browser bundle.

## Request correlation

The public Gateway and the private EL_AI ↔ Hub integration use separate correlation contexts:

- **Public Gateway:** accepts a syntactically valid UUID (versions 1–8, RFC 4122 variant) in `X-Request-ID`, normalizes accepted values to lowercase, and generates a UUIDv4 when the header is absent or invalid. It returns the canonical value in the `X-Request-ID` response header; JSON API responses also include `request_id`. Admin HTML and CORS preflight responses carry the response header as well.
- **Private Hub integration:** EL_AI generates a separate UUID per logical Hub operation, reuses it for the permitted 401 retry, and gives refresh/pairing calls independent IDs. The Hub validates canonical lowercase UUIDs, replaces missing or invalid values, echoes the canonical value, and emits privacy-safe route-template logs.

A public Gateway request ID is **not** forwarded to the private Hub and is not proof of cross-service correlation. The public Gateway remains a public-only service with no private Hub credentials, routes, or data access. Request IDs are diagnostic metadata only; they do not grant permissions or act as idempotency keys.

## Compatibility

The canonical Hub manifest is merged and available on the Hub `main` branch. This document records the public Gateway's consumer-side obligations; the manifest remains the source of truth for cross-project trust boundaries.
