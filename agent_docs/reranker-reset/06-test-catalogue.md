# Reranker Test Catalogue

> **Agents:** Read [`AGENTS.md`](../AGENTS.md) before running or modifying any tests. Accessibility rules require GUI + backend parity, so keep the catalogue in sync with UI changes.

_Last updated: 2025-10-24_

## 1. Overview

This catalogue enumerates every automated check that exercises reranker functionality today. Use it to plan coordinated updates when refactoring the stack (shared loader, schema migration, GUI renames).

| ID | Type | Path | Coverage summary | Notes |
|----|------|------|------------------|-------|
| T1 | Smoke (pytest) | `tests/smoke/test_reranker_default_model.py` | Verifies default env resolution for `server.reranker` and `retrieval.rerank`; toggles shared loader flag. | Stubs heavy deps while checking both legacy and shared loader paths. |
| T2 | Smoke (pytest) | `tests/smoke/test_miner.py` | Runs `scripts/mine_triplets.py` end-to-end with temporary log file; asserts dedup + `AGRO_LOG_PATH` override. | Writes to `data/training/triplets.jsonl`; clean up in fixtures before refactors. |
| T3 | Smoke (pytest) | `tests/smoke/test_chat_ui_fixes.py` | Ensures reranker scripts load order in GUI bundle. | Indirect, but fail-fast if reranker JS missing. |
| T4 | Smoke (pytest) | `tests/smoke/test_complete_restoration.spec.ts` (Playwright) | Confirms Learning Ranker UI elements restored after layout fixes. | `.spec.ts` wrapper executed via Playwright CLI. |
| T5 | Playwright | `tests/gui/reranker_info.spec.ts` | Validates info panel + default model placeholder. | Will need backend label assertions after shared loader rollout. |
| T6 | Playwright | `tests/gui/reranker_nohits.spec.ts` | Exercises `/api/reranker/nohits` responses (success/empty/error). | Uses `page.route` mocks; keep JSON schema unchanged. |
| T7 | Playwright | `tests/test_recovered_features.ts` | Checks Learning Ranker inputs (`AGRO_TRIPLETS_PATH`, mine controls) remain visible. | Sensitive to placeholder default values. |
| T8 | Playwright | `tests/gui/phase2-smoke-test.spec.ts` | Navigates RAG tab; confirms reranker card loads. | General regression; fails on missing selectors. |
| T9 | Playwright | `tests/gui/wave3-smoke.spec.ts` | High-level RAG smoke covering reranker tab toggles. | Ensure selectors remain stable post-renames. |
| T10 | TS utility | `tests/test-dashboard-final-verification.spec.ts` | Dashboard smoke includes reranker metrics cards. | Dependent on `/api/reranker/costs` output. |
| T11 | TS utility | `tests/test-dashboard-enhancements.spec.ts` | Checks reranker telemetry cards in dashboard. | Evaluate updating when metrics change. |
| T12 | Python util | `tests/compare_rerankers.py` | Script to compare reranker outputs (manual). | Not part of CI; keep for debugging. |
| T13 | Unit (pytest) | `tests/unit/test_reranker_config.py` | Validates shared loader env resolution + model targeting. | Phase 0 blocker for shared loader flag. |

## 2. Coverage gaps

1. **Process orchestration** — No automated test hits `/api/reranker/mine|train|evaluate|baseline|cron|smoketest`; add pytest API-level coverage before async refactor.
2. **Prometheus metrics** — No assertions around `record_canary`/`agro_reranker_margin_abs`. Once instrumentation lands, add regression tests.
3. **Cron safeguards** — Need mocked `crontab` integration test to prevent accidental host mutations.
4. **Relative path migration** — Future schema changes must update Playwright fixtures (e.g., verifying `schema_version` presence).

## 3. Update workflow

1. When altering GUI selectors, update relevant Playwright specs first (T5–T9) to prevent ADA regressions.
2. When adjusting shared loader behaviour, ensure T1 continues to pass in both legacy (`0`) and shared (`1`) flag modes; document expectations in the change summary.
3. Schema migrations should include fixtures for T2 and new API-level tests, ensuring `AGRO_LOG_PATH`/`AGRO_TRIPLETS_PATH` placeholders stay aligned.
4. After each major change, run smoke (`pytest tests/smoke`) and Playwright suites (`pnpm playwright test --config=playwright.gui.config.ts`) to provide tangible proof of compliance.

## 4. Coordination checklist

- [ ] Alert maintainers when new tests are added or existing IDs change.
- [ ] Mirror catalogue entries inside `agent_docs/reranker-reset/04-deep-dive.md` Section 6.
- [ ] Capture flake reports in monitoring channel with test ID reference for quick triage.

## 5. References

- Playwright best practices — <https://playwright.dev/docs/test-runners>
- Pytest guidelines — <https://docs.pytest.org/en/stable/>
- Prometheus instrumentation plan — see Section 13 of `04-deep-dive.md`.
