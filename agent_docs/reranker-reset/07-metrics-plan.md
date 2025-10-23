# Reranker Metrics & Observability Plan

> **Agents:** Review [`AGENTS.md`](../AGENTS.md) before working on instrumentation. Every change must keep GUI indicators and accessibility copy in sync with backend metrics.

_Last updated: 2025-10-24_

## 1. Objectives

- Ensure reranker evaluation and promotion flows emit Prometheus metrics so Grafana dashboards reflect real-time model quality.
- Preserve existing counters/gauges while activating the currently dormant series (`agro_reranker_margin_abs`, `agro_reranker_winner_total`, `record_canary` helpers).
- Provide smoke/regression tests that validate metric emission without requiring live Prometheus infrastructure.

## 2. Current State

| Metric | Declaration | Current usage |
|--------|-------------|---------------|
| `agro_rr_mrr` (`RR_MRR`) | `server/metrics.py` line ~34 | Updated via `set_retrieval_quality` when `/api/reranker/evaluate` succeeds. |
| `agro_reranker_margin_abs` (`RERANKER_MARGIN_ABS`) | `server/metrics.py` line ~59 | **Not emitted**; waiting for evaluation to compute margin. |
| `agro_reranker_margin_latest` (`RERANKER_MARGIN_LATEST`) | `server/metrics.py` line ~66 | Gauge to expose the most recent signed delta for Grafana stat cards. |
| `agro_reranker_winner_total` | `server/metrics.py` line ~72 | **Not emitted**. |
| `record_canary` helper | `server/metrics.py` line ~92 | Only used by archived scripts; API pipeline ignores it. |
| GUI dashboard | `tests/test-dashboard-final-verification.spec.ts` | Reads cost + status but not Prometheus directly. |

## 3. Target Metrics Flow

1. **Evaluation** (`/api/reranker/evaluate`):
   - Parse metrics from `scripts/eval_reranker.py` stdout (`MRR@all`, `Hit@1/3/5/10`).
   - Determine baseline metrics (from `data/evals/reranker_baseline.json`, if present).
   - Compute margin `delta = current_mrr - baseline_mrr`.
   - Call:
     ```python
     record_canary(
         provider=settings.backend_label,  # e.g., "cross-encoder"
         model=settings.metrics_label,
         passed=(delta >= MIN_DELTA),
         margin=delta,
         winner=_winner(delta)
     )
     RERANKER_MARGIN_ABS.labels(...).observe(abs(delta))
     RERANKER_MARGIN_LATEST.labels(...).set(delta)
     ```
   - Retain existing `set_retrieval_quality`.
2. **Promotion** (`scripts/promote_reranker.py`):
   - After successful promotion, record another canary entry comparing candidate vs current.
   - Append margin + winner to `data/logs/model_promotions.log` for offline audits.
3. **Smoke endpoint** (`/api/reranker/smoketest`):
   - No change to metrics, but ensure trace includes `settings.metrics_label`.

## 4. Implementation Steps

1. Integrate shared loader (Section 12 of deep dive) to provide `metrics_label`.
2. Factor out result parsing into helper (`server/reranker_metrics.py`) returning structured metrics + delta vs baseline.
3. Update `/api/reranker/evaluate` to call helper and emit Prometheus metrics inside success branch.
4. Patch `scripts/promote_reranker.py` to optionally emit metrics when run with `--metrics` flag (default on via env).
5. Modify GUI dashboard tests (T10/T11) if new fields are surfaced. New Grafana panels (IDs 51–52) surface the signed delta and Loki log stream for migration keywords—keep placement appended beneath existing cards to preserve iframe layout.
6. Document updated Grafana expectations in `telemetry/grafana_dash.py` and operations runbooks.

## 5. Testing

- **Unit**: Add tests for helper function using sample stdout strings (legacy JSONL fixtures).
- **Integration**: Pytest hitting `/api/reranker/evaluate` with stubbed subprocess that returns canned output, asserting Prometheus registry counters changed.
- **Smoke**: Extend existing reranker smoke test to fetch `/metrics` endpoint and ensure new series present when flag enabled.
- **Playwright**: If GUI displays new metrics (e.g., delta badge), update specs accordingly.

## 6. Deployment Checklist

- [ ] Shared loader flag enabled in staging before metrics emission (ensures backend labels resolved).
- [ ] Update Grafana dashboard queries to include provider/model labels.
- [ ] Coordinate with monitoring team to set alert thresholds on `agro_reranker_margin_abs`.
- [ ] Run smoke + Playwright suites post-deploy and attach `/metrics` excerpt as proof.

## 7. Rollback

- Disable `AGRO_RERANKER_EMIT_METRICS=0` (new env toggle) to bypass metric emission.
- Re-run smoke tests to confirm legacy behavior restored.
- Notify observability channel of rollback to avoid false alarms.

## 8. References

- Prometheus client docs — <https://github.com/prometheus/client_python>
- Grafana JSON dashboards — `telemetry/grafana_dash.py`
- Existing MODEL promotion log format — `scripts/promote_reranker.py`
