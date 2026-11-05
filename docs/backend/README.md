# Backend foundation — implementation gate

This directory contains design artifacts only. It does not contain a running backend and does not turn the static GitHub Pages site into an account service.

## Contract
- openapi.yaml defines the proposed v1 boundary for health, public module metadata and authenticated per-user workspace tasks.
- ../THREAT_MODEL.md defines the initial assets, trust boundaries, threats and production blockers.
- User identity is always derived from a validated server-side session. Never accept a user ID from request JSON as an authorization decision.

## Suggested implementation sequence
1. Select the deployment target and managed database based on operational constraints.
2. Implement health and public module metadata first; expose no private data.
3. Add authentication with server-side verification and a documented account lifecycle.
4. Add task persistence with tenant-scoped repository methods and negative cross-user tests.
5. Add rate limits, request-size limits, audit events, observability and backup/restore.
6. Only then connect AI providers through server-side secret storage and explicit tool permissions.

## Non-goals
- No secrets in browser storage or public repository files.
- No provider key passed to client-side JavaScript.
- No mock login presented as real authentication.
- No cloud sync claim until persistence and authorization are deployed and tested.
