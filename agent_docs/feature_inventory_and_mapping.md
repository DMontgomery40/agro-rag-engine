# Feature Inventory and Mapping (Source of Truth)

This document inventories major features, their current code locations, backend routes, and target React routes. Use it during migration/refactor to ensure parity and avoid omissions.

## Legend
- FE: current frontend modules under `gui/` or `public/agro/`
- BE: current backend code under `server/`
- API: HTTP routes
- React Route: target route in `web/` app

## Core
- FE: `gui/index.html`, `gui/js/navigation.js`, `gui/js/tabs.js`
- BE: `server/app.py` (root `/`, static mounts)
- API: `/`, `/health`, `/api/health`
- React Route: `/` (shell), `/dashboard` (Pipeline Summary), `/health` page (optional)

## Settings / Config
- FE: `gui/js/config.js`, `gui/js/secrets.js`
- BE: `server/app.py` (`/api/config`, `/api/secrets/ingest`, `/api/env/reload`, prices)
- API: `/api/config` GET/POST, `/api/secrets/ingest`, `/api/env/reload`, `/api/prices`, `/api/prices/upsert`
- React Route: `/config`

## Onboarding Wizard
- FE: `gui/js/onboarding.js`
- BE: `server/app.py` onboarding state helpers
- API: `/api/onboarding/state`, `/api/onboarding/complete`, `/api/onboarding/reset`, plus indexing APIs
- React Route: `/onboarding`

## Chat
- FE: `gui/js/chat.js`, `gui/js/ux-feedback.js`
- BE: `server/app.py` `/api/chat`; LangGraph-app interaction; metrics
- API: `/api/chat`
- React Route: `/chat`

## Search + Answer
- FE: `gui/js/search.js`
- BE: `server/app.py` `/search`, `/answer`
- API: `/search`, `/answer`
- React Route: `/search`, `/answer`

## Traces
- FE: `gui/js/trace.js`
- BE: `server/tracing.py`, `server/app.py` `/api/traces*`
- API: `/api/traces`, `/api/traces/latest`
- React Route: `/traces`

## Keywords
- FE: `gui/js/keywords.js`, `gui/js/tooltips.js`
- BE: `server/app.py` keywords endpoints
- API: `/api/keywords`, `/api/keywords/add`, `/api/keywords/generate`
- React Route: `/keywords`

## Cost Estimator (Live)
- FE: `gui/js/cost_logic.js`, tests in `tests/cost*.spec.ts`
- BE: `server/app.py` `/api/cost/estimate*`
- API: `/api/cost/estimate`, `/api/cost/estimate_pipeline`
- React Route: `/cost`

## Storage Calculator
- FE: `gui/rag-calculator.html`, `gui/js/storage-calculator.js`
- BE: static file only
- API: n/a (static)
- React Route: `/calculator` (iframe initially)

## Profiles & Auto-Profile
- FE: `gui/js/index_profiles.js`, `gui/js/profile_renderer.js`, `gui/js/autoprofile_v2.js`, `gui/js/autotune.js`
- BE: `server/app.py` profiles + autoselect endpoints
- API: `/api/profiles`, `/api/profiles/{name}`, `/api/profiles/save`, `/api/profiles/apply`, `/api/profile/autoselect`
- React Route: `/profiles`

## Indexing Suite
- FE: `gui/js/indexing.js`, `gui/js/index_status.js`, `gui/js/index-display.js`
- BE: `server/index_stats.py`, `server/app.py` `/api/index/*`
- API: `/api/index/start`, `/api/index/run`, `/api/index/status`, `/api/index/stats`
- React Route: `/indexing`

## Semantic Boosts (formerly Semantic Boosts)
- FE: `gui/js/cards_builder.js`, `gui/js/cards.js`
- BE: `server/cards_builder.py`, `server/app.py` `/api/cards/*` (endpoints unchanged)
- API: `/api/cards/build`, `/api/cards/build/*`, logs/stream/status
- React Route: `/boosts` (UI label: "Semantic Boosts")

## Reranker Training & Evals
- FE: `gui/js/reranker.js`, `gui/js/eval_runner.js`, dashboard/eval UIs
- BE: `server/app.py` reranker admin endpoints (`/api/reranker/*`), training/eval scripts under `scripts/`
- API: `/api/reranker/logs*`, `/api/reranker/baseline/*`, `/api/reranker/cron/*`, `/api/reranker/rollback`, `/api/reranker/smoketest`, `/api/reranker/costs`, `/api/reranker/nohits`, `/api/reranker/click`
- React Route: `/reranker` with tabs: Train, Evals, Baseline/Compare, Logs, Costs, No‑Hits, Cron

## Embedded VS Code (OpenVSCode)
- FE: `gui/js/editor.js`, `gui/js/editor-settings.js`, compatibility `gui/js/vscode.js`
- BE: `server/app.py` `/health/editor`, `/api/editor/*`, `/editor` reverse proxy; `scripts/editor_up.sh`/`editor_down.sh`
- API: `/health/editor`, `/api/editor/settings`, `/api/editor/restart`, `/editor/*`
- React Route: `/editor`

## Embedded Grafana
- FE: `gui/js/grafana.js`
- BE: infra config only
- API: none (embed via iframe)
- React Route: `/grafana`

## Docker Infra Panel
- FE: `gui/js/docker.js`
- BE: `server/app.py` `/api/docker/*`
- API: `/api/docker/status`, `/api/docker/containers*`, `/api/docker/infra/*`, container actions
- React Route: `/infra`

## Alerts / Monitoring
- FE: `gui/js/alerts.js`, dashboard modules
- BE: `server/alerts.py` (`alerts_router`, `monitoring_router`)
- API: `/api/alerts/*`, `/monitoring/logs/alerts`
- React Route: `/alerts`

## MCP + Tools
- FE: `gui/js/mcp_rag.js`, `gui/js/mcp_server.js`
- BE: `server/mcp/http.py`, `server/mcp/server.py`, `server/app.py` `/api/mcp/*`
- API: `/api/mcp/http/*`, `/api/mcp/*`
- React Route: `/mcp`

## Git Hooks / Commit Metadata
- FE: `gui/js/git-hooks.js`, `gui/js/git-commit-meta.js`
- BE: `server/app.py` `/api/git/*`
- API: `/api/git/hooks/*`, `/api/git/commit-meta*`
- React Route: `/git`

## Feedback
- FE: part of chat and ux modules `gui/js/ux-feedback.js`
- BE: `server/feedback.py`
- API: `/api/feedback`
- React: integrated in chat/search views

## Tests (Existing suites to preserve)
- Playwright specs across GUI and smoke in `tests/`
- Python tests: smoke, reranker, repo path resolution, metrics, indexing, editor/grafana embeds

Use this matrix as a checklist during extraction and migration PRs.
## Dashboard (Pipeline Summary)
- FE: new `web/` Dashboard view (read‑only card)
- BE: compose from `/api/config` + health checks (+ future `/api/pipeline/summary`)
- API: `/api/config`, `/api/docker/redis/ping`, Qdrant probe, model health (as applicable)
- React Route: `/dashboard`
