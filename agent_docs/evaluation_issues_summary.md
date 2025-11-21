# Evaluation Runner Issues - Executive Summary

## Problem
Evaluation runner shows NaN values for metrics and fails to save baseline with "No evaluation results to save" error.

## Root Causes (5 issues identified)

### Issue #1: Frontend/Backend API Response Mismatch
**Severity:** CRITICAL
**Impact:** NaN values in frontend UI

The backend returns error responses that the frontend doesn't recognize as errors:

```python
# Backend response when no results
{"ok": false, "message": "No evaluation results available"}

# Frontend checks for
if (data.error) { throw... }  // ← Doesn't exist, so error not caught

# Frontend then tries to access
undefined * 100  // ← Results in NaN
```

**File:** `gui/js/eval_runner.js` line 180 vs `server/app.py` line 2803

**Fix:** Update frontend to check `data.ok` and `data.message` fields

---

### Issue #2: Silent Search Failure When Qdrant Unavailable
**Severity:** CRITICAL
**Impact:** All searches return empty results, evaluation produces 0% accuracy silently

The vector search catches exceptions but silently fails:

```python
# retrieval/hybrid_search.py lines 436-438, 461-462
try:
    # Query Qdrant...
except Exception:
    dense_pairs = []  # ← NO ERROR LOGGING
    # User has no idea why search failed
```

**File:** `/retrieval/hybrid_search.py` lines 436-462

**Fix:**
- Add logging when search fails
- Return error to caller instead of silently returning empty list
- Add Qdrant connectivity check before starting evaluation

---

### Issue #3: Missing Qdrant Pre-flight Validation
**Severity:** CRITICAL
**Impact:** Evaluation runs and completes with 0% metrics if Qdrant is down

The eval endpoint doesn't validate Qdrant connectivity before starting:

```python
@app.post("/api/eval/run")
def eval_run(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    # ← NO CHECK: Is Qdrant running?
    # ← NO CHECK: Is golden.json valid?
    # Just starts evaluation in background thread
    thread = threading.Thread(target=run_eval, daemon=True)
    thread.start()
```

**File:** `server/app.py` lines 2715-2788

**Fix:** Add validation before starting eval thread:
```python
try:
    qc = QdrantClient(url=QDRANT_URL)
    qc.get_collections()  # Raises if unreachable
except Exception as e:
    return {"ok": False, "error": f"Qdrant not accessible: {e}"}
```

---

### Issue #4: Baseline Save Without Result Validation
**Severity:** HIGH
**Impact:** Saves baseline with 0% accuracy when Qdrant is down

The save endpoint checks if `results` is None but not if results are valid:

```python
@app.post("/api/eval/baseline/save")
def eval_baseline_save():
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No evaluation results to save")
    # ← But what if results = {error: "...", top1_accuracy: undefined}?
```

**File:** `server/app.py` lines 3372-3376

**Fix:** Validate results contain actual metrics:
```python
if not _EVAL_STATUS["results"] or "top1_accuracy" not in _EVAL_STATUS["results"]:
    raise HTTPException(status_code=400, detail="Invalid evaluation results")
```

---

### Issue #5: Frontend Accepts Error Responses as Results
**Severity:** HIGH
**Impact:** Frontend tries to render error responses as metrics

The `loadEvalResults()` function doesn't validate the response structure:

```javascript
const data = await fetch('/api/eval/results').json();
if (data.error) { throw... }  // ← Only checks for 'error' field
evalResults = data;  // ← Accepts {ok: false, message: "..."} as valid results
renderEvalResults();  // ← Tries to access .top1_accuracy on error object
```

**File:** `gui/js/eval_runner.js` lines 175-185

**Fix:** Validate response before using:
```javascript
if (!data.ok || !data.top1_accuracy !== undefined) {
    throw new Error(data.message || "Invalid results format");
}
```

---

## Learning Reranker Status
**Status:** NOT A STUB - Properly implemented

The learning reranker is:
- Properly initialized in `/retrieval/rerank.py` via `get_reranker()`
- Uses CrossEncoder model from HuggingFace
- Integrated into search pipeline
- NOT causing the evaluation issues

---

## Data Flow Breakdown

### When Qdrant IS Running (Best Case):
```
Run Evaluation
  → search_routed_multi(query) successfully queries Qdrant
  → Returns search results
  → Calculates hits for golden questions
  → Returns {top1_accuracy: 0.XX, topk_accuracy: 0.XX, results: [...]}
  → Frontend renders metrics correctly
  → Can save baseline with valid metrics
```

### When Qdrant IS DOWN (Current Bug):
```
Run Evaluation
  → search_routed_multi(query)
    → QdrantClient tries to connect
    → Exception caught silently
    → Returns empty []
  → All questions get 0 hits
  → Returns {top1_accuracy: 0, topk_accuracy: 0, results: [...]}
  → Frontend either:
    a) Shows "0.0%" (if Qdrant actually IS running but empty)
    b) Shows "NaN%" (if error response not caught)
  → Can "save baseline" with 0% metrics (bad!)
```

### Why User Sees NaN:
If search returns empty results, eval_loop returns `{error: "..."}` or `{ok: false}` in some error path. The frontend doesn't recognize this error format and tries to render it as metrics:

```javascript
renderEvalResults()
  → top1Pct = (undefined * 100).toFixed(1) = "NaN%"
  → topkPct = (undefined * 100).toFixed(1) = "NaN%"
```

---

## Files Requiring Investigation

1. **`/gui/js/eval_runner.js`** - Frontend error handling
   - Line 180: Error response format check
   - Line 184: Response validation before use
   - Line 222-223: Metric calculation without null checks

2. **`/server/app.py`** - Backend endpoints
   - Line 2715: `/api/eval/run` - Missing pre-flight checks
   - Line 2803: `/api/eval/results` - Response format inconsistency
   - Line 3372: `/api/eval/baseline/save` - Missing result validation

3. **`/retrieval/hybrid_search.py`** - Search implementation
   - Line 436-438: Silent exception handling in vector search
   - Line 461-462: Silent exception handling in BM25 search
   - Line 420-462: No Qdrant connectivity check

4. **`/eval/eval_loop.py`** - Evaluation runner
   - Lines 56-90: Returns results but doesn't validate preconditions

---

## Reproduction Steps

1. **Kill Qdrant:** `docker stop qdrant` (or verify it's not running)
2. **Click "Run Full Evaluation"** in GUI
3. **Wait for completion** - backend runs but gets no search results
4. **Observe:** Either NaN metrics or 0% metrics depending on error handling
5. **Click "Save Baseline"** - either fails with error or saves 0% baseline

---

## Next Steps

These issues should be fixed in order:

1. **Issue #3** - Add Qdrant pre-flight check to `/api/eval/run`
2. **Issue #2** - Add error logging to search failures
3. **Issue #1** - Fix frontend error response handling
4. **Issue #4** - Add result validation to baseline save
5. **Issue #5** - Add response format validation to frontend

See `evaluation_nan_debug_findings.md` for detailed analysis and code locations.
