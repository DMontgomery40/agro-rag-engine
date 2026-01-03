---
paths: eval/**/*.py
---

# Evaluation System

Golden-question-based RAG evaluation with regression tracking.

## Architecture

```
Golden Questions → Search Execution → Metric Calculation → Baseline Comparison
```

## Key Files - Exact Differences

| File | Purpose | Output |
|------|---------|--------|
| `eval_rag.py` | **CLI baseline evaluator** - standalone script | `data/evals/eval_{timestamp}.json` |
| `eval_loop.py` | **API wrapper** - returns dict, better error handling | Dict (no file write) |
| `eval_rag_instrumented.py` | **Prometheus metrics** - per-question timing, modality breakdown | JSON + Prometheus + Grafana |
| `tune_params.py` | **Grid search** - parameter optimization via os.environ | Console output only |
| `inspect_eval.py` | **LangTrace integration** - Inspect AI framework traces | LangTrace logs |

### eval_rag.py (Primary)
- Captures config snapshot via `capture_eval_config()` (whitelisted keys only)
- `hit()` and `reciprocal_rank()` metrics
- `stamp_eval_runtime_config()` - records per-run overrides to JSON
- Saves full results to disk

### eval_loop.py (API-Friendly)
- `run_eval_with_results(sample_limit, use_multi_override, final_k_override)`
- Returns dict for programmatic use
- Validates golden.json structure before running
- Returns `{"error": "..."}` instead of crashing

### eval_rag_instrumented.py (Metrics)
- Imports Prometheus: `record_eval_run`, `record_eval_question`, `record_eval_modality_contribution`
- Per-question timing and hit recording
- More comprehensive config snapshot (60+ params)
- Pushes metrics for Grafana dashboards

### tune_params.py (Optimization)
- Grid search over parameter combinations
- Mutates `os.environ` (not thread-safe)
- No persistence - prints results only

### inspect_eval.py (Tracing)
- Custom solver for Inspect AI framework
- Uses `includes()` scorer
- Outputs to LangTrace for distributed debugging

## Golden Question Format

```json
[
  {
    "q": "Where is hybrid retrieval implemented?",
    "repo": "agro",
    "expect_paths": ["retrieval/hybrid_search.py"]
  },
  {
    "q": "Where is BM25 initialized?",
    "repo": "agro",
    "expect_paths": ["retrieval/hybrid_search.py", "indexer/"]
  }
]
```

- File: `data/golden.json` (or `GOLDEN_PATH` config)
- `expect_paths` uses **substring matching** - partial paths work

## Metrics Calculation

### hit() - Top-1 Accuracy
```python
def hit(paths: List[str], expect: List[str]) -> bool:
    return any(any(exp in p for p in paths) for exp in expect)
```

### reciprocal_rank() - MRR Component
```python
def reciprocal_rank(paths: List[str], expect: List[str]) -> float:
    for i, path in enumerate(paths):
        if any(exp in path for exp in expect):
            return 1.0 / (i + 1)  # 1st=1.0, 2nd=0.5, 3rd=0.33
    return 0.0
```

### Summary Metrics
```python
top1_accuracy = hits_top1 / total  # % with match at position 0
topk_accuracy = hits_topk / total  # % with match in top-K
mrr = rr_sum / total               # Mean Reciprocal Rank
```

## Baseline Comparison

```python
# Save current as baseline
POST /api/eval/baseline/save

# Compare vs baseline
GET /api/eval/baseline/compare
# Returns: {
#   delta_top1, delta_topk,
#   regressions: [questions that lost hits],
#   improvements: [questions that gained hits]
# }
```

## API Endpoints

```python
POST /api/eval/run                    # Start eval (background thread)
POST /api/eval/run_instrumented       # Start eval with Prometheus metrics
GET  /api/eval/run/stream             # Stream eval progress (SSE)
GET  /api/eval/status                 # Current eval status
GET  /api/eval/results                # Latest results (with config)
GET  /api/eval/results/{run_id}       # Results by run ID
GET  /api/eval/runs                   # List all saved evals
GET  /api/eval/question/{run_id}/{idx}# Single question details
POST /api/eval/baseline/save          # Save latest as baseline
GET  /api/eval/baseline/compare       # Compare vs baseline
POST /api/eval/analyze_comparison     # LLM analysis of diffs
```

## Configuration Keys

```python
EVAL_MULTI      # 1=use multi-query search (default)
EVAL_FINAL_K    # 5 (return top K results)
EVAL_MULTI_M    # 10 (number of query variations)
GOLDEN_PATH     # data/golden.json
BASELINE_PATH   # data/evals/eval_baseline.json
```

## UI Components

### EvaluateSubtab.tsx
- **Golden Questions Manager** - CRUD operations
- **Single question testing** - test one question immediately
- **Evaluation runner** - configurable settings, live terminal

### EvalDrillDown.tsx (1345 lines)
- **Summary cards** - Top-1, Top-K, MRR, Duration
- **Config comparison** - shows ONLY changed settings between runs
- **AI analysis** - LLM root cause analysis of regressions
- **Per-question table** - collapsible rows with expected vs returned paths

## Search Integration

```python
from retrieval.hybrid_search import search_routed_multi, search_routed

if USE_MULTI:
    docs = search_routed_multi(q, repo_override=repo, m=MULTI_M, final_k=FINAL_K)
else:
    docs = search_routed(q, repo_override=repo, final_k=FINAL_K)

paths = [d.get('file_path', '') for d in docs]
```

Config affects search behavior:
- `BM25_WEIGHT`, `VECTOR_WEIGHT` - score fusion
- `RRF_K_DIV` - RRF fusion parameter
- `TOPK_DENSE`, `TOPK_SPARSE` - candidate counts
- `AGRO_RERANKER_*`, `RERANKER_*` - reranking parameters
- `FILENAME_BOOST_*`, `KEYWORDS_BOOST`, `PATH_BOOSTS`, `LAYER_INTENT_MATRIX` - scoring boosts
- Filetype boosts in `retrieval/hybrid_search.py` (.py/.ts/.md penalties)
- Legacy boosts loaded but not applied in v2: `CARD_BONUS`, `FRESHNESS_BONUS`, `VENDOR_PENALTY`, additive `LAYER_BONUS_*`
