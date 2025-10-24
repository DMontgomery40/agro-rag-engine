# CI, Quality Gates, and Ops Playbooks

This document defines the automation, gates, and playbooks that ensure changes are correct, accessible, and reversible. It supports the UI migration and backend modularization plans.

## CI Pipelines (GitHub Actions suggested)

- python.yml
  - matrix: { python: [3.11] }
  - steps: setup, cache, install (pip), ruff + mypy + pytest (smoke + focused)
  - artifacts: pytest reports, coverage

- web.yml
  - steps: setup Node LTS, pnpm|npm ci, tsc, eslint, vitest, build
  - artifacts: web/dist, coverage

- playwright.yml
  - services: spin up API via docker compose and ensure health endpoints (or local uvicorn if appropriate)
  - run: Playwright E2E smoke on `web/e2e` hitting real API
  - a11y audits (axe-core) on key pages: config, chat, search, traces

- docker.yml (optional, staging/main only)
  - build and push images for api and web (if separately served)

## Required Status Checks (Branch Protection)

- Python: ruff, mypy, pytest
- Web: tsc, eslint, vitest
- E2E: Playwright smoke (per-slice minimal gates)
  - Slice 1 (Dashboard):
    - `/web` loads and renders "Pipeline Summary"
    - Repo name renders from `/api/pipeline/summary`
    - `GUI_CUTOVER=1` redirects `/` → `/web`
  - Later slices add: onboarding completion; chat basic reply; editor iframe visible when enabled; grafana iframe visible when enabled; cost estimator; profiles apply
- Coverage: thresholds set for changed lines (backend and web)

## Pre‑commit Hooks

- Backend: ruff (format + lint), isort, mypy (fast mode optional), bandit (low false‑positive profile)
- Web: prettier, eslint, type‑check

## ADA and Accessibility Gates

- Playwright + axe-core checks fail the build on critical violations
- Keyboard navigation test (tabbing through primary actions) in E2E suite
- Color contrast verified by axe rules; Tailwind theme locked to AA minimum

## Anti‑regression Rules

- Import Linter: forbid `services -> routers` imports
- “No absolute paths” linter: grep for `^/Users/` and similar patterns; fail with remediation tips
- Disallow TODO/FIXME in code touching GUI or API routes

## Ops Playbooks

Cutover: Legacy GUI → New Web
- Pre‑cutover checks
  - ✅ All CI checks pass on staging
  - ✅ Playwright smoke + a11y
  - ✅ Manual sanity on config apply and search
- Enable `GUI_CUTOVER=1` and deploy; refresh API container:
  ```bash
  docker compose -f docker-compose.services.yml up -d --force-recreate api
  ```
- Monitor error logs and metrics for 24–48 hours; keep `/gui` available
  - Validate editor iframe and grafana embed visibility post‑cutover

Rollback
- Set `GUI_CUTOVER=0`, refresh API container (same command as above)
- File an incident doc and add new test covering the regression cause

Hotfix Protocol
- Branch from `staging`, cherry‑pick minimal patch, new PR to `staging`, merge → deploy → backport to `development`

## Test Data and Determinism

- Seeded data for E2E: rely on existing repo fixtures; skip heavy index builds in PR CI.
- For search E2E, use a known query that returns deterministic results in this repo; assert non‑zero count and presence of expected file path patterns.
 - For chat E2E in CI, default to retrieval‑only fallback by setting env to skip model backends, and assert non‑empty retrieval text prefix (e.g., "Retrieval-only").
