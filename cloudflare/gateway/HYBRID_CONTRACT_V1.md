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

## Observability gap

The ecosystem's v1 contract does not yet standardize end-to-end `X-Request-ID` propagation. Gateway-local request IDs must not be described as proof of cross-service correlation.

## Compatibility

The canonical Hub manifest is merged and available on the Hub `main` branch. This document records the public Gateway's consumer-side obligations; the manifest remains the source of truth for cross-project trust boundaries.
