# Terminology Migration Audit

> **Agents:** Re-read [`AGENTS.md`](../AGENTS.md) before attempting any rename. Accessibility rules require the GUI, backend APIs, docs, and tests to stay in lockstep. Do **not** ship partial terminology changes.

_Last updated: 2025-10-24_

## 1. Canonical Vocabulary

| Legacy label | SBERT-aligned replacement | Notes |
|--------------|--------------------------|-------|
| Evaluation samples / evaluation dataset | **Evaluation dataset** | File defaults move from `data/evaluation_dataset.json` → `data/evaluation_dataset.json`. New env: `EVALUATION_DATASET_PATH` (keep `GOLDEN_PATH` readable for rollback). |
| Golden Question (singular) | **Evaluation sample** | Use in UI button copy (“Add Evaluation Sample”), docs, and tests. |
| Learning Reranker | **Local self-learning reranker** | Mirrors CrossEncoder fine-tune workflow; aligns with single-reranker selector (None / Cloud / Local self-learning). |
| Cards / Semantic cards | **Semantic Boosts** | UI terminology per `agent_docs/ui/README.md`. Backend routes/files remain `cards*` (e.g., `/api/cards/*`, `cards.jsonl`) until a dedicated API rename lands; document both names to keep agents aligned. |

## 2. Repository Surfacing (2025-10-24 scan)

| Area | Key files | Migration actions |
|------|-----------|-------------------|
| **Environment defaults** | `.env`, `.env.backup*`, `ui/ALL_KNOBS.yaml`, `docker-compose.services.yml` | Rename vars to `EVALUATION_DATASET_PATH`, add compatibility comments, update docstrings. |
| **Data files** | `data/evaluation_dataset.json` (staged rename → `data/evaluation_dataset.json`), `data/langtrace_dataset.csv` | Update `_comment` headers, sample IDs (`golden_1` → `eval_1`). |
| **Backend APIs** | `server/app.py` (`/api/golden*`, `/api/evaluation-dataset*`), `server/reranker.py`, `server/reranker_info.py` | Finalize new routes, deprecate legacy ones behind compatibility section, ensure metrics/logging use new terminology. |
| **CLI / scripts** | `eval/eval_rag.py`, `scripts/mine_from_evaluation_dataset.py`, `scripts/train_reranker.py`, `scripts/eval_reranker.py`, `scripts/promote_reranker.py` | Rename helper functions, CLI flags, console output. Preserve backward compatible CLI arguments with warnings. |
| **GUI assets** | `gui/index.html` (Learning Reranker + Data Quality subtabs), `gui/js/evaluation_dataset.js`, `gui/js/reranker.js`, `public/agro/js/*` mirrors | Update headings (“Evaluation Dataset Manager”), button labels, tooltip text, and SSE log messages. Ensure loader module is renamed to `evaluation_dataset.js` with consistent exports. |
| **Tests** | `tests/smoke/test_golden_questions.py`, `tests/test_golden_paths_exist.py`, `tests/gui/eval_settings.spec.ts`, `tests/gui/eval_runner*.spec.ts`, Playwright dashboards referencing “semantic boosts” | Rename suites/files, update selectors/fixtures, regenerate baseline screenshots if needed. |
| **Docs** | `docs/LEARNING_RERANKER.md`, `docs/API_REFERENCE.md`, `website/docs/**`, `agent_docs/**`, `README.md`, `cursor.rules` | Replace terminology, add SBERT citation links, capture migration notes in CHANGELOG + runbooks. |
| **Dashboards / Observability** | `agent_docs/reranker-reset/07-metrics-plan.md`, Grafana descriptions, Slack webhook templates | Update card titles and alert messages to new names. |

## 3. Blocking Gaps Before Implementation

1. **Rename tracker** – Ensure `git status` no longer shows mixed states (`gui/js/evaluation_dataset.js` deleted + legacy file re-added). Normalize staged renames before editing.
2. **Playwright selectors** – Inventory selectors relying on `#golden-`, `.golden-`, or visible text “Golden”. Update tests and HTML in sync.
3. **Legacy docs** – Docusaurus static exports under `website/static/legacy-docs/` still surface “Golden”. Decide whether to bulk-update or sunset those copies.
4. **CI references** – Check GitHub workflows (`.github/workflows/*`) for job names or paths referencing “golden” to avoid surprise failures.

## 4. Test & Verification Matrix

| Stage | Required checks |
|-------|-----------------|
| Backend rename | `pytest tests/smoke/test_reranker_default_model.py`, updated evaluation dataset smoke, API contract unit tests. |
| GUI rename | Playwright suites touching Evaluation tab (`tests/gui/eval_settings.spec.ts`, `tests/gui/eval_runner.spec.ts`, reranker dashboard specs). |
| Documentation lint | Run doc guard (`scripts/reranker_doc_guard.py`) and ensure new links point to updated SBERT references. |
| Observability | Verify Grafana embed loads with new card titles; confirm Promtail log filters (if any) still match after renaming keywords. |

## 5. Reference Links

- SBERT CrossEncoder training overview — <https://www.sbert.net/docs/cross_encoder/training_overview.html>
- SBERT CrossEncoder loss overview — <https://www.sbert.net/docs/cross_encoder/loss_overview.html>
- SBERT CrossEncoder API reference — <https://www.sbert.net/docs/package_reference/cross_encoder/index.html>
- Prometheus histogram guidance — <https://prometheus.io/docs/practices/histograms/>
- Codex CLI profiles & guardrails — see [`tooling/codex-cli.md`](tooling/codex-cli.md)
