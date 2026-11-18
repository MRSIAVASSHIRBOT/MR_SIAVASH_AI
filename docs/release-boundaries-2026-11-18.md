# Release Boundaries — 2026-11-18

## Scope
This repository is the public site and Gateway. It is active, but Production Gateway and Pages releases remain approval-gated.

## Required before Gateway release
- Compare the intended source commit with the active Worker annotation.
- Review migrations, backup, rollback, and Preview smoke results.
- Verify CORS, privacy, and authentication boundaries.
- Obtain explicit owner approval before Production deployment.

## Safety
- Do not expose secrets, tokens, customer data, or raw support payloads in logs or exports.
- Static-site and Gateway checks must be distinguished from Production deployment evidence.
- PostZen publishing is separate from repository maintenance.

## Cross-project boundary
- Hub integration must remain explicit and bounded.
- EL_AI integration is opt-in and must not be activated by website maintenance.
