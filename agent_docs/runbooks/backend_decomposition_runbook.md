# Runbook: Backend Decomposition Execution

This runbook drives the extraction of `server/app.py` into routers/services with a settings registry, without breaking existing behavior.

## Preconditions

- Tests run locally: `pytest -q` (or targeted smoke) passes on the current branch
- Agree on the initial router breakdown and filenames (see plan)

## Steps

1) App factory
- Add `server/asgi.py` with `create_app()` wiring middleware, metrics, and mounts
- Keep `server/app.py` exporting `app = create_app()`; do not remove legacy yet

2) Extract read‑only routes first
- Move `/`, static mounts, `/api/traces*`, `/api/repos*` into `routers/`
- Add `services/traces.py`, `services/config_store.py`
- Run tests; update imports if necessary

3) Extract config endpoints
- Move `/api/config` GET/POST and `/api/secrets/ingest` to `routers/config.py`
- Migrate file IO to `services/config_store.py`; add atomic writes and backup logic (preserve current behavior)

4) Introduce `SettingsRegistry`
- Define registry in `core/settings.py` with metadata for all envs used by the app (types, defaults, validators)
- Add `GET /api/config-schema` using the registry; generate JSON Schema + UI hints

5) Extract search/answer/chat
- Create `routers/search.py` and `services/rag.py` to wrap `search_routed_multi` and LangGraph app
- Include `/api/chat` with proper env override scoping and logging

6) Extract keywords
- Create `routers/keywords.py` and `services/keywords.py` from the current generator code; parametrize via registry

7) Profiles, costs, indexing, semantic boosts
- Extract `/api/profiles*`, `/api/profile/autoselect`, `/api/cost/*`, `/api/index/*`, and `/api/cards/*` into routers/services

8) Onboarding and editor
- Extract `/api/onboarding/*`, `/health/editor`, `/api/editor/*`, and `/editor` proxy to dedicated router/service

9) Docker, MCP, reranker admin, evals, gitmeta
- Move docker, MCP HTTP bridge, reranker admin, evals, and git metadata/hooks to routers/services

10) Cleanup
- Remove dead imports from `server/app.py`; reduce it to a thin shim or replace entrypoint with `server/asgi.py`

## Testing & Verification

- Run smoke tests locally after each extraction chunk: `pytest tests/smoke -q`
- Ensure `tests/test_repo_path_resolution.py` remains green (no absolute paths)
- Add focused tests for registry serialization and config apply path

## Rollback

- If a regression is found, revert the last chunk (routers/services files) and restore `server/app.py` state; tests should guide the delta
