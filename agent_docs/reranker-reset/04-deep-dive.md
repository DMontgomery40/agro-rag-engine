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

> Agents: revisit [`AGENTS.md`](../AGENTS.md) before touching any of these paths. Accessibility rules require GUI + backend parity for every change listed here.

### 5.1 Query log writers (`data/logs/queries.jsonl`)

| Producer | Location | Trigger | Notes |
|----------|----------|---------|-------|
| Search endpoints | `server/app.py:359`, `server/app.py:507`, `server/app.py:625` | `/answer`, `/api/chat`, `/api/search` | Call `log_query_event` with truncated snippet text, absolute `doc_id`, latency, cost, rewritten query. |
| Reranker smoketest | `server/app.py:3559-3561`, `server/app.py:3527-3554` | `/api/reranker/smoketest` | Logs synthetic event using same schema, marks route for analytics. |
| Telemetry helpers | `server/telemetry.py:24-63` | Shared helper | Handles `AGRO_LOG_PATH`, ensures folder exists, appends JSON lines. |
| Feedback logging | `server/telemetry.py:66-83`, `server/app.py:3637-3643` | `/api/reranker/click`, thumbs/stars UI | Emits `type="feedback"` rows with `event_id` + payload. Mining script joins on `event_id`. |

### 5.2 Query log readers

| Consumer | Location | Purpose | Schema assumptions |
|----------|----------|---------|--------------------|
| Mining script | `scripts/mine_triplets.py:16-138` | Generates triplets from query/feedback events. | Requires `doc_id`, `text`, `clicked`, `ground_truth_refs`, stable `event_id`. |
| GUI log tooling | `server/app.py:3340-3389` | `/api/reranker/logs*` endpoints for table, download, clear. | Reads raw JSON without validation; fails silently on parse errors. |
| Cost + no-hit panels | `server/app.py:3574-3627` | `/api/reranker/costs`, `/api/reranker/nohits`. | Expect `ts`, `cost_usd`, `retrieval` arrays. |
| Alerts dashboard | `server/alerts.py:410-455` | `/monitoring/top-queries`. | Relies on `route`, `client_ip`, `query_raw`. |
| Tests | `tests/smoke/test_miner.py:45-68`, `tests/test_recovered_features.ts:78-111`, Playwright reranker specs | Assert default `AGRO_LOG_PATH`, run miner end-to-end. | Fixtures expect relative default but tolerate overriding ENV. |
| Docs/runbooks | `docs/LEARNING_RERANKER.md`, `website/docs/features/learning-reranker.md`, `internal_docs.md/reranker-phase2.md` | Teach users to tail/mine logs. | Need updates when schema/paths change for ADA compliance. |
| Legacy scripts | `scripts/archive/`, `internal_docs.md/reranker-implementation-notes.md` | Historical references; still used for manual ops. | Note absolute paths hard-coded. |

### 5.3 Triplet dataset consumers (`data/training/triplets.jsonl`)

| Consumer | Location | Purpose |
|----------|----------|---------|
| `/api/reranker/triplets/count` | `server/app.py:3352-3362` | GUI badge showing current triplet count. |
| Training CLI | `scripts/train_reranker.py:14-104` | Loads JSONL → CrossEncoder training pairs. |
| Evaluation CLI | `scripts/eval_reranker.py:12-83` | Computes MRR/Hit@K on holdout. |
| Promotion CLI | `scripts/promote_reranker.py:7-96` | Compares candidate/current models using full dataset. |
| GUI inputs/tests | `gui/index.html:3622-3640`, `tests/test_recovered_features.ts:84-95` | Default placeholder/value for `AGRO_TRIPLETS_PATH`. |
| Cron builder | `server/app.py:3397-3440` | Injects triplet path into scheduled command string. |

Historical docs and smoke tests assume triplets share `doc_id` semantics with query logs (concatenated absolute path + line span). Migration must keep them in sync.

### 5.4 Model storage

- `models/cross-encoder-agro`, `models/cross-encoder-current`, `.baseline`, `.backup` directories are touched by `/api/reranker/baseline/*`, `/api/reranker/rollback`, `scripts/promote_reranker.py`. Any renaming requires audit of promotion logs (`data/logs/model_promotions.log`) and GUI baseline copy.
- Releases stored in `models/releases/` with timestamped folders; symlink updates assume POSIX semantics. Windows support would need alternative.

### 5.5 Dataset schema issues (2025-10-24)

- Absolute filesystem prefixes leak host info and break Docker mounts.
- `doc_id` couples file path + line range into a single string; parsing is ad hoc across readers.
- Logs lack explicit `repo` metadata; multi-repo support infers from `doc_id`.
- Feedback rows contain no retrieval snapshot, so mining must re-read the original query event—`event_id` stability is mandatory.

### 5.6 Migration strategy

1. Emit `schema_version=2`, `doc_path_rel`, `repo_slug` in `log_query_event`/`log_feedback_event` while keeping legacy keys for consumers not yet updated.
2. Normalize writers to strip absolute prefixes via `common.paths.repo_root()`, with guarded fallback when entries point outside repo (plugins).
3. Update mining, costs/no-hits, alerts, and GUI endpoints to prefer new fields but remain backward compatible.
4. Provide a maintenance script to rewrite existing JSONL files into v2, backing up originals (`*.legacy`) and validating counts before/after.
5. Extend smoke + Playwright suites to assert presence of `schema_version` and relative doc paths after migration.
6. Refresh docs/runbooks with migration instructions and highlight rollback steps for operators.

### 5.7 Reference material

- JSON Lines format — <https://jsonlines.org/>
- SBERT CrossEncoder training overview — <https://www.sbert.net/docs/cross_encoder/training_overview.html>
- SBERT CrossEncoder loss functions — <https://www.sbert.net/docs/cross_encoder/loss_overview.html>
- Hugging Face datasets JSON loader — <https://huggingface.co/docs/datasets/v2.16.1/en/loading#json-files>
- Prometheus histogram guidance — <https://prometheus.io/docs/practices/histograms/>
- Codex CLI profiles/rules — see [`tooling/codex-cli.md`](tooling/codex-cli.md)


## 6. Test & CI Surface

### 6.1 Reranker-specific coverage

| Suite | Path | Exercised components | Notes |
|-------|------|----------------------|-------|
| Smoke | `tests/smoke/test_reranker_default_model.py` | `server.reranker.get_reranker_info`, `retrieval.rerank.DEFAULT_MODEL` | Verifies default env resolution when vars unset; stubs heavy deps. |
| Smoke | `tests/smoke/test_miner.py` | `scripts/mine_triplets.py` CLI, JSONL schema | Confirms dedup + `AGRO_LOG_PATH` override; writes to repo `data/training/triplets.jsonl`. |
| Playwright | `tests/gui/reranker_info.spec.ts` | GUI info panel (`/api/reranker/info`) | Asserts model path placeholder & visible info card. |
| Playwright | `tests/gui/reranker_nohits.spec.ts` | `/api/reranker/nohits` UI states | Mocks success/empty/error to ensure accessibility copy. |
| Reference | [`06-test-catalogue.md`](06-test-catalogue.md) | Full manifest of reranker-related tests | Keep this file updated in lockstep with new suites. |

### 6.2 Coverage gaps / TODO

- No automated exercise of `/api/reranker/mine|train|evaluate|status|baseline|cron|logs|smoketest`; GUI relies on them but tests do not stub responses today.
- Cron manipulation via `crontab` is untested; add integration test once shared loader + async jobs land.
- Prometheus metrics (`record_canary`, `agro_reranker_margin_abs`) lack regression coverage; plan to add once Section 13 metrics work is implemented.

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

1. ✅ **Telemetry audit** — Section 5 documents every writer/reader plus the migration plan; treat it as the canon moving forward.
2. **Shared loader design** — [`05-shared-loader.md`](05-shared-loader.md) captures the implementation plan; Phase 0 config module + unit tests are now in place (`reranker/config.py`).
3. **API contract inventory** — Section 13 tables plus future async plan; validate before rewriting subprocess orchestration.
4. **Metrics plan** — [`07-metrics-plan.md`](07-metrics-plan.md) outlines Prometheus instrumentation; integrate after loader Phase 1.
5. **Test catalogue** — [`06-test-catalogue.md`](06-test-catalogue.md) tracks suites; expand with new API-level tests during refactors.

## 12. Shared Loader Strategy (Draft)

> Agents: do **not** ship code until every GUI binding that manipulates reranker config has been cross-checked against [`AGENTS.md`](../AGENTS.md). The shared loader must keep existing environment knobs visible and accessible.

### 12.1 Objectives

- Eliminate the divergence between retrieval-side envs (`RERANK_*`) and API-side envs (`AGRO_RERANKER_*`) so both paths resolve the same model, backend, and scoring parameters.
- Provide a single source of truth that GUI, CLI scripts, and tests can consume without duplicating fallback logic.
- Enable incremental rollout behind an explicit feature flag so we can revert quickly if Playwright or smoke tests surface regressions.

### 12.2 Canonical configuration fields

| Canonical field | Legacy env(s) | Notes / resolution |
|-----------------|---------------|--------------------|
| `enabled` | `AGRO_RERANKER_ENABLED`, `RERANK_BACKEND` | Treat falsy `enabled` or `backend=none/off` as disabled. Loader should expose both a boolean and the resolved backend string. |
| `backend` | `RERANK_BACKEND`, `COHERE_API_KEY` | Values: `local`, `cohere`, `none`. If cohere key missing, auto-fallback to `local`. |
| `local_model_dir` | `AGRO_RERANKER_MODEL_PATH` | Accept HF model IDs or local paths; resolve relative to repo root. |
| `hf_model_id` | `RERANKER_MODEL`, `AGRO_RERANKER_MODEL_PATH` | Use when `local_model_dir` points to HF ID or does not exist locally. |
| `alpha` | `AGRO_RERANKER_ALPHA` | Blend coefficient for CrossEncoder vs base retrieval score. |
| `top_n` | `AGRO_RERANKER_TOPN`, `COHERE_RERANK_TOP_N` | Local + Cohere share a `top_n` cap; store separate values if necessary (`top_n_local`, `top_n_cloud`). |
| `batch_size` | `AGRO_RERANKER_BATCH` | Retrieval and API training use same batch default (16). |
| `max_length` | `AGRO_RERANKER_MAXLEN` | Applies to CrossEncoder inputs; retrieval currently hard-codes 512. |
| `snippet_chars` | `RERANK_INPUT_SNIPPET_CHARS` | Controls truncation for local/HF reranker; cohere has its own (`RERANK_INPUT_SNIPPET_CHARS` or default 700). |
| `reload` | `AGRO_RERANKER_RELOAD_ON_CHANGE`, `AGRO_RERANKER_RELOAD_PERIOD_SEC` | Loader should encapsulate hot-reload policy so both retrieval and API reuse it. |
| `cohere_model` | `COHERE_RERANK_MODEL` | Cloud fallback identifier. |
| `cohere_api_key` | `COHERE_API_KEY` | Store separately and mark as sensitive; loader only confirms presence. |
| `metrics_label` | derived | Provide consistent label for tracing/metrics (e.g., `cross-encoder:local`, `cohere:rerank-3.5`). |

### 12.3 Proposed module surface (`retrieval/shared_loader.py` or `reranker/config.py`)

```python
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

@dataclass
class RerankerSettings:
    backend: Literal["local", "cohere", "none"]
    enabled: bool
    local_model_dir: Optional[Path]
    hf_model_id: str
    alpha: float
    top_n_local: int
    top_n_cloud: int
    batch_size: int
    max_length: int
    snippet_chars: int
    cohere_model: str
    cohere_api_key_present: bool
    reload_on_change: bool
    reload_period_sec: int
    source_env: dict[str, str]  # for diagnostics

def load_settings(*, use_shared_loader: bool | None = None) -> RerankerSettings: ...
def resolve_model_path(cfg: RerankerSettings) -> Path | str: ...
def as_env(cfg: RerankerSettings) -> dict[str, str]: ...
```

- `load_settings` reads both env families, normalises paths relative to repo root, and returns a dataclass.
- `resolve_model_path` picks usable model target for CrossEncoder (`Path` if local dir exists, else HF ID string).
- `as_env` allows scripts to print the derived configuration (for debugging) without mutating `os.environ` directly.

### 12.4 Feature flag rollout

1. **Phase 0 – dormant**  
   - Implement `load_settings` + unit tests under `tests/unit/test_reranker_settings.py`.  
   - Add env flag `AGRO_RERANKER_SHARED_LOADER=0` (default).  
   - Document module usage in `03-runbooks/training.md` and CLI references.

2. **Phase 1 – retrieval opt-in**  
   - Update `retrieval/rerank.py` + `retrieval/hybrid_search.py` to call loader when flag set.  
   - Keep legacy code path when flag = 0.  
   - Add smoke test that enables flag, runs `/search`, and asserts rerank scores identical (within tolerance) to legacy path.

3. **Phase 2 – API opt-in**  
   - Update `server/reranker.py` and `/api/reranker/info` to consume loader under flag.  
   - Ensure background reload honours `reload_on_change`.  
   - Update Playwright reranker info spec to verify new fields (e.g., displayed backend label).

4. **Phase 3 – CLI + scripts**  
   - Move `scripts/train_reranker.py`, `scripts/eval_reranker.py`, `scripts/promote_reranker.py` to call loader for defaults instead of hard-coded strings.  
   - Update docs + GUI copy simultaneously (ADA compliance).

5. **Phase 4 – flag removal**  
   - Once smoke + Playwright suites pass in CI for multiple runs, flip default to `1`, monitor, then retire legacy code after staging sign-off.

### 12.5 Verification plan

- Extend `tests/smoke/test_reranker_default_model.py` to run twice (flag off/on) and compare config snapshots.
- Add unit tests that simulate mixed env inputs (only `RERANKER_MODEL` set, only `AGRO_RERANKER_MODEL_PATH` set, both set but conflicting) to ensure deterministic resolution.
- Hook loader into Prometheus metrics: expose `cfg.metrics_label` so `record_canary` can tag backend in Section 10.
- Update `tests/gui/reranker_info.spec.ts` to assert the GUI displays whichever backend the loader resolved under shared mode.

### 12.6 Risks & mitigations

- **GUI/env drift:** Existing forms post individual env variables. We must keep names unchanged and ensure loader writes updates back (or reads live from `os.environ`) so GUI reflects manual edits.  
  _Mitigation:_ loader should be read-only; POST `/api/config` continues mutating env vars individually.
- **Model path ambiguity:** Some deployments point `AGRO_RERANKER_MODEL_PATH` to an HF ID.  
  _Mitigation:_ loader checks if resolved path exists; if not, treat value as remote model ID and set `local_model_dir=None`.
- **Cohere-only setups:** Retrieval currently short-circuits local rerank when backend=`cohere`; shared loader must preserve this to avoid double-charging API calls.  
  _Mitigation:_ expose `cfg.backend` and ensure both retrieval and API respect it.
- **Hot reload timing:** API hot reload currently polls every `AGRO_RERANKER_RELOAD_PERIOD_SEC`.  
  _Mitigation:_ loader returns the interval so both server + retrieval share scheduling logic; add regression test to verify no double reload.

Third-party references:  
- Sentence Transformers CrossEncoder API — <https://www.sbert.net/docs/package_reference/cross_encoder/index.html>  
- Python `dataclasses` module (structuring config objects) — <https://docs.python.org/3/library/dataclasses.html>

## 13. Reranker API Contracts & Observability (2025-10-24)

> Agents: treat this as the canonical contract list before rewriting endpoints or introducing async workers. Every change must keep GUI + tests accessible per [`AGENTS.md`](../AGENTS.md).

### 13.1 Endpoint matrix

| Method | Endpoint | Request payload | Response shape | Side effects | Callers / deps |
|--------|----------|-----------------|----------------|--------------|----------------|
| POST | `/api/reranker/mine` (`server/app.py:3095-3147`) | none | `{"ok": bool, "message": str?,"error": str?}` | Spawns thread, runs `scripts/mine_triplets.py`, streams stdout into `_RERANKER_STATUS["live_output"]`, writes triplets JSONL. | GUI “Mine Triplets” button, Playwright via manual clicks (no mock). |
| POST | `/api/reranker/train` (`server/app.py:3153-3215`) | JSON with optional `epochs`, `batch_size` | Same envelope as mine (`ok`/`error`), updates `_RERANKER_STATUS`. | Runs `scripts/train_reranker.py` (subprocess). | GUI training button (no current automated test). |
| POST | `/api/reranker/evaluate` (`server/app.py:3222-3318`) | none | `{"ok": True, "message": "Evaluation started"}` or error | Runs `scripts/eval_reranker.py`; on success writes `data/evals/latest.json`, updates Prometheus `set_retrieval_quality`. | GUI “Run Evaluation”, baseline compare, docs. |
| GET | `/api/reranker/status` (`server/app.py:3335-3338`) | n/a | `_RERANKER_STATUS` dict | Poll-only; no mutation. | GUI terminal widget polls every few seconds. |
| GET | `/api/reranker/eval/latest` (`server/app.py:3322-3333`) | n/a | `{"metrics": {...}}` or `{"metrics": null}` | Reads `data/evals/latest.json`. | GUI scoreboard, docs. |
| GET | `/api/reranker/logs/count` (`server/app.py:3340-3350`) | n/a | `{"count": int}` | Reads telemetry JSONL. | GUI badges, tests expect numeric string. |
| GET | `/api/reranker/triplets/count` (`server/app.py:3352-3362`) | n/a | `{"count": int}` | Reads `data/training/triplets.jsonl`. | GUI badge. |
| GET | `/api/reranker/logs` (`server/app.py:3364-3376`) | n/a | `{"logs": [obj], "count": int}` | Returns last 100 entries; no pagination. | GUI table (manual). |
| GET | `/api/reranker/logs/download` (`server/app.py:3378-3384`) | n/a | File download (JSONL) | Streams file via `FileResponse`. | GUI download button. |
| POST | `/api/reranker/logs/clear` (`server/app.py:3386-3395`) | n/a | `{"ok": bool, "error"?: str}` | Deletes telemetry log file. | GUI “Clear logs”. |
| POST | `/api/reranker/cron/setup` (`server/app.py:3397-3412`) | `{"time": "HH:MM"}` | `{"ok": bool, "time": str}` or `{"ok": False, "error": str}` | Mutates system crontab via `subprocess`. | GUI cron scheduler; docs instruct usage. |
| POST | `/api/reranker/cron/remove` (`server/app.py:3418-3436`) | none | `{"ok": bool, "error"?: str}` | Removes cron entries. | GUI. |
| POST | `/api/reranker/baseline/save` (`server/app.py:3442-3460`) | none | `{"ok": bool, "path": str}` | Persists `_RERANKER_STATUS["result"]` to `data/evals/reranker_baseline.json`, copies model dir to `.baseline`. | GUI baseline button, docs. |
| GET | `/api/reranker/baseline/compare` (`server/app.py:3463-3499`) | none | `{"ok": bool, "baseline": {...}, "current": {...}, "delta": {...}}` or error | Parses metrics from stdout text; no metrics emitted. | GUI charts. |
| POST | `/api/reranker/rollback` (`server/app.py:3503-3524`) | none | `{"ok": bool, "error"?: str}` | Moves model directories/symlinks. | GUI rollback button. |
| POST | `/api/reranker/smoketest` (`server/app.py:3527-3571`) | `{"query": str}` | `{"ok": bool, "logged": bool, "results_count": int, "reranked": bool, "event_id": str}` | Runs `search_routed_multi`, logs event via telemetry. | GUI smoke test card. |
| GET | `/api/reranker/costs` (`server/app.py:3574-3598`) | n/a | `{"total_24h": float, "avg_per_query": float, "queries_24h": int}` | Aggregates telemetry log. | GUI cost widget. |
| GET | `/api/reranker/nohits` (`server/app.py:3610-3629`) | n/a | `{"queries": [ {query, ts} ], "count": int}` | Reads telemetry log. | GUI no-hit list (Playwright coverage). |
| POST | `/api/reranker/click` (`server/app.py:3637-3643`) | `{"event_id": str, "doc_id": str}` | `{"ok": True}` | Appends feedback via `log_feedback_event`. | GUI doc click tracking. |
| GET | `/api/reranker/info` (`server/reranker_info.py:7-16`) | n/a | `{"enabled": bool, "path": str, ...}` | Triggers lazy model load. | GUI info panel. |
| GET | `/api/reranker/available` (`server/reranker_info.py:18-52`) | n/a | `{"options": [...], "count": int}` | Inspects env to show available rerankers (local/cohere/none). | GUI dropdown(s). |

### 13.2 `_RERANKER_STATUS` contract

Structure (per `server/app.py:3086-3147`):

```json
{
  "running": false,
  "task": "mining|training|evaluating",
  "progress": 0-100,
  "message": "human-readable",
  "result": {"ok": true, "output": "..."} | {"ok": false, "error": "..."} | null,
  "live_output": ["stdout line", ...]  // truncated to last 1000 entries
}
```

- GUI polls `/api/reranker/status` every ~2s to update progress bars and terminal widget.
- Baseline save/compare expect `result["output"]` to contain lines like `MRR@all:` and `Hit@K:`; regex parsing happens in-app.
- When migrating to async queue, preserve field names to avoid breaking Playwright selectors.

### 13.3 Metrics integration TODO

- Current evaluation flow only calls `set_retrieval_quality` (Gauge) upon success. `record_canary` and histogram `agro_reranker_margin_abs` remain unused.
- Plan (post-shared-loader):
  1. Parse candidate vs baseline MRR/Hit@K inside evaluation or promotion step.
  2. Call `record_canary(provider="cross-encoder", model=cfg.metrics_label, passed=(delta>=0), margin=delta, winner=...)`.
  3. Include backend label from shared loader so Prometheus distinguishes local vs Cohere runs.
  4. Add smoke test (backend) verifying histogram increments when evaluation completes.
- Update Grafana dashboards (`telemetry/grafana_dash.py`) to chart new metrics once emitted.

### 13.4 Testing implications

- Need Playwright fixtures for `/api/reranker/status` streaming (simulate `live_output` growth) and baseline compare responses containing `delta`. Add to new test catalogue (Section 6).
- Add API-level smoke tests (pytest) that hit `/api/reranker/smoketest`, `/api/reranker/costs`, etc., with temporary log fixtures to guarantee JSON shapes.
- Cron endpoints require non-destructive mode in tests (use tmp crontab via `crontab -l` mock); document gating to avoid clobbering host schedule.

### 13.5 References

- FastAPI background threads vs `BackgroundTasks` — <https://fastapi.tiangolo.com/advanced/background-tasks/>
- Python `subprocess.Popen` streaming patterns — <https://docs.python.org/3/library/subprocess.html#subprocess.Popen>
- Prometheus client histogram usage — <https://prometheus.io/docs/practices/histograms/>
