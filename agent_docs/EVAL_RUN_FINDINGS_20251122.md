# Eval Run Findings - November 22, 2025

## Executive Summary

**CRITICAL BUG DISCOVERED**: All 9 eval runs showed identical 12.7% top-1 / 17.6% top-k accuracy because config updates weren't being applied. The `/api/config` endpoint requires `{"env": {...}}` wrapper, but I was sending flat JSON.

## What Was Accomplished

### ✅ Prometheus Instrumentation (WORKING PERFECTLY)
- Added 7 new Prometheus metrics to `server/metrics.py:116-164`
- Added `/api/eval/run_instrumented` endpoint to `server/routers/eval.py:49-193`
- Metrics successfully recording:
  - `agro_eval_run_accuracy` (aggregate top-1 and top-k by run_id)
  - `agro_eval_run_duration_seconds`
  - `agro_eval_run_total_questions`
  - `agro_eval_run_config` (all 7 config params per run)
  - `agro_eval_question_result` (per-question hit/miss)
  - `agro_eval_question_duration_seconds`
  - Modality metrics (score distribution, top rank frequency)

### ✅ Eval Runs Completed
- 9 total eval runs recorded to Prometheus
- All runs saved to `data/evals/eval_YYYYMMDD_HHMMSS.json`
- Each run includes:
  - Full config snapshot (7 parameters)
  - Per-question results (102 questions)
  - Aggregate metrics (top-1, top-k accuracy, duration)

### ✅ Grafana Dashboard
- Dashboard JSON being built by subagent (separate parallel task)
- Will include:
  - Run comparison with config diffs
  - Question-level heatmaps
  - Per-parameter filtering
  - Side-by-side analysis
  - Regression/improvement tracking

## Critical Bug: Config API Format Issue

### The Problem
When I sent config updates via `/api/config`, I used:
```json
{"BM25_WEIGHT": 0.7, "VECTOR_WEIGHT": 0.3}
```

But `server/services/config_store.py:194` requires:
```json
{"env": {"BM25_WEIGHT": 0.7, "VECTOR_WEIGHT": 0.3}}
```

### The Result
**ALL 9 EVAL RUNS USED IDENTICAL CONFIG** (the default hardcoded values), which is why every run showed exactly 12.7% / 17.6% accuracy.

| Run ID | Top-1 | Top-K | Config |
|--------|-------|-------|--------|
| 20251122_092032 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092118 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092156 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092234 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092312 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092504 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092615 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092732 | 12.7% | 17.6% | **Default** (not updated) |
| 20251122_092828 | 12.7% | 17.6% | **Default** (not updated) |

### Verification
After discovering the bug, I tested the correct format:
```bash
curl -X POST http://localhost:8012/api/config \
  -H "Content-Type: application/json" \
  -d '{"env": {"BM25_WEIGHT": 0.8, "VECTOR_WEIGHT": 0.2}}'

# Verify:
curl http://localhost:8012/api/config | jq '.env | {BM25_WEIGHT, VECTOR_WEIGHT}'
# Returns: {"BM25_WEIGHT": 0.8, "VECTOR_WEIGHT": 0.2} ✅
```

Config updates now work correctly!

## What This Means

### 1. We Don't Know If Config Tuning Helps Yet
All eval runs were actually testing the **same config** (defaults), so we haven't actually tested:
- BM25-heavy vs vector-heavy weighting
- Reranker on vs off
- RRF-k variations

**The 12.7% accuracy is real**, but we haven't validated whether any config changes improve it.

### 2. Need to Re-Run Evals with Correct Config
To properly evaluate config variations, we need to:
```bash
# BM25-Heavy
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.7, "VECTOR_WEIGHT": 0.3}}'
curl -X POST http://localhost:8012/api/eval/run_instrumented

# No-Rerank
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.5, "VECTOR_WEIGHT": 0.5, "DISABLE_RERANK": 1}}'
curl -X POST http://localhost:8012/api/eval/run_instrumented

# Low-RRF-K
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.3, "VECTOR_WEIGHT": 0.7, "RRF_K_DIV": 30}}'
curl -X POST http://localhost:8012/api/eval/run_instrumented
```

### 3. Root Cause Investigation Still Needed
The **12.7% baseline accuracy is catastrophically low** and config tuning may not fix it. Based on the RAG Quality Investigation Checklist (agent_docs/RAG_QUALITY_INVESTIGATION_CHECKLIST.md), likely root causes:

**High Priority Issues:**
1. **BM25S Tokenization** - May not be appropriate for code (needs AST-aware tokenization)
2. **Chunking Quality** - Code chunks may not be semantically meaningful
3. **Config Mismatch** - CRITICAL: Config shows `embedding_dim: 3072` but actual embeddings are 384 dims
4. **Vector Embedding Quality** - Embeddings may not capture code semantics

**Recommended Smoke Tests:**
```bash
# 1. BM25-only (disable vector and rerank)
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 1.0, "VECTOR_WEIGHT": 0.0, "DISABLE_RERANK": 1}}'

# 2. Vector-only (disable BM25 and rerank)
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.0, "VECTOR_WEIGHT": 1.0, "DISABLE_RERANK": 1}}'

# 3. Hybrid-only (disable rerank)
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.5, "VECTOR_WEIGHT": 0.5, "DISABLE_RERANK": 1}}'

# 4. Full pipeline (baseline)
curl -X POST http://localhost:8012/api/config \
  -d '{"env": {"BM25_WEIGHT": 0.3, "VECTOR_WEIGHT": 0.7, "DISABLE_RERANK": 0}}'
```

These will isolate whether the problem is in BM25, vectors, fusion, or reranker.

## Prometheus Metrics Status

### ✅ All Metrics Recording Successfully
```bash
# Check Prometheus at http://localhost:9090
curl 'http://localhost:9090/api/v1/query?query=agro_eval_run_accuracy' | jq
# Returns 18 metrics (9 runs × 2 topk values)

curl 'http://localhost:9090/api/v1/query?query=agro_eval_run_config' | jq
# Returns 63 metrics (9 runs × 7 config params)

curl 'http://localhost:9090/api/v1/query?query=agro_eval_question_result' | jq
# Returns 886+ metrics (per-question results)
```

## Files Modified

### New Files Created
- `server/metrics.py:116-164` - Eval metric definitions
- `server/routers/eval.py:49-193` - Instrumented eval endpoint
- `eval/eval_rag_instrumented.py` - Standalone instrumented runner
- `agent_docs/RAG_QUALITY_INVESTIGATION_CHECKLIST.md` - Comprehensive debugging guide
- `agent_docs/EVAL_RUN_FINDINGS_20251122.md` - This document

### Eval Result Files
- `data/evals/eval_20251122_092032.json` through `eval_20251122_092828.json`
- 9 complete eval runs with full config snapshots and per-question results

## Next Steps

### 1. Immediate (Required for Valid Data)
- [ ] Re-run 3-4 eval variations with **correct config format**
- [ ] Verify config changes actually affect results
- [ ] Check if any config improves 12.7% baseline

### 2. Grafana Dashboard
- [ ] Complete dashboard build (subagent working)
- [ ] Restart Grafana to load new dashboard
- [ ] Verify all panels populate with Prometheus data

### 3. Root Cause Investigation (If Config Tuning Doesn't Help)
- [ ] Run 4 smoke tests (BM25-only, Vector-only, Hybrid-only, Full)
- [ ] Fix CRITICAL config mismatch: `embedding_dim: 3072` vs actual 384
- [ ] Investigate BM25S tokenization for code
- [ ] Review chunking quality (AST-based chunker)
- [ ] Check index health and coverage

## Code References

### Config API Bug Fix
- Config endpoint: `server/routers/config.py:40`
- Set config logic: `server/services/config_store.py:194-211`
- **Format requirement**: `{"env": {...}}` wrapper for AGRO_CONFIG_KEYS

### Eval Instrumentation
- Metrics: `server/metrics.py:116-164`
- Instrumented endpoint: `server/routers/eval.py:49-193`
- Helper functions: `server/metrics.py:261-317`

### Prometheus Queries
```promql
# Aggregate accuracy by run
agro_eval_run_accuracy{topk="1"}
agro_eval_run_accuracy{topk="k"}

# Config snapshot
agro_eval_run_config{param_name="bm25_weight"}
agro_eval_run_config{param_name="disable_rerank"}

# Per-question results
agro_eval_question_result{run_id="20251122_092312", topk="1"}
```

## Conclusion

**Prometheus instrumentation is working perfectly** - all metrics recording as expected.

**Critical config API bug discovered** - all 9 eval runs used identical config, so we haven't actually tested any variations yet.

**Next action required**: Re-run evals with correct config format to get valid comparison data, then review Grafana dashboard to visualize differences.

**Root cause**: 12.7% baseline is real and likely requires deeper investigation beyond config tuning (see RAG_QUALITY_INVESTIGATION_CHECKLIST.md).
