# MR_SIAVASH_AI — Architecture

## Product boundary

The current repository is a static, browser-executed front end. It must not claim to provide authentication, remote AI execution, cloud persistence, or private user accounts until a trusted backend exists.

## Front-end layers

1. **Presentation:** semantic HTML, RTL layout, responsive CSS, keyboard navigation, dialogs, status indicators.
2. **Client application:** module registry, hash routing, saved-module state, local task operations, JSON import/export.
3. **Browser persistence:** versioned localStorage keys. Data is scoped to one browser profile and is not synchronized.
4. **Offline shell:** service worker uses an explicit exact-URL allowlist for static application resources. It bypasses API, authenticated, query-string, cross-origin, unknown-route, and non-GET requests; navigation fallback is limited to the app document and stores only successful HTML responses.

## Module boundaries

| Module | Responsibility | Current state |
| --- | --- | --- |
| AI Hub | Model/provider discovery and evaluation | Roadmap |
| Agents Lab | Agent definitions, tools, workflow orchestration | Roadmap |
| Developer Studio | Code, repository and engineering utilities | Roadmap |
| Secure Lab | Defensive security and authorized lab learning | Roadmap |
| Network & Linux Lab | Networking, Linux and troubleshooting learning | Roadmap |
| Knowledge Library | Searchable learning resources and notes | Roadmap |
| Creator Studio | Content planning and production workflows | Roadmap |
| Digital Identity | User profile and privacy preferences | Roadmap |
| Personal Workspace | Local tasks, favorites and backup | Browser-only prototype |

## Future backend boundary

The selected first backend target is a dedicated Cloudflare Worker maintained under `cloudflare/gateway/`. The current GitHub Pages frontend remains in place. The health-only Worker is deployed at `https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev` with a dedicated production D1 binding; it exposes liveness and D1-backed readiness checks only. Authentication, user APIs, and cloud sync are not implemented. Its control-plane configuration has been read back, but an independent HTTP runtime smoke test remains outstanding. See [ADR 0001](decisions/0001-cloudflare-backend-boundary.md) and the gateway README. GShop resources are isolated and must not be reused.


Before production integrations, establish:
- Authentication and session lifecycle.
- Authorization checks on every protected server operation.
- Server-side secret storage; never expose provider credentials to browser JavaScript.
- API contracts with schema validation, versioning, rate limits and audit events.
- Per-user data isolation and explicit data-retention rules.
- Background job boundaries and human approval for consequential agent actions.
- Automated tests for permissions, data isolation, failure handling and abuse limits.

## Data portability

The workspace backup format is JSON with schema identifier mr-siavash-ai-workspace and version 1. Imports are capped at 256 KiB, limited to 100 tasks, validated before use, and merged without replacing existing tasks. The workspace never evicts an existing task to make room: additions stop at 100, and imports report how many new tasks were accepted or skipped because capacity is full. Task and favorite mutations persist the proposed state before committing it in memory; failed writes leave the prior in-memory state intact. Treat backup files as untrusted input.

## Deployment

GitHub Actions runs JavaScript syntax checks, OpenAPI contract validation and repository tests before publishing the static root to GitHub Pages. Third-party Actions are pinned to full commit SHAs and Dependabot monitors those pins weekly. The repository owner must enable GitHub Pages with the GitHub Actions source in repository settings.


## API contract boundary

The proposed API is documented in docs/backend/openapi.yaml. It separates public module metadata and health checks from authenticated user workspace operations. The API contract is not a running service.

Before implementation, use docs/THREAT_MODEL.md and enforce user ownership in server-side repository queries. The authenticated principal must come from a verified session, never from a client-supplied user identifier.


## Shared integration contracts

See docs/PLATFORM_CONTRACTS.md for module manifests, identity and authorization boundaries, AI provider adapters, constrained agent execution, observability, and production release gates. These are design requirements until implemented and tested end to end.
