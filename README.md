# MR_SIAVASH_AI

A modular Persian-first digital workspace for AI, software development, defensive cybersecurity learning, knowledge, and creative production.

## Product direction

MR_SIAVASH_AI is designed as one coherent ecosystem made from independently usable modules. Each module has a clear responsibility and can later connect to other modules through documented APIs.

## Current release

This repository currently contains the first static front-end release:
- Responsive Persian / RTL interface.
- Module directory with search and category filters.
- Module detail dialogs.
- Local workspace task list stored in the current browser only.
- GitHub Pages deployment workflow.

Important: AI providers, user accounts, cloud sync, agent execution, payment, and server-side storage are not connected yet. The interface does not pretend these services are live. Do not put API keys, passwords, or private credentials in this repository or browser code.

## Repository structure

- index.html — application shell and page sections
- styles.css — visual system and responsive layouts
- app.js — client-side navigation, module directory, dialogs, and local workspace
- favicon.svg — vector site icon
- .github/workflows/deploy.yml — GitHub Pages deployment

## Run locally

Use any static HTTP server from the repository root. For example:

    python -m http.server 8080

Then open http://localhost:8080.

## Deploy with GitHub Pages

1. Open repository Settings → Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push to main, or run the workflow manually from Actions.

The workflow uploads the static site and deploys it to GitHub Pages. The first deployment requires Pages to be enabled for this repository.

## Engineering principles

- Modular boundaries before feature sprawl.
- Least privilege and no secrets in client-side code.
- Accessibility, responsive behavior, and clear loading / empty states.
- Distinguish implemented behavior from roadmap items.
- Prefer small, reviewable changes and automated checks.

## License

No license has been granted yet. All rights are reserved by the repository owner unless a license is added.
