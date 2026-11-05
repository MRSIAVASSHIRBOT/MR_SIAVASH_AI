# MR_SIAVASH_AI — Architecture

## Product boundary

The current repository is a static, browser-executed front end. It must not claim to provide authentication, remote AI execution, cloud persistence, or private user accounts until a trusted backend exists.

## Front-end layers

1. **Presentation:** semantic HTML, RTL layout, responsive CSS, keyboard navigation, dialogs, status indicators.
2. **Client application:** module registry, hash routing, saved-module state, local task operations, JSON import/export.
3. **Browser persistence:** versioned localStorage keys. Data is scoped to one browser profile and is not synchronized.
4. **Offline shell:** service worker caches only same-origin static application resources. It does not cache API responses or non-GET requests.

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

Before production integrations, establish:
- Authentication and session lifecycle.
- Authorization checks on every protected server operation.
- Server-side secret storage; never expose provider credentials to browser JavaScript.
- API contracts with schema validation, versioning, rate limits and audit events.
- Per-user data isolation and explicit data-retention rules.
- Background job boundaries and human approval for consequential agent actions.
- Automated tests for permissions, data isolation, failure handling and abuse limits.

## Data portability

The workspace backup format is JSON with schema identifier mr-siavash-ai-workspace and version 1. Imports are capped at 256 KiB, limited to 100 tasks, validated before use, and merged without replacing existing tasks. Treat backup files as untrusted input.

## Deployment

GitHub Actions runs JavaScript syntax checks and dependency-free structure tests before publishing the static root to GitHub Pages. The repository owner must enable GitHub Pages with the GitHub Actions source in repository settings.


## API contract boundary

The proposed API is documented in docs/backend/openapi.yaml. It separates public module metadata and health checks from authenticated user workspace operations. The API contract is not a running service.

Before implementation, use docs/THREAT_MODEL.md and enforce user ownership in server-side repository queries. The authenticated principal must come from a verified session, never from a client-supplied user identifier.
