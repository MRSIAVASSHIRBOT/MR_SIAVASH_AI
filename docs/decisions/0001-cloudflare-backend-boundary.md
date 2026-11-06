# ADR 0001 — Dedicated Cloudflare backend boundary

- Status: Accepted; health-only Worker and dedicated production D1 provisioned
- Date: 2026-11-06
- Decision owners: repository owner and maintainers

## Context

MR_SIAVASH_AI currently ships as a static GitHub Pages application. Its OpenAPI document, threat model, and platform contracts are design artifacts; they do not provide a running API, authentication, cloud persistence, or remote agent execution.

The Cloudflare account already contains production resources for GShop, including a Worker named `gahop`, a Pages project, and a D1 database named `gshop-db`. Those resources serve a separate product and must not become implicit dependencies of MR_SIAVASH_AI.

## Decision

Create a dedicated Cloudflare Worker service for MR_SIAVASH_AI, maintained in this repository under `cloudflare/gateway/`. Keep the current GitHub Pages frontend in place during the first backend stages. Do not migrate hosting merely to add an API. The health-only Worker and its dedicated production D1 database have now been provisioned; product APIs remain out of scope until their security gates pass.

Use a dedicated D1 database for MR_SIAVASH_AI when persistence is provisioned. Keep GShop's Worker, D1 database, Pages project, DNS records, and secrets isolated and unchanged.

The initial Worker boundary is deliberately narrow:
- liveness is independent of dependencies;
- readiness checks the dedicated D1 binding;
- CORS uses exact configured origins and never a wildcard;
- responses are non-cacheable and carry request IDs and baseline security headers;
- unknown routes and unsupported methods are rejected;
- no private or mutating product endpoint is exposed before authentication and authorization exist.

## Target service map

| Concern | Initial choice | Reason |
| --- | --- | --- |
| API execution | Dedicated Cloudflare Worker | Independent deploy and least-privilege service boundary |
| Relational data | Dedicated D1 database | SQL records and tenant-scoped queries |
| Object storage | R2, later | Only when file/object storage is required |
| Stateful agent coordination | Durable Objects / Agents SDK, later | Add only for durable per-agent state or coordination |
| Model traffic controls | AI Gateway, later | Centralize provider routing, analytics and policy after adapters exist |
| Frontend hosting | Existing GitHub Pages, initially | Avoid an unrelated hosting migration and preserve current release path |

## Security and release constraints

- Never reuse GShop's D1 database or Worker bindings.
- Never put provider credentials or session secrets in browser code, public repository files, or localStorage.
- A health endpoint is not authentication and does not establish that product features are ready.
- Derive the user principal from a verified session; never trust a client-supplied user ID.
- Enforce ownership in repository queries and prove cross-user isolation with negative tests.
- Add rate limits, body-size bounds, audit events, observability, backup/restore and rollback before production data is accepted.
- Keep preview and production resources separate.
- Do not create production routes, DNS changes, secrets, or database migrations until the dedicated resources and exact frontend origin are confirmed.

## Consequences

The project gains a clean backend boundary without coupling GShop and MR_SIAVASH_AI. The cost is an additional Worker and database to operate. Production capabilities remain explicitly unavailable until their implementation gates pass.
