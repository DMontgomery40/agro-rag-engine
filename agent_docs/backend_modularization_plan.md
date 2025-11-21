# Backend Modularization Plan: server/app.py → Modular FastAPI

This plan decomposes `server/app.py` into a clean, testable FastAPI project with explicit module boundaries, DI-friendly services, and a shared settings registry powering both backend validation and the GUI forms. It avoids hard‑coded paths and centralizes configuration. No endpoints are removed; functionality is preserved end‑to‑end with smoke tests.

## Goals

- Break `server/app.py` into routers, services, core, and adapters.
- Single source of truth for settings via a `SettingsRegistry` that also emits a JSON Schema for the GUI.
- Maintain all existing behavior and endpoints while reducing the size and complexity of the app.
- Enforce quality with ruff, mypy, pytest (incl. smoke), and import-linter in CI.

## Target Layout

```
server/
  __init__.py
  asgi.py                      # app factory + mounts + middleware wiring
  main.py                      # optional uvicorn entrypoint
  core/
    settings.py                # pydantic BaseSettings + SettingsRegistry
    paths.py                   # repo_root/gui/docs/files helpers (already exists as common.paths)
    logging.py                 # logging init + json logs
    metrics.py                 # metrics init (existing)
    middleware.py              # frequency limiter, interceptors
  routers/
    __init__.py
    index.py                   # / (serve web or legacy)
    config.py                  # /api/config, /api/config-schema, /api/config-apply
    repos.py                   # /api/repos*
    keywords.py                # /api/keywords/*
    search.py                  # /search, /answer, /api/chat
    traces.py                  # /api/traces*
    feedback.py                # /api/feedback
    alerts.py                  # alerts + monitoring routers
    costs.py                   # /api/cost/*
    profiles.py                # /api/profiles*, /api/profile/autoselect
    indexing.py                # /api/index/*
    semantic boosts.py                   # /api/cards/*
    onboarding.py              # /api/onboarding/*
    editor.py                  # /health/editor, /api/editor/*, /editor proxy
    docker.py                  # /api/docker/*
    gitmeta.py                 # /api/git/*
    mcp_http.py                # /api/mcp/http/* and /api/mcp/*
    reranker_admin.py          # /api/reranker/*
    evals.py                   # /api/eval/*
  services/
    rag.py                     # search_routed_multi wrapper + business logic
    reranker.py                # current rerankers + scoring
    config_store.py            # read/write .env and repos.json (atomic and idempotent)
    secret_ingest.py           # /api/secrets/ingest logic
    keywords.py                # generation pipeline (heuristic + llm) and storage
    traces.py                  # trace list/load helpers
    costs.py                   # pricing/spec parsing and estimate calculations
    profiles.py                # profile read/apply/save and auto-select logic
    indexing.py                # start/run/status/stats
    semantic boosts.py                   # background job orchestration for semantic boosts builder
    onboarding.py              # server-side wizard state, validations
    editor.py                  # health/restart/settings, reverse proxy helpers
    docker.py                  # docker engine interactions (via docker SDK or CLI)
    gitmeta.py                 # commit metadata and hooks helpers
    mcp_http.py                # orchestration of MCP HTTP bridge
    reranker_admin.py          # training pipeline helpers, logs, cron setup
    evals.py                   # eval baseline save/compare
  adapters/
    mcp.py                     # MCP bridging (optional runtime)
    qdrant.py                  # vector DB access if applicable (wraps client; optional)
  schemas/
    config_schema.py           # JSON Schema model emitters
  tests/ (see /tests top-level; do not duplicate)
```

## SettingsRegistry (Single Source of Truth)

- Implement a `SettingsRegistry` that:
  - Defines all tunables and environment variables with metadata (type, default, range, enum, group, secret mask flag).
  - Hydrates values from env with precedence: process env → `.env` file → defaults.
  - Exposes `to_json_schema()` for the GUI and validators for the backend.
  - Avoids absolute paths; use repo-relative and env-var‑driven references only.
- Registry values consumed across services; no module reads arbitrary `os.environ` directly.

## Migration Steps

1) App Factory and Mounts
   - Create `server/asgi.py` with `create_app()` that wires middleware, metrics, static mounts (`/gui`, `/docs`, `/files`, and new `/web`), and includes routers.
   - Keep legacy `server/app.py` temporarily as a thin shim that imports `create_app()` and exposes `app` for compatibility; gradually eliminate shim once complete.

2) Extract Routers (thin controllers)
   - Move each endpoint group from `server/app.py` into `server/routers/*` modules, importing service functions.
   - Keep request/response models local to router files or in `schemas/` where shared.
   - Maintain identical paths and shapes of responses.

3) Extract Services (business logic)
   - `services/config_store.py`: read/write `.env`, `repos.json`, with atomic writes and backup policy (already implemented logic in app.py can be moved here).
   - `services/rag.py`: wraps `retrieval.hybrid_search.search_routed_multi` with consistent inputs; centralizes `repo` resolution.
   - `services/keywords.py`: unify the current heuristic pipeline; optionally provide LLM mode via existing enrichers. Parameterize limits via registry.
   - `services/traces.py`: list and load traces with error handling.

4) Settings Registry + JSON Schema Endpoint
   - Implement `core/settings.py` with a registry of fields (ids, names, help, type, default, validator). Derive JSON Schema.
   - Add `GET /api/config-schema` that returns `{ schema, ui, values }` and is used by the new GUI forms; continue using `/api/config` for a broad snapshot and `/api/config` POST for apply.

5) Middleware & Interceptors
   - Move anomaly detector, metrics init, and request interceptor setup into `core/middleware.py` and `core/metrics.py` and apply in `create_app()`.

6) Tests & Parity
   - Run existing smoke tests (`tests/smoke/*`) frequently during extraction.
   - Add targeted tests for config registry and repos write/read without absolute paths.
   - Keep import paths stable or provide shims to avoid breaking tests mid‑migration.

7) Finalize and Remove Shim

## Endpoint Inventory to Extract (from server/app.py)

- Core: `/`, `/health`, `/api/health`, static mounts `/gui`, `/docs`, `/files`, `/web`
- RAG: `/search`, `/answer`, `/api/chat`
- Config: `/api/config` GET/POST, `/api/env/reload`, `/api/secrets/ingest`, `/api/prices`, `/api/prices/upsert`
- Repos: `/api/repos*`
- Traces: `/api/traces*`
- Keywords: `/api/keywords/*`
- Profiles: `/api/profiles*`, `/api/profile/autoselect`, `/api/checkpoint/config`
- Indexing: `/api/index/start`, `/api/index/run`, `/api/index/status`, `/api/index/stats`
- Semantic Boosts: `/api/cards/build*`
- Editor: `/health/editor`, `/api/editor/*`, `/editor` reverse proxy
- Onboarding: `/api/onboarding/*`
- Costs: `/api/cost/estimate*`
- MCP: `/api/mcp/*`, `/api/mcp/http/*`
- Docker: `/api/docker/*`
- Alerts/Monitoring: routers already split (`alerts_router`, `monitoring_router`)
- Reranker Admin: `/api/reranker/*`
- Evals: `/api/eval/*`
- Git Meta + Hooks: `/api/git/*`
- Feedback: `/api/feedback`

## New Additive Endpoint (spec only; implement during extraction)

- Pipeline Summary: `GET /api/pipeline/summary`
  - Returns a concise snapshot for the Dashboard card. Pulled from SettingsRegistry, `/api/config`, and health checks.
  - Shape:
    ```json
    {
      "repo": { "name": "agro", "mode": "repo|local", "branch": "main" },
      "retrieval": { "mode": "bm25|dense|hybrid", "top_k": 10 },
      "reranker": { "enabled": true, "backend": "cloud|hf|learning", "provider": "cohere", "model": "rerank-3.5" },
      "enrichment": { "enabled": true, "backend": "mlx|ollama|openai", "model": "qwen3-coder:30b" },
      "generation": { "provider": "openai", "model": "gpt-4o-mini" },
      "health": { "qdrant": "ok|fail", "redis": "ok|fail", "llm": "ok|degraded|off" }
    }
    ```
  - No secrets. Use env and existing helpers; derive branch via `GIT_BRANCH` and/or `git` subprocess (safe fallback).

## Progress (Feature Worktree)

- Implemented in `.worktrees/feature-backend-modularization/server/app.py`:
  - `GET /api/pipeline/summary` — returns repo/local mode, branch, retrieval, reranker, enrichment, generation, health
  - `GET /api/config-schema` — returns `{ schema, ui, values }` for Settings UI
- Smoke tests (worktree):
  - `PYTHONPATH=. pytest -q tests/test_pipeline_summary_direct.py` → passed
  - `PYTHONPATH=. pytest -q tests/test_config_schema_direct.py` → passed

### New (this slice)

- Added app factory at `server/asgi.py:create_app()` and replaced `server/app.py` with a thin shim (`app = create_app()`) in the backend worktree to preserve import compatibility.
- Extracted initial routers/services and wired them into the factory:
  - Routers: `server/routers/{traces,config,repos,editor}.py`
  - Services: `server/services/{traces,config_store,editor}.py`
  - Routers are included alongside existing `feedback`, `reranker_info`, `alerts`, and `monitoring` routers.
- Expanded `GET /api/config-schema` to include additional tunables: `LANGGRAPH_FINAL_K`, optional thresholds `CONF_TOP1|CONF_AVG5|CONF_ANY` (when present), and optional `RERANK_TOP_K`.
- Added smoke tests in the worktree:
  - `pytest -q tests/routers/test_traces_direct.py` (list/latest traces) — green
  - `pytest -q tests/routers/test_config_direct.py` (masked secrets + schema keys) — green
  - `pytest -q tests/routers/test_editor_direct.py` (health JSON + settings round-trip) — green

Notes:
- Endpoints return JSON errors and degrade gracefully (no crashes if files/services are missing).
- No absolute paths; all file I/O uses `common.paths` helpers.


This inventory should be ticked off as each router is extracted, with tests green before proceeding.

## Special Cases

- Editor reverse proxy requires preserving header‑stripping and WebSocket proxy behavior. Keep helpers in `services/editor.py` and test with Playwright (iframe renders) and Python smoke (`/health/editor`).
- Grafana is embedded purely in the GUI; backend does not proxy it. Ensure CSP and iframe friendliness are managed by Grafana config (Compose already sets `GF_SECURITY_ALLOW_EMBEDDING=true`).
- Autotune endpoints currently return stub responses. Do not remove GUI settings; add a backlog item to implement a real autotune service and tests.
   - Once routers/services are complete and tests green, replace remaining references to `server/app.py` with `server/asgi.py:app` and remove the shim.

## CI Gates (Backend)

- ruff + isort + black (or ruff formatter) on changed files.
- mypy type checks with strict optional and disallow‑any‑generics on new modules.
- pytest smoke and focused suites; parallelized.
- import-linter rules to prevent `services` importing `routers` and to guard cyclic deps.
- ban absolute path strings via a grep/lint rule; retain tests in `tests/test_repo_path_resolution.py`.

## What‑Ifs and Mitigations

- Endpoint regression: keep comprehensive smoke tests; also snapshot JSON responses for critical endpoints.
- Env override surprises: registry provides explicit defaults; `/api/env/reload` supported.
- Secrets leakage: always mask in responses; never log secret values; redact in errors and traces.
- Qdrant unavailability: degrade gracefully — return informative error; CI can mock or skip perf paths.
- Docker bind mounts: after code or static mount changes run the compose refresh command (see policy below).

## Branch Workflow and Cutover

- Work only on `development`. Open PR → `staging`; then PR → `main` with required checks.
- After modularization stabilizes, update docs and deprecate the legacy `server/app.py` entrypoint in a separate PR.

## Operations Snippets

- Docker Compose Refresh (per policy):
  ```bash
  docker compose -f docker-compose.services.yml up -d --force-recreate api
  ```

## Definition of Done (Backend)

- `server/app.py` reduced to ≤200 lines or fully replaced by `server/asgi.py` with equivalent functionality.
- All routes live under `routers/*` and logic under `services/*`.
- `SettingsRegistry` present and powering `/api/config-schema` and internal config.
- Pytests green (incl. smoke) and CI gates enforced.
