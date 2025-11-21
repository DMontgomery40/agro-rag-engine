# Unified Reranker Configuration Plan

> **Agents:** Treat [`AGENTS.md`](../AGENTS.md) as mandatory context before touching any reranker runtime logic. Accessibility rules require GUI + backend parity for every change described in this plan.

> **Note:** If you encounter the legacy `AGRO_RERANKER_SHARED_LOADER` variable in `.env`, replace it with `AGRO_RERANKER_SHARED_CONFIG`. The loader still reads the old name for backward compatibility, but documentation and UI only reference the new flag.

_Last updated: 2025-10-24_

## 1. Goals

- Provide a single configuration loader that reconciles **retrieval** (`RERANK_*`) and **API/GUI** (`AGRO_RERANKER_*`) environment variables.
- Guarantee deterministic resolution for reranker backend (local vs Cohere vs none) and model path selection.
- Enable incremental rollout behind an explicit `AGRO_RERANKER_SHARED_CONFIG` feature flag with immediate rollback path.
- Reduce duplicated logic across `retrieval/rerank.py`, `server/reranker.py`, GUI panels, and CLI scripts while keeping existing env names intact for accessibility.

## 2. Scope & Deliverables

1. **Config module** (`reranker/config.py` or similar) exposing:
   - `RerankerSettings` dataclass with resolved fields.
   - `load_settings()`, `resolve_model_target()`, `as_env()` helpers.
2. **Feature flag plumbing** (`AGRO_RERANKER_SHARED_CONFIG`, default `0`).
3. **Phase 0 unit tests** covering env permutations and path resolution.
4. **Phase 1 pilot** inside retrieval path guarded by the flag.
5. **Phase 2 pilot** inside API loader + `/api/reranker/info`.
6. **Documentation updates** (deep dive, runbooks, GUI copy) to instruct agents how to toggle and validate the unified reranker configuration.

Out of scope for this phase:
- Refactoring training/eval scripts to HuggingFace Trainer.
- Renaming GUI terminology (“Learning Reranker”), unless mandated by accessibility.
- Removing legacy env vars (must remain readable until post-rollout audit).

## 3. Current Touch Points

| Area | Files | Notes |
|------|-------|-------|
| Retrieval | `retrieval/rerank.py`, `retrieval/hybrid_search.py` | Uses `RERANK_BACKEND`, `RERANKER_MODEL`, `RERANK_INPUT_SNIPPET_CHARS`, Cohere envs. |
| API | `server/reranker.py`, `server/reranker_info.py`, `server/app.py` (`/search`, `/api/reranker/*`) | Uses `AGRO_RERANKER_*` env family and local CrossEncoder loader. |
| GUI | `gui/js/reranker.js`, Playwright specs (`tests/gui/reranker_info.spec.ts`, etc.) | Submits form values named `AGRO_RERANKER_*`. |
| Tests | `tests/smoke/test_reranker_default_model.py` | Verifies import-time defaults. Must be updated carefully when loader introduced. |

## 4. Configuration Matrix

| Canonical field | Legacy env(s) | Resolution logic |
|-----------------|---------------|------------------|
| `enabled` | `AGRO_RERANKER_ENABLED`, `RERANK_BACKEND` | `True` if `AGRO_RERANKER_ENABLED=1` and backend not `none/off`. |
| `backend` | `RERANK_BACKEND`, `COHERE_API_KEY` | Values: `local`, `cohere`, `none`. Cohere requires API key; fallback to `local` with warning if missing. |
| `local_model_dir` | `AGRO_RERANKER_MODEL_PATH` | Resolve relative paths via `common.paths.repo_root()`. If directory exists locally, prefer it. |
| `hf_model_id` | `RERANKER_MODEL`, `AGRO_RERANKER_MODEL_PATH` | Use when path is non-existent or looks like `cross-encoder/...`. |
| `alpha` | `AGRO_RERANKER_ALPHA` | Float default `0.7`. |
| `top_n_local` | `AGRO_RERANKER_TOPN` | Positive int; `0` means rerank all. |
| `top_n_cloud` | `COHERE_RERANK_TOP_N` | Independent limit for Cohere requests. |
| `batch_size` | `AGRO_RERANKER_BATCH` | Int default `16`. |
| `max_length` | `AGRO_RERANKER_MAXLEN` | Int default `512`. |
| `snippet_chars` | `RERANK_INPUT_SNIPPET_CHARS` | Int default `600` (local) / `700` (Cohere). |
| `reload_on_change` | `AGRO_RERANKER_RELOAD_ON_CHANGE` | Bool; no change to GUI semantics. |
| `reload_period_sec` | `AGRO_RERANKER_RELOAD_PERIOD_SEC` | Int default `60`. |
| `cohere_model` | `COHERE_RERANK_MODEL` | e.g., `rerank-3.5`. |
| `cohere_api_key_present` | `COHERE_API_KEY` | Do not expose actual key; return boolean for diagnostics. |
| `metrics_label` | Derived | e.g., `cross-encoder:local`, `cohere:rerank-3.5`. Use in Prometheus + tracing. |

## 5. Rollout Phases

1. **Phase 0 – Foundations** ✅ (2025-10-24)
   - Implemented the unified reranker configuration loader (`reranker/config.py`) with unit coverage (`tests/unit/test_reranker_config.py`).
   - Training runbook now documents how to toggle `AGRO_RERANKER_SHARED_CONFIG` and the required validation steps.
2. **Phase 1 – Retrieval opt-in** ✅ (2025-10-24)
   - `retrieval/rerank.py` now reads consolidated settings when `AGRO_RERANKER_SHARED_CONFIG=1`, covering backend selection, snippet limits, and trace labels.
   - Smoke test `tests/smoke/test_reranker_default_model.py` toggles the flag to ensure imports honor the unified configuration path.
3. **Phase 2 – API opt-in** ✅ (2025-10-24)
   - `server/reranker.py` now resolves model path, reload policy, alpha/topN from the unified configuration when the flag is enabled.
   - `/api/reranker/info` surfaces `metrics_label`, resolved path, and loader-derived values so the GUI + Playwright tests can validate backend state.
4. **Phase 3 – Script alignment** (in progress)
- **CLI defaults wired:** `scripts/train_reranker.py`, `scripts/eval_reranker.py`, and `scripts/promote_reranker.py` pull unified configuration defaults for model paths, batch sizes, and triplet locations.
- **GUI update:** Info panel now surfaces `metrics_label` and configuration status so agents can confirm which backend is active without leaving the UI.
- **GUI toggle:** Learning Reranker settings expose `AGRO_RERANKER_SHARED_CONFIG` (Legacy vs Unified) so operators never edit `.env` manually. Config save flows update `.env` and the running process simultaneously. Remove any lingering `AGRO_RERANKER_SHARED_LOADER` entries after saving.
- **Remaining:** Extend Playwright coverage for the new fields (metrics + toggle) and update documentation for operator workflow.
5. **Phase 4 – Flag default on**
   - Enable flag in `.env.example` and docs only after Playwright + smoke suites pass twice on CI.
   - Schedule 48h burn-in; retain legacy path for manual rollback.

## 6. Testing Strategy

- **Unit**: Parametrized tests covering conflicting env combinations (only `RERANKER_MODEL`, only `AGRO_RERANKER_MODEL_PATH`, both set differently, invalid values).
- **Smoke**: `tests/smoke/test_reranker_default_model.py` toggles the flag and verifies unified configuration defaults.
- **Integration**: New pytest case hitting `/search` and `/api/reranker/info` with flag on, using stubbed CrossEncoder to avoid GPU dependency.
- **Playwright**: Ensure info panel reflects backend label derived from loader (update `tests/gui/reranker_info.spec.ts` once Phase 2 lands).
- **Performance**: Capture timing before/after to confirm loader caching does not add latency (`time.monotonic()` snapshots around load).

## 7. Risk & Mitigation

- **Env mismatch**: Scripts may rely on direct `os.getenv`. _Mitigation_: audit usages via `rg "AGRO_RERANKER_"` and provide helper for legacy reads.
- **Hot reload conflicts**: Retrieval and API poll loops might double reload. _Mitigation_: loader returns `reload_on_change` config; ensure only server thread triggers reload.
- **Cohere fallback**: Without API key, backend must gracefully downgrade to local. _Mitigation_: loader logs warning + returns `backend="local"` but `cohere_api_key_present=False`.
- **Accessibility regression**: GUI must continue to expose individual env names. _Mitigation_: loader remains read-only; config POST endpoint still writes discrete envs.

## 8. Observability Hooks

- Tag traces (`Trace.add`) with `settings.metrics_label`.
- Pipe loader decisions to Prometheus via `record_canary` once evaluation emits metrics (see Section 13 of the deep dive).
- Add debug logging (`logger.info`) when flag enabled to ease troubleshooting (ensure logs respect ADA copy guidelines).

## 9. Rollback Plan

- Toggle `AGRO_RERANKER_SHARED_CONFIG=0` in `.env` (via GUI Config save) and restart services.
- Re-run smoke + Playwright suites to ensure legacy path still passes.
- Document rollback in `03-runbooks/training.md` and notify maintainers via existing incident channel.

## 10. References

- Sentence Transformers CrossEncoder docs — <https://www.sbert.net/docs/package_reference/cross_encoder/index.html>
- Prometheus histogram best practices — <https://prometheus.io/docs/practices/histograms/>
- FastAPI background tasks (for future async refactors) — <https://fastapi.tiangolo.com/advanced/background-tasks/>

## 11. Next Phase: Single Reranker Option

- Collapse the current dual-reranker flow into a *single* selection that applies to search, answer, chat, and the smoke test. Options should be exactly:
  1. `none` — reranking disabled.
  2. `cloud` — Cohere (or other hosted reranker).
  3. `local-learning` — the self-training cross-encoder.
- Update `/search`, `/api/answer`, `/api/chat`, and `/api/reranker/smoketest` to respect that single choice under the unified configuration flag.
- Remove the redundant API-side rerank pass once parity is confirmed; keep telemetry (metrics, logs) consistent before and after the removal.
- Document the migration path and add Playwright coverage to ensure the GUI reflects the single-option model.
- Rename legacy terms to match SBERT vocabulary while refactoring the selector (e.g., “evaluation samples” → “Evaluation dataset”, “cards/semantic cards” → “Semantic Boosts”, “Learning Reranker” → “Local self-learning reranker”). Tests and docs must use the new language; note that backend routes remain `/api/cards/*` until the API migration lands.
- Enforce SBERT-approved loss options. Training scripts, GUI selectors, and docs must reference canonical classes (`SoftmaxLoss`, `MultipleNegativesRankingLoss`, etc.). See [`09-loss-strategy.md`](09-loss-strategy.md) for implementation checklist.
