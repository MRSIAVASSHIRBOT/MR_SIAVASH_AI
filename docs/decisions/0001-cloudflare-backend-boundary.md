# ADR 0001 — Dedicated Cloudflare backend boundary

- Status: Accepted; dedicated production and preview Worker/D1 resources provisioned
- Date: 2026-11-06
- Decision owners: repository owner and maintainers

## Context

MR_SIAVASH_AI began as a static GitHub Pages application. It now has a dedicated Cloudflare Worker and D1 database, separate from GShop. The production Worker has a partially deployed product API, while the preview Worker runs current repository source.

The Cloudflare account also contains GShop resources, including Worker `gahop` and D1 database `gshop-db`. Those resources are a separate product and must never become dependencies of MR_SIAVASH_AI.

## Decision

Keep GitHub Pages for the static frontend and use a dedicated Cloudflare Worker for API execution. Use separate production and preview D1 databases. Keep the release boundary explicit: merging source or deploying Pages does not deploy Worker code.

The production Worker currently serves health/readiness, knowledge-fallback assistant, public support ticket routes and Access-protected administrator routes. The deployed bundle is behind current `main`; public module metadata and scheduled retention are in the current source and preview environment. Workers AI is not bound in production. The public ticket UI remains disabled until the current Worker is released and the retention decision is approved.

## Target service map

| Concern | Choice | Reason |
| --- | --- | --- |
| API execution | Dedicated Cloudflare Worker | Independent deploy and least-privilege service boundary |
| Relational data | Dedicated production and preview D1 databases | SQL records and environment isolation |
| Object storage | R2, later | Only when file/object storage is required |
| Stateful agent coordination | Durable Objects / Agents SDK, later | Add only for durable per-agent state or coordination |
| Model traffic controls | AI Gateway, later | Centralize provider routing, analytics and policy after adapters exist |
| Frontend hosting | Existing GitHub Pages | Preserve current release path |

## Security and release constraints

- Never reuse GShop's D1 database or Worker bindings.
- Never put provider credentials or session secrets in browser code, public repository files, or localStorage.
- Derive user principals from verified sessions; never trust a client-supplied user ID.
- Enforce ownership in repository queries and prove cross-user isolation with negative tests.
- Production support retention and Workers AI are explicit opt-ins; retention can delete existing support records and AI may consume account quota or paid usage.
- Keep preview and production resources separate.
- The manual production release validates the exact D1 binding and Access configuration, runs route/readiness/CORS checks, verifies observability privacy settings and rolls back the previous traffic split if post-deploy checks fail.
- No production Worker release is triggered by a push or Pages deployment.

## Consequences

The project has a clean backend boundary and a real preview environment without coupling GShop and MR_SIAVASH_AI. Production API code is only partially aligned with current source; the owner must approve the controlled production release. Account login, cloud workspace sync and agent execution still require separate identity, privacy and permission designs.
