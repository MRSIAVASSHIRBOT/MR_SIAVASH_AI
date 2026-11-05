# MR_SIAVASH_AI

A Persian-first, modular digital workspace for AI, software development, network and Linux learning, defensive cybersecurity, knowledge, and creative production.

## Product model

MR_SIAVASH_AI is one ecosystem made of independently usable modules. Modules have explicit boundaries and can collaborate through documented interfaces when integrations are implemented. The product favors transparent capability status: a prototype is not presented as a production service.

## Current front-end release

The repository provides a static web application with:
- Responsive Persian / RTL interface and hash-based navigation.
- Searchable module catalog with category filters and saved modules.
- Accessible module detail dialogs and keyboard shortcuts (Ctrl/Cmd + K, /).
- Browser-local workspace task manager with search, status filters, progress counts and confirmed bulk cleanup.
- JSON export and validated, bounded JSON import for local workspace data.
- PWA manifest and versioned service-worker cache for the static app shell.
- GitHub Actions workflow with syntax and repository-structure tests before GitHub Pages deployment.

### What is not connected yet

AI model providers, remote agent execution, user accounts, private profiles, cloud synchronization, backend APIs, billing, and server-side data storage are not implemented. Local favorites and tasks remain in the current browser. Do not enter secrets, passwords, private keys, or sensitive personal data into this static site.

## Repository structure

- index.html — application shell and page sections
- styles.css — visual system and responsive layouts
- app.js — navigation, module catalog, favorites, local workspace and data portability
- manifest.webmanifest — installable web-app metadata
- sw.js — static-shell offline cache
- tests/site.test.mjs — dependency-free Node.js structure and safety checks
- tests/service-worker.test.mjs — runtime regression tests for static-cache isolation and navigation boundaries
- .github/workflows/deploy.yml — quality checks and GitHub Pages deployment
- docs/ARCHITECTURE.md — current boundaries and future integration plan
- SECURITY.md — security reporting and client-side security boundaries

## Run locally

Use Node.js 22 or a Python static server from the repository root:

    python -m http.server 8080

Then open http://localhost:8080. Service-worker installation requires HTTPS or localhost.

Run repository checks:

    node --check app.js
    node --check sw.js
    node --test tests/*.test.mjs

## Deploy with GitHub Pages

1. Open repository Settings → Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push to main, or run the workflow manually from Actions.

The workflow runs syntax and structure tests before uploading the static site. The first deployment still requires GitHub Pages to be enabled for this repository.

## Engineering principles

- Modular boundaries before feature sprawl.
- Least privilege and no secrets in browser code.
- Validate imported data and treat user-generated content as untrusted.
- Accessibility, responsive behavior, and clear empty / error states.
- Explicitly distinguish implemented behavior from roadmap items.
- Prefer small, reviewable changes and automated checks.

## License

No license has been granted yet. All rights are reserved by the repository owner unless a license is added.


## Backend contract (design-only)

- docs/backend/openapi.yaml defines a proposed v1 API boundary.
- docs/THREAT_MODEL.md records the initial security threat model.
- docs/backend/README.md explains the implementation gates.
- docs/ROADMAP.md coordinates the workstreams and release stages.
- docs/PLATFORM_CONTRACTS.md defines shared integration and production-readiness requirements.

These are design artifacts only. No backend API, real authentication, account system or cloud synchronization is deployed by the static site.
