# Progress Log — UI + Backend Migration (Worktrees)

This log helps any agent resume work mid-stream. Work happens in feature worktrees; do not switch the main editor branch.

## Backend (feature/backend-modularization)

- Implemented endpoints:
  - `GET /api/pipeline/summary` — repo/local mode, branch, retrieval, reranker, enrichment, generation, health
  - `GET /api/config-schema` — JSON Schema + UI metadata + current values
- Location: `.worktrees/feature-backend-modularization/server/app.py`
- Tests:
  - Direct import: `PYTHONPATH=. pytest -q tests/test_pipeline_summary_direct.py`
  - Direct import: `PYTHONPATH=. pytest -q tests/test_config_schema_direct.py`

### New (this slice)
- Introduced app factory middleware for request IDs + JSON error handling:
  - `.worktrees/feature-backend-modularization/server/asgi.py` adds `X-Request-ID` and 500 JSON body with `request_id`
  - Tests: `tests/test_request_id_header.py` (direct import) — 2 passed
- Began router extraction per vertical slice 1:
  - Added `server/routers/config.py` (moves `/api/config-schema`)
  - Added `server/routers/pipeline.py` (moves `/api/pipeline/summary`)
  - `create_app()` includes these routers; prior tests still pass

### New (this slice)
- App factory created at `.worktrees/feature-backend-modularization/server/asgi.py` and `server/app.py` shimmed to `app = create_app()`.
- Extracted initial routers/services and wired into the factory:
  - Routers: `server/routers/{traces,config,repos,editor}.py`
  - Services: `server/services/{traces,config_store,editor}.py`
- Config schema expanded to include `LANGGRAPH_FINAL_K`, optional thresholds `CONF_TOP1|CONF_AVG5|CONF_ANY` (when present), and optional `RERANK_TOP_K`.
- New smoke tests (worktree):
  - `PYTHONPATH=. pytest -q tests/routers/test_traces_direct.py`
  - `PYTHONPATH=. pytest -q tests/routers/test_config_direct.py`
  - `PYTHONPATH=. pytest -q tests/routers/test_editor_direct.py`

How to run:
```
cd .worktrees/feature-backend-modularization
PYTHONPATH=. pytest -q tests/test_pipeline_summary_direct.py
PYTHONPATH=. pytest -q tests/test_config_schema_direct.py
PYTHONPATH=. pytest -q tests/routers/test_traces_direct.py
PYTHONPATH=. pytest -q tests/routers/test_config_direct.py
PYTHONPATH=. pytest -q tests/routers/test_editor_direct.py
```

## UI (feature/ui-migration)

- Server wiring for SPA:
  - Mounts `web/dist` at `/web`; supports `GUI_CUTOVER=1` redirect from `/` → `/web`
  - Location: `.worktrees/feature-ui-migration/server/app.py`
- Next:
  - Scaffold `web/` (Vite/React/TS/Tailwind) shell with Sidebar/Topbar (VSCode/Grafana) and Dashboard Pipeline Summary card using `/api/pipeline/summary`
  - Add Playwright smoke (nav + a11y + dashboard fields)

### New (this slice)
- Created initial design tokens and global styles (worktree):
  - `.worktrees/feature-ui-migration/web/src/styles/tokens.css`
  - `.worktrees/feature-ui-migration/web/src/styles/global.css`
- Added temporary manual `dist/` for server mount smoke test:
  - `.worktrees/feature-ui-migration/web/dist/index.html`
  - `.worktrees/feature-ui-migration/web/dist/assets/global.css`
- Smoke (direct import):
  - `PYTHONPATH=. pytest -q tests/test_web_mount_direct.py` → passed (serves `/web/` index)

### React Scaffold (in place)
- Scaffolded minimal Vite/React/TS/Tailwind files (not built yet):
  - `web/package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `vite.config.ts`
  - `web/index.html`, `src/main.tsx`, `src/App.tsx`, `src/pages/Dashboard.tsx`
- Dashboard fetches `/api/pipeline/summary` and renders live fields when built. For now, `/web/dist` manual HTML remains as mount smoke until we run `npm run build` in the worktree.

### Backend Slice 3 (Cost & Profiles) - COMPLETE

**Location**: `.worktrees/feature-backend-modularization/`

**Added**:
- Routers: `server/routers/cost.py`, `server/routers/profiles.py`
- Services: `server/services/cost.py`, `server/services/profiles.py`
- Tests: `tests/routers/test_cost_direct.py`, `tests/routers/test_profiles_direct.py`
- Wired in `server/asgi.py`

**Endpoints Extracted**:
- `POST /api/cost/estimate`
- `POST /api/cost/estimate_pipeline`
- `GET /api/profiles`
- `GET /api/profiles/{name}`
- `POST /api/profiles/save`
- `POST /api/profiles/apply`
- `POST /api/profile/autoselect`

**Tests**:
```bash
cd .worktrees/feature-backend-modularization
PYTHONPATH=. pytest -q tests/routers/test_cost_direct.py      # ✅ 1 passed
PYTHONPATH=. pytest -q tests/routers/test_profiles_direct.py  # ✅ 1 passed
```

**Docker Compatibility**:
- Uses `common.paths.data_dir()` for prices (→ `/app/data` in Docker)
- Uses `common.paths.gui_dir()` for fallback (→ `/app/gui`)
- Profile storage: reads/writes both `data/profiles/` and `gui/profiles/`

**Status**: ✅ Code complete, tests green, ready for merge

---

## Notes

- Keep "Semantic Boosts" label in UI (backend routes remain `/api/cards/*`).
- All settings should surface in the schema (no hard-coded values in GUI).
- See `../history/branch_worktree_workflow.md` for worktree usage.
