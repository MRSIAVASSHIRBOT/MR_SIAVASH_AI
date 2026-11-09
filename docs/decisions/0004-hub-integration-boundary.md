# ADR-0004: Safe integration boundary for MR_SIAVASH_AI and MR_SIAVASH_HUB_AI

- **Status:** Proposed; no runtime integration is active
- **Date:** 2026-11-09
- **Decision scope:** Public site, Cloudflare Gateway, local-first Hub runtime

## Context

The projects have complementary but different trust boundaries:

- **MR_SIAVASH_AI** is the public-facing identity, portfolio and learning site. Its primary frontend is static and browser-executed; its Cloudflare Worker has separate production and preview environments.
- **MR_SIAVASH_HUB_AI** is a local-first FastAPI/SQLite control plane and agent runtime. It has its own owner authentication, memory and knowledge repositories, tool policy, approvals, workflow execution and audit trail.

They are separate repositories and deployments. There is currently no shared identity, shared database, API session or live runtime connection. Treating the static site as if it were already connected would create a false capability claim and an unsafe trust boundary.

## Decision

### 1. Preserve separate authorities

- MR_SIAVASH_AI owns public presentation, learning content, public project metadata and its own Gateway routes.
- MR_SIAVASH_HUB_AI remains authoritative for local owner identity, private memory, knowledge, tasks, files, agent runs, tool permissions, approvals and audit.
- A browser-supplied user ID, project ID or claimed role never establishes Hub ownership or authorization.
- No shared SQLite or D1 database is introduced.

### 2. Begin with read-only public metadata

The first runtime milestone may expose only explicitly allowlisted, non-sensitive status metadata through a versioned contract. It must exclude private task names, prompts, memory, file paths, credentials, support records, raw logs and other user data. The public site must render capability status from that contract and distinguish unavailable, stale and unverified states.

### 3. Require owner-initiated pairing for private features

Private Hub features must not be called directly from the public static site without a reviewed pairing boundary. The preferred future shape is an owner-controlled local bridge or an intentionally hosted service with a separately reviewed identity model.

A pairing implementation must include:
- explicit user initiation and clear consent about the data and actions exposed;
- exact allowed site origin and a paired-client identity;
- short-lived, narrowly scoped credentials held only as long as needed;
- challenge binding, replay protection, revocation and bounded request sizes/rates;
- Hub-side authentication, ownership and authorization checks on every request;
- structured audit events that exclude secrets and unnecessary private content;
- idempotency for retryable requests;
- explicit approval before external, destructive, financial or otherwise consequential actions.

Exact-origin CORS is necessary for browser access but is not authentication or authorization.

### 4. Prohibit unsafe shortcuts

Do not:
- create a public tunnel to a developer machine or expose the local Hub port to the internet;
- enable wildcard CORS or unauthenticated local API routes;
- place long-lived Hub credentials in HTML, JavaScript bundles, localStorage, IndexedDB or service-worker caches;
- let the public site read private Hub memory, knowledge, files or task records without explicit owner authorization;
- bypass the Hub policy engine or human-approval boundary because a request originated from MR_SIAVASH_AI;
- silently fall back from a failed local connection to a cloud provider or another identity.

### 5. Keep remote hosting a separate decision

If the owner later chooses to host Hub remotely, that is a distinct deployment and security decision. It requires verified identity, tenant isolation, TLS, rate limits, observability, backup/restore, data-retention and deletion policies, incident response and cost controls. A local-first service must not become internet-facing merely to make a frontend integration convenient.

## Staged rollout

1. **Stage 0 — documentation:** agree on this boundary and keep the projects explicitly labeled as separate.
2. **Stage 1 — public status:** add a read-only, versioned and allowlisted status contract; verify that no private data is present.
3. **Stage 2 — local pairing:** implement an owner-controlled bridge with scoped credentials, revocation and negative security tests.
4. **Stage 3 — bounded agent actions:** expose only named Hub capabilities through policy-checked APIs, with audit, idempotency, budgets and human approval.
5. **Stage 4 — remote hosting, if requested:** perform a separate threat model and production-readiness review before enabling any public endpoint.

## Acceptance criteria

- Unauthenticated, unpaired, wrong-origin, expired and revoked clients are denied.
- Cross-user and cross-project data access is denied by server-side ownership checks.
- Replayed and duplicate requests cannot repeat side effects.
- Request sizes, rates, execution time and provider budgets are bounded.
- No credential, private prompt, memory passage or raw tool output appears in browser storage or logs.
- No consequential side effect runs without the Hub's explicit approval policy.
- Public metadata contains only allowlisted fields and accurately reports freshness and capability status.
- Offline site behavior remains functional when Hub is unavailable.
- End-to-end tests prove the exact integration path before UI copy claims that the projects are connected.

## Consequences

This decision intentionally delays private cross-project features until a safe pairing model exists. It allows public identity and project status to evolve independently while preserving the Hub as the sole authority for private state and agent execution.

Until the acceptance criteria pass, the truthful user-facing status is: **MR_SIAVASH_AI and MR_SIAVASH_HUB_AI are separate projects and are not connected.**
