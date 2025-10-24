# UI Migration Plan: Vite + React + TypeScript + Tailwind

This is the authoritative end‑to‑end plan to migrate the current GUI (large static HTML/JS) to a modular Vite/React/TypeScript/Tailwind application with accessibility, testing, and CI gates. It uses only relative paths and environment‑configurable base paths. No stubs or placeholders — every feature remains fully wired to the backend during the migration.

## Goals

- Replace monolithic HTML/JS with a maintainable React app using TypeScript and Tailwind.
- Preserve all existing functionality and settings, and ensure every configurable backend parameter appears in the GUI with live wiring.
- Follow branch workflow (development → staging → main), prevent regressions with Playwright, Vitest, ESLint, and TypeScript gates in CI.
- Keep legacy GUI available during transition (strangler pattern) with a reversible cutover plan.

## High‑Level Strategy (Strangler Pattern)

- Create a new web app alongside the legacy GUI: `web/` served at `/web` while legacy keeps `/gui`.
- Incrementally port screens to React feature‑by‑feature, keeping them fully functional and using the same backend endpoints.
- Maintain a single source of truth for settings via a backend JSON Schema endpoint and a generated forms UI. This ensures “no hard‑coded settings anywhere” and satisfies the ADA requirement that all settings are exposed in the GUI.
- Cut over `/` to the new app only after passing CI and Playwright checks; keep `/gui` for rollback until stabilization.

## Repo Structure (New)

```
web/                      # Vite + React + TS + Tailwind app
  src/
    app/
      routes/            # React Router routes
      components/        # Shared components
      features/          # Feature folders (config, search, traces, keywords, etc.)
      store/             # Zustand (or Redux) state
      hooks/
      lib/
    styles/              # Tailwind layers
    tests/               # Unit + component tests (Vitest/testing-library)
    e2e/                 # Playwright tests
  index.html
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  .eslintrc.cjs

# Build emits to web/dist; FastAPI serves it at /web
```

## Environment and Paths (No Hard‑Coding)

- The app reads configuration via `import.meta.env` and runtime endpoint `/api/config-schema`:
  - `VITE_PUBLIC_BASE` default `""` (relative)
  - `VITE_API_BASE` default `"/api"` (relative)
  - `VITE_BUILD_TIME` injected by CI for traceability
  - Avoid absolute OS paths; use only relative URLs and server-provided paths
- Backend serves built assets at `/web` using a relative mount; all fetch calls use `VITE_API_BASE` or window override logic in production.

## Backend Contracts Required (Existing + Additions)

- Existing endpoints remain unchanged: `/api/config`, `/api/repos`, `/api/keywords/*`, `/search`, `/answer`, `/api/traces*`, `/feedback`.
- Add one endpoint that exposes a JSON Schema describing all environment settings and their metadata, and returns current values — used to auto‑render the forms:
  - `GET /api/config-schema` → `{ schema, ui, values }`
    - `schema`: JSON Schema (types, defaults, enums, ranges)
    - `ui`: UI metadata (grouping, help text, sensitivity)
    - `values`: current resolved values (non‑secret fields in clear; secret fields masked)
    - Expansion (implemented in backend worktree slice): includes `LANGGRAPH_FINAL_K`, optional thresholds `CONF_TOP1|CONF_AVG5|CONF_ANY` (when present), and optional `RERANK_TOP_K`.
  - `POST /api/config-apply` → safely persists env and repo settings (already exists as `/api/config`; we can continue to use it if it already satisfies idempotent upsert behavior).
- Serve new static bundle: mount `web/dist` at `/web` while leaving legacy `/gui` intact for the migration.

Note: These endpoints already largely exist (`/api/config` and related). The schema endpoint is additive and can be generated from a backend registry (see backend modularization plan for a shared `SettingsRegistry`).

## UI Architecture & Libraries

- Router: `react-router-dom`
- State: `zustand` (lightweight, async-friendly) with persistence for editor state where appropriate
- Forms: `@rjsf/core` (react-jsonschema-form) or `react-hook-form` + `zod` with a small adapter to server JSON Schema
- HTTP: `fetch` wrapper with base URL from `VITE_API_BASE`, request/response logging in dev
- Components: Tailwind utility‑first; pick a11y‑verified primitives: `react-aria-components` or headless components. Optional: shadcn/ui for composition (keep tree‑shaking in mind)
- Testing: `@playwright/test` for E2E; `vitest` + `@testing-library/react` for units/components
- Accessibility: axe-core integration and Playwright a11y assertions

## Feature Migration Order (Expanded)

0) Bootstrap app shell: layout, router skeleton, base fetch client, route guards
0.1) Dashboard — Pipeline Summary card (read‑only) showing repo/branch, retrieval, reranker, enrichment, generative model, and health
1) Config Settings UI (schema‑driven forms)
2) Onboarding Wizard — repo selection/clone/index, verification, completion state
3) Chat Interface — model controls, MQ/final_k/thresholds, trace linkouts
4) Search + Answer — retrieval‑only search and full answer views
5) Traces — list/latest preview, robust empty/error states
6) Keywords — list/generate/add for discriminative/semantic/llm/manual
7) Cost Estimator (Live) — wired to `/api/cost/estimate*`
8) Storage Calculator — iframe first, optional React port later
9) Profiles & Auto‑Profile — list/apply/save; `/api/profile/autoselect`
10) Indexing Suite — start/run, status, stats; Semantic Boosts Builder (start/stream/status)
11) Reranker Training & Evals — Train, Evals, Baseline/Compare, Logs, Costs, No‑Hits, Cron (cross‑encoder only)
12) Embedded VSCode — health, restart, settings, reverse proxy iframe (also top bar quick button)
13) Embedded Grafana — env‑driven iframe with preview/open (also top bar quick button); visibility rules
14) Docker Infra Panel — containers/status/actions; Redis ping
15) Alerts/Monitoring — logs/alerts routes and dashboards
16) MCP Tools — status/HTTP bridge controls/test endpoint
17) Admin Utilities — git hooks, commit metadata, secrets ingest, prices upsert
18) Replace root route `/` → `/web` after parity; keep `/gui` for rollback

At each step, write Playwright tests that hit the backend and validate real flows. Do not ship partially wired UI.

## Detailed Work Plan

Phase 0 — Project Scaffolding
- Create `web/` with Vite React TS template.
- Add Tailwind and base styles; enable Prettier, ESLint (typescript + react + import + prettier), Stylelint optional.
- Install Playwright and generate baseline fixtures. Configure CI runners.
- Mount `web/dist` at `/web` in FastAPI.

Phase 1 — Settings Schema and Forms
- Implement `/api/config-schema` in backend from a shared registry (types, defaults, env var names, validators, UI groups).
- Build forms that render from schema, including masked secrets with show/hide and file import backed by `/api/secrets/ingest`.
- Add Playwright tests to validate reading, editing, applying settings, and seeing live effect (e.g., change `REPO`, reload env, verify `/api/config` reflects it).

Phase 1.5 — Dashboard Pipeline Summary (read‑only)
- Add a small API call that composes summary from `/api/config` and health endpoints to render Dashboard → Pipeline Summary card
- Fields: Active repo (or local docs), branch, Retrieval mode, Reranker status/mode/model, Enrichment on/off, Generative model, health pings
- Playwright: dashboard renders summary fields; links jump to Settings sections

Phase 2 — Chat + Search + Answer
- Chat UI with settings (model, temp, tokens, MQ, final_k, confidence, system prompt) wired to `/api/chat`
- Retrieval‑only Search wired to `/search`; Answer wired to `/answer` with trace linkouts
- Streaming: if backend supports it, add streaming path; otherwise progressive updates
- Playwright: chat returns text + headers; search returns results; open file links

Phase 3 — Onboarding, Traces, and Keywords
- Onboarding: multi‑step wizard wired to `/api/onboarding/*` + indexing APIs
- Traces: list + latest preview; handle empty and error states
- Keywords: generation (heuristic default) and manual add/edit
- Playwright: onboarding completion persists; keywords add/generate; traces display

Phase 4 — Calculators + Profiles
- Live Cost Estimator page wired to `/api/cost/estimate_pipeline` (fallback `/api/cost/estimate`)
- Storage Calculator page (iframe first); consider React port after parity
- Profiles list/apply/save; auto‑profile via `/api/profile/autoselect`
- Playwright: cost estimator works; profile apply reflected in `/api/config`

Phase 5 — Editor + Grafana + Infra
 - Reranker: `/reranker` section with tabs; wire to existing `/api/reranker/*` endpoints; ensure eval baselines compare and logs view work
 - VSCode: iframe `/editor` reverse proxy, health check, restart, settings; keyboard nav a11y; top bar button with dropdown for external vs inline
 - Grafana: iframe with env controls; preview/open; CI visibility rules; top bar button with dropdown for external vs inline
 - Docker Infra Panel: status, containers, actions; Redis ping
 - Playwright: reranker tabs load and actions respond; editor/grafana visible when enabled

Phase 6 — Cutover
- Gate‑controlled redirect from `/` to `/web` controlled by env var `GUI_CUTOVER=1`.
- Keep `/gui` mounted for one release as fallback. Document rollback.

## Accessibility (ADA) Requirements

- Use semantic elements, labels, and aria attributes across the app.
- High contrast by default; Tailwind theme with WCAG AA contrast check.
- Keyboard navigation: focus outlines visible; tab order tested.
- Playwright + axe-core a11y scans in CI on key routes (config, search, traces).
- All GUI settings present; no removal or hiding of broken settings. Fix them instead (onboarding, chat, editor, grafana, cost/profile/calculator, infra, alerts).

## Testing Strategy

- Unit: Vitest + React Testing Library for components/hooks.
- E2E: Playwright hitting real backend endpoints. Required checks:
  - Config loads and applies updates
  - Dashboard pipeline summary renders expected fields (using current env)
  - Onboarding completes and persists
  - Chat returns results and sets response headers
  - Search returns results and links navigate to `files/*`
  - Traces list/latest view behaves
  - Keywords add/generate works
  - Cost estimator computes with backend parity
  - Profiles apply/save reflect in `/api/config`
  - Editor health and iframe loads (when enabled)
  - Grafana iframe loads (when enabled)
  - Reranker tabs (Train/Evals/Baseline/Logs) render; at least one non‑destructive action responds
  - Docker panel renders and basic statuses load
  - a11y scans pass on config/chat/search/traces
- Smoke suite runs on each PR; full suite runs on staging/nightly.

## CI Quality Gates (UI)

- tsc must pass (no `any` escapes without justification)
- ESLint clean (no warnings in PRs)
- Vitest unit suite green
- Playwright minimal smoke green (config + search)
- Bundle size guardrails with `vite-bundle-visualizer` budget warnings

## Risk Register and What‑Ifs

- Routing conflicts: keep `/web` distinct until cutover; feature‑flag redirect.
- API base path mismatch: centralize in `VITE_API_BASE`; provide shim for hosted contexts.
- Secrets handling: mask in `/api/config` and forms; provide explicit reveal with user action only.
- Large bundle regressions: code‑split heavy routes; lazy load calculator.
- Flaky tests: seed predictable data for specific tests; skip long external flows in PR.
- Docker bind mounts: after changes to server static mounts, run `docker compose -f docker-compose.services.yml up -d --force-recreate api` per policy.

## Rollback Plan

- If a regression found post‑cutover: set `GUI_CUTOVER=0` and restart API container to restore legacy `/gui` as default; new `/web` remains available for debugging.
- Keep tags for legacy assets; no destructive changes to old GUI until stabilization + 2 releases.

## Tooling and Partial Automation

- HTML → JSX: use `html-to-jsx` and ESLint autofix to convert markup; still requires human review.
- Extract repeated DOM chunks into React components aided by search tools and codemods (e.g., `jscodeshift`).
- Tailwind class consolidation via `@tailwindcss/typography` and custom utilities.
- No known “one‑click” accurate auto‑translator — LLMs can assist chunk‑by‑chunk, but each piece must be wired and tested.

## Definition of Done for UI Migration

- New app covers all existing features with Playwright green on config/search/traces/keywords/calculator routes.
- a11y scans pass (axe‑core) and keyboard navigation verified.
- CI gates enforced; PR protection enabled; no direct pushes to `main`.
- Cutover flag enabled; rollback documented; legacy `/gui` retained for one release window.

## Progress (Feature Worktree)

- UI worktree server wiring:
  - `.worktrees/feature-ui-migration/server/app.py` mounts `web/dist` at `/web` and supports `GUI_CUTOVER=1` redirect from `/` → `/web`.
- Backend support for UI:
  - `.worktrees/feature-backend-modularization/server/app.py` implements `GET /api/pipeline/summary` and `GET /api/config-schema`.
- Next: Scaffold `web/` (Vite/React/TS/TW) with Sidebar/Topbar (VSCode/Grafana) and Dashboard rendering `/api/pipeline/summary`, then add Playwright smoke.
