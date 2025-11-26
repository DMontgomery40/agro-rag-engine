# Eval Persistence Fix - 2025-11-25

## Problem

The streaming eval endpoint (`GET /api/eval/run/stream`) at lines 249-405 in `server/routers/eval.py` was building a summary dict but never saving it to disk. This caused eval results to be lost on server restart, making it impossible to compare historical runs or analyze trends over time.

The frontend uses this streaming endpoint, so this was a critical data loss issue.

## Root Cause

The streaming endpoint was missing the persistence logic that existed in the instrumented endpoint (`POST /api/eval/run_instrumented`). The instrumented endpoint correctly:
1. Generated a `run_id` timestamp
2. Created the `data/evals/` directory
3. Saved results to `data/evals/eval_{run_id}.json`

The streaming endpoint only stored results in memory (`_EVAL_STATUS["results"]`), which was lost on restart.

## Solution (TDD Approach)

### 1. Created Comprehensive Tests
Created `/Users/davidmontgomery/agro-rag-engine/tests/integration/test_eval_persistence.py` with 5 tests:

- `test_streaming_endpoint_saves_to_disk` - Verifies file creation
- `test_streaming_endpoint_includes_run_id_in_summary` - Checks run_id field exists
- `test_streaming_endpoint_creates_eval_directory` - Tests directory creation
- `test_saved_file_matches_summary_structure` - Validates JSON structure
- `test_error_handling_during_save` - Ensures graceful error handling

### 2. Implemented Fix in server/routers/eval.py

Added persistence logic at lines 376-410:

```python
# Generate run_id for persistence and traceability
run_id = time.strftime("%Y%m%d_%H%M%S")

summary = {
    "run_id": run_id,  # Added this field
    "total": total,
    "top1_hits": hits_top1,
    "topk_hits": hits_topk,
    "top1_accuracy": round(top1_accuracy, 3),
    "topk_accuracy": round(topk_accuracy, 3),
    "final_k": final_k_val,
    "use_multi": use_multi_val,
    "duration_secs": round(duration, 2),
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "results": results
}

_EVAL_STATUS["results"] = summary

# Save results to disk for persistence across server restarts
try:
    output_dir = Path('data/evals')
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / f'eval_{run_id}.json'
    with open(output_file, 'w') as f:
        json.dump(summary, f, indent=2)

    yield f"data: {json.dumps({'type': 'log', 'message': f'Results saved to {output_file}'})}\n\n"
except Exception as e:
    # Log error but don't fail the eval
    yield f"data: {json.dumps({'type': 'log', 'message': f'Warning: Failed to save results: {e}'})}\n\n"
```

### 3. Key Design Decisions

1. **Graceful Error Handling**: Save failures log a warning but don't crash the eval
2. **Consistent Naming**: Uses same `eval_{run_id}.json` format as instrumented endpoint
3. **run_id in Summary**: Added `run_id` field for traceability and matching with saved files
4. **User Feedback**: Stream logs the save location for transparency

## Test Results

All tests pass:
```
tests/integration/test_eval_persistence.py::test_streaming_endpoint_saves_to_disk PASSED
tests/integration/test_eval_persistence.py::test_streaming_endpoint_includes_run_id_in_summary PASSED
tests/integration/test_eval_persistence.py::test_streaming_endpoint_creates_eval_directory PASSED
tests/integration/test_eval_persistence.py::test_saved_file_matches_summary_structure PASSED
tests/integration/test_eval_persistence.py::test_error_handling_during_save PASSED
```

Existing smoke tests also pass:
```
tests/smoke/test_evaluate_backend_wiring.py - 8 tests PASSED
```

## File Structure

Saved eval files now have consistent structure:

```json
{
  "run_id": "20251125_144456",
  "total": 50,
  "top1_hits": 25,
  "topk_hits": 42,
  "top1_accuracy": 0.5,
  "topk_accuracy": 0.84,
  "final_k": 5,
  "use_multi": true,
  "duration_secs": 12.34,
  "timestamp": "2025-11-25 14:44:56",
  "results": [...]
}
```

## Benefits

1. **Persistence**: Eval results survive server restarts
2. **Historical Analysis**: Can compare runs over time via `/api/eval/results/{run_id}`
3. **Regression Detection**: Grafana dashboards can track metrics across deployments
4. **Debugging**: Full eval results available for post-mortem analysis
5. **Consistency**: Streaming and instrumented endpoints now behave the same way

## Files Modified

- `/Users/davidmontgomery/agro-rag-engine/server/routers/eval.py` (lines 376-410)
- `/Users/davidmontgomery/agro-rag-engine/tests/integration/test_eval_persistence.py` (new file)

## Verification

Run tests:
```bash
python -m pytest tests/integration/test_eval_persistence.py -v
python -m pytest tests/smoke/test_evaluate_backend_wiring.py -v
```

Check saved files:
```bash
ls -lh data/evals/eval_*.json
```

Verify run_id in latest file:
```bash
python -c "import json; print(json.load(open('data/evals/eval_20251125_144456.json'))['run_id'])"
```
