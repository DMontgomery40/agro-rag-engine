# Deep Dive: Reranker Stack Surface Area

> **Agents:** treat this inventory as mandatory reading alongside [`AGENTS.md`](../AGENTS.md) before attempting any change. The global rules there govern how you apply the findings here.

_Last updated: 2025-10-23_

## 1. End-to-End Flow Today

1. **Search invocation** (`retrieval/hybrid_search.py`)
   - `search_routed_multi` → `ce_rerank` → `rerank_results`.
   - Depending on env flags, uses local `rerankers.Reranker`, HuggingFace pipeline (trusts remote code), or Cohere API.
   - Adds LangTrace spans (`reranker.rank`).
   - After reranking, hybrid search still applies bonuses for discriminative keywords, cards, path boosts.

2. **HTTP search layer** (`server/app.py:/search`)
   - Re-runs scoring through `server.reranker.rerank_candidates` when `AGRO_RERANKER_ENABLED=1`.
   - `doc_id` format: `<file_path>:<start>-<end>`; text snippet expected for scoring.

3. **Telemetry** (`server/telemetry.log_query_event`)
   - Writes `data/logs/queries.jsonl` with absolute paths + truncated text. Used by mining scripts and cost dashboards.

4. **Training pipeline**
   - `scripts/mine_triplets.py` (logs) & `scripts/mine_from_golden.py` (bootstrap) build JSONL triplets.
   - `scripts/train_reranker.py` uses `InputExample` + BCE loss (deprecated API).
   - `scripts/eval_reranker.py` runs MRR/Hit@K on holdout within same JSONL.
   - `scripts/promote_reranker.py` compares candidate vs current (requires ≥ delta), updates symlinks.
   - `/api/reranker/*` endpoints spawn these scripts, stream stdout to GUI.

5. **GUI** (`gui/js/reranker.js`, `gui/index.html`)
   - “Learning Reranker” subtab wires buttons to endpoints.
   - Expects `GET /api/reranker/info`, `/status`, `/logs`, `/triplets/count`, `/baseline/*`, `/nohits`, `/smoketest`, etc.
   - Live terminal widget consumes SSE-like output (manual polling of status/`live_output`).

6. **Monitoring & Ops**
   - Grafana + Prometheus rules track reranker margins (`agro_reranker_margin_abs_bucket`).
   - Cron instructions in docs schedule nightly `mine → train → promote` pipeline.
   - Smoke endpoint `/api/reranker/smoketest` logs test queries.

## 2. Module Inventory

| Area | File(s) | Notes |
|------|---------|-------|
| Retrieval reranker | `retrieval/rerank.py` | Handles backend selection, normalization, tracing, snippet length envs. Uses `rerankers` package. |
| API reranker | `server/reranker.py`, `server/reranker_info.py`, `server/app.py` | Duplicated scoring logic (CrossEncoder). Exposes config info endpoint. |
| Endpoints | `server/app.py` | Mine/train/evaluate/baseline/cron/logs/costs/nohits/click; each spawns subprocess, uses shared `_RERANKER_STATUS`. |
| Training scripts | `scripts/mine_triplets.py`, `mine_from_golden.py`, `train_reranker.py`, `eval_reranker.py`, `promote_reranker.py` | Expect JSONL with absolute doc paths; rely on `sys.executable` & repository cwd. |
| GUI module | `gui/js/reranker.js` | 900+ lines: feedback UX, status polling, baseline compare, smoke test button, cron controls. |
| Config surfaces | `.env`, `ui/ALL_KNOBS.yaml`, docs (`website/docs/features/learning-reranker.md`), GUI `<input name="AGRO_RERANKER_*>`. |
| Tests | Playwright (`tests/gui/reranker_info.spec.ts`, `tests/gui/reranker_nohits.spec.ts`, etc.), smoke (`tests/smoke/test_reranker_default_model.py`), doc smoke ensures script load order. |
| Docs & Internal notes | `internal_docs.md/reranker-phase2.md`, website docs, quickstarts. |
| Metrics/Infra | `infra/prometheus-alert-rules.yml`, `telemetry/grafana_dash.py`. |

## 3. Environment Variable Map

| Variable | Area | Impact |
|----------|------|--------|
| `RERANK_BACKEND`, `RERANKER_MODEL`, `RERANK_INPUT_SNIPPET_CHARS`, `COHERE_*` | Retrieval path | Changing default/backends requires updating docs, UI messaging, tests, and potential wrappers. |
| `AGRO_RERANKER_ENABLED` | API/GUI | Controls second rerank stage; GUI status panel reflecting on/off. |
| `AGRO_RERANKER_MODEL_PATH` | API loader, GUI text field, docs | Used in CLI scripts, baseline commands, tests expect input field name. |
| `AGRO_RERANKER_ALPHA`, `AGRO_RERANKER_TOPN`, `AGRO_RERANKER_BATCH`, `AGRO_RERANKER_MAXLEN` | API scoring & UI | Field names verified by Playwright tests. |
| `AGRO_RERANKER_RELOAD_ON_CHANGE`, `AGRO_RERANKER_RELOAD_PERIOD_SEC` | Hot reload | Unifying loaders needs to respect these semantics or deprecate with migration. |
| `AGRO_RERANKER_MINE_MODE`, `AGRO_RERANKER_MINE_RESET`, `AGRO_TRIPLETS_PATH` | Mining script + UI selects | Tests assert presence of selects. |
| Logging envs (`AGRO_LOG_PATH`, `AGRO_RERANKER_MINE_MODE`) | Mining + telemetry | Changing log shape requires migration plan. |

## 4. UI Coupling

- IDs / selectors such as `#reranker-info-panel`, buttons `#reranker-mine-btn`, `#reranker-train-btn`, inputs named `AGRO_RERANKER_*` are hard-coded into Playwright tests and `gui/js/reranker.js`.
- Script load order enforced by smoke tests (`tests/smoke/test_chat_ui_fixes.py`).
- Reranker panel expects JSON fields like `live_output`, `event_id`, `metrics.mrr`, `baseline.path`. Any API contract change must update UI + tests simultaneously.
- Animations/subtabs rely on `data-subtab="learning-ranker"` (note naming mismatch vs “learning reranker”).

## 5. Data & Storage Dependencies

- `data/logs/queries.jsonl`: absolute paths, `retrieval` array with `doc_id`, `text`, `clicked`. Consumers include `scripts/mine_triplets.py`, `/api/reranker/{logs,count,download,costs,nohits}`, alerts (`server/alerts.py`), and historical scripts under `scripts/archive/`. Any schema change must cover each reader.
- `data/training/triplets.jsonl`: read/written by `scripts/mine_triplets.py`, `scripts/train_reranker.py`, `scripts/eval_reranker.py`, `scripts/promote_reranker.py`, and `/api/reranker/triplets/count`. No other analytics currently depend on it, but GUI forms and Playwright tests assert the default path.
- Model directories `models/cross-encoder-agro`, `models/cross-encoder-current`, plus `.baseline`/`.backup` copies are referenced in promotion APIs, Cron setup, GUI baseline actions, and docs. Layout changes must update every consumer simultaneously.
- Changing to HuggingFace datasets/Trainer output requires migrating Cron instructions in `internal_docs.md/reranker-phase2.md`, website docs, and GUI hints that mention the JSONL workflow.

## 6. Test & CI Surface

- Python smoke test ensures defaults (`cross-encoder/ms-marco-MiniLM-L-12-v2`) remain when env unset.
- Playwright specs cover info panel, no-hits table, reranker buttons, Cron forms, baseline compare, error states.
- Additional GUI regression suites reference reranker under “learning ranker”.
- Tests under `tests/test_*` (JS/TS) ensure UI features from prior bugfixes remain. Many new tests exist for chat/mobile; watch for potential reranker interactions if `AGRO_RERANKER_ENABLED` toggles them.

## 7. Observability & External Docs

- `server/metrics.py` defines Prometheus counters/histograms (including `agro_reranker_margin_abs`, `agro_reranker_winner_total`). Currently, only the archived `scripts/archive/generate_metrics.py` and manual instrumentation call `record_canary`; the evaluation endpoint does not yet emit margin metrics. Refactor must add explicit calls when evaluations run.
- `MetricsMiddleware` in `server/metrics.py` wraps FastAPI routes, so `/search` and `/api/reranker/*` already contribute to generic latency/error counters.
- Grafana dashboards (`telemetry/grafana_dash.py`) visualise the Prometheus series; alert rules in `infra/prometheus-alert-rules.yml` expect those series to exist.
- Docs: Website (`website/docs/features/learning-reranker.md`) and internal notes (`internal_docs.md/reranker-phase2.md`) instruct users to run the existing scripts/UI. Any command or env rename must update both.
- External references to keep nearby: SBERT docs, HuggingFace datasets (see `00-vision.md` and `03-runbooks/training.md` links). Keep these current so agents can relearn APIs after context resets.

## 8. Automation & Cron Touchpoints

- `/api/reranker/cron/setup` and `/api/reranker/cron/remove` inside `server/app.py` mutate the **system crontab** (via `crontab -l` updates). They install commands that run `scripts/mine_triplets.py && scripts/train_reranker.py && scripts/eval_reranker.py`. Refactors must either maintain CLI parity or migrate the cron payload.
- Internal docs replicate those cron lines; see `internal_docs.md/reranker-phase2.md` and `internal_docs.md/reranker-implementation-notes.md`.
- No GitHub workflow currently runs these scripts. CI references to reranker code appear only in doc guard and Playwright suites.

## 9. Breakage Forecast (when refactoring)

| Planned Change | Risk Surface | Mitigation |
|----------------|--------------|------------|
| Unify runtime reranker (remove duplicate CrossEncoder) | `/search` response structure, env defaults (`AGRO_RERANKER_*` vs `RERANKER_MODEL`), tracing integration, tests expecting certain blend behavior. | Introduce shared loader module with backward-compatible env mapping; update tests & UI to read from single source. Incrementally gate via feature flag. |
| Sanitize log paths / dataset schema | Mining script assumptions, `/api/reranker/costs`, analytics using absolute paths, docs describing dataset. | Write migration script to convert existing logs/triplets; update consumers to new schema; document change. |
| Switch to HuggingFace `datasets.Dataset` + Trainer | `scripts/train_reranker.py` CLI options, docs, Cron instructions, `/api/reranker/train` capturing stdout, evaluation script expecting JSONL. | Build new trainer script alongside legacy, toggle via flag; update UI to collect new parameters only once backend ready; ensure subprocess output still human-readable. |
| Rename “learning reranker” terminology | GUI labels, tests, docs, Docusaurus pages, `ui/ALL_KNOBS.yaml`, website nav. | Stage rename after functionality stabilized; update tests + docs simultaneously. |
| Deprecate unused `/api/reranker/*` endpoints | GUI hooks, Playwright tests, docs referencing them. | Inventory actual usage; mark with warnings before removal; update UI to use new endpoints or remove controls. |
| Change model directory layout | Promotion/baseline scripts, docs, Cron job strings, tests referencing default path. | Provide migration script; ensure doc guard reminds to update instructions. |

## 10. Resolved Research Questions

- **Prometheus metrics** — Defined in `server/metrics.py`. Currently only generic request metrics are emitted automatically; reranker-specific histograms (`record_canary`) run only via archived scripts. When we unify evaluation, add explicit metric emission.
- **External automation** — The only automated scheduler is the crontab written by `/api/reranker/cron/setup`. No GitHub workflows call the scripts directly; local agents or cron do.
- **Triplet dataset consumers** — No analytics beyond the training/eval scripts use `data/training/triplets.jsonl`. GUI tests & forms enforce the default path, so migrations need UI/test updates but no downstream ETL changes.

## 11. Suggested Next Steps

1. **Telemetry audit**: enumerate every reader/writer for `data/logs/queries.jsonl` & `data/training/triplets.jsonl` (list above) and design a schema migration and validation strategy.
2. **Shared loader design**: sketch a new module (`reranker/loader.py`) that maps both env families (`RERANKER_*` & `AGRO_RERANKER_*`) to one loader with tracing hooks. Prototype behind feature flag for retrieval first.
3. **API contract inventory**: document JSON payloads for `/api/reranker/*` (status, baseline, costs, cron) so we can replace subprocess output cleanly (consider long-running task queue).
4. **Metrics plan**: wire evaluation/promotion steps to `record_canary` and document expected Prometheus series/output ranges so dashboards stay intact.
5. **Test catalogue**: create a manifest of all Playwright and smoke tests touching reranker features (IDs listed above) to update in lockstep with UI renames.

## 10. Suggested Next Steps

1. **Telemetry audit**: trace all writes/reads of `data/logs/queries.jsonl` and `data/training/triplets.jsonl` to plan schema migration.
2. **Shared loader prototype**: create module (e.g., `reranker/loader.py`) with environment compatibility; update retrieval path first behind feature flag.
3. **Contract inventory**: document JSON shapes for `/api/reranker/*` to ease rewrites (possibly moving to async tasks instead of subprocess lines).
4. **Metrics validation**: verify Grafana/Prometheus expectations when replacing scoring logic.
5. **Test catalogue**: list all Playwright specs hitting reranker tab for easier updates when UI renames happen.

This deep dive should be updated as we discover additional dependencies during implementation.
