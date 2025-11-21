# Evaluation NaN Values and Baseline Save Error - Root Cause Analysis

## Problem Summary
The evaluation runner is showing NaN values for TOP-1 and TOP-K accuracy metrics, and failing to save baseline with "No evaluation results to save" error. The GUI buttons appear functional but no actual evaluation metrics are being generated.

---

## Root Causes Identified

### 1. **Frontend/Backend API Response Format Mismatch** (Critical)

**Location:** `/Users/davidmontgomery/agro-rag-engine/gui/js/eval_runner.js:175-185`

**Issue:** The frontend's `loadEvalResults()` function checks for `data.error` but the backend returns `data.ok` and `data.message`:

```javascript
// Frontend (line 180-182)
if (data.error) {
    throw new Error(data.error);
}

// Backend app.py (line 2803-2805)
def eval_results() -> Dict[str, Any]:
    if _EVAL_STATUS["results"] is None:
        return {"ok": False, "message": "No evaluation results available"}
    return _EVAL_STATUS["results"]
```

**Problem:** When evaluation hasn't run or failed, the backend returns:
```json
{"ok": false, "message": "No evaluation results available"}
```

The frontend doesn't recognize this error format and tries to render it as a results object, causing line 222-223 to execute:

```javascript
const top1Pct = (evalResults.top1_accuracy * 100).toFixed(1) + '%';
const topkPct = (evalResults.topk_accuracy * 100).toFixed(1) + '%';
```

Since `evalResults.top1_accuracy` is `undefined` (the error response doesn't have these fields), JavaScript produces:
```
undefined * 100 = NaN
```

**Fix Required:** Update frontend error checking to handle both response formats:
```javascript
if (data.error || !data.ok || !data.top1_accuracy) {
    throw new Error(data.error || data.message || 'No evaluation results');
}
```

---

### 2. **Silent Failure When Search Returns Empty Results** (Critical)

**Location:** `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py:436-462`

**Issue:** When Qdrant is unavailable or unreachable, the search function silently returns empty results:

```python
# Vector search (lines 436-438)
except Exception as ex:
    span.set_attribute("error", str(ex))
    dense_pairs = []  # Silent catch - exception ignored

# BM25 search (lines 461-462)
except Exception:
    dense_pairs = []  # Silent catch - no logging
```

**Problem:** If Qdrant is not running (which the user likely has since they mentioned verifying it's "running"), all searches return `[]`. The eval loop then:

1. Gets empty results from search
2. Can't find any paths in results
3. Sets `hits_top1 = 0` and `hits_topk = 0`
4. Returns accuracy of 0 / total_questions

This is technically correct behavior (0% accuracy when there are no search results), but the **real problem** is:

**The backend is NOT validating that Qdrant is accessible before running evaluation.**

The `/api/eval/run` endpoint should check Qdrant connectivity first:

```python
@app.post("/api/eval/run")
def eval_run(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    # MISSING: Check if Qdrant is accessible
    try:
        qc = QdrantClient(url=QDRANT_URL)
        qc.get_collections()  # Will raise if unavailable
    except Exception as e:
        return {"ok": False, "error": f"Qdrant not accessible: {e}"}
```

---

### 3. **Baseline Save Error Due to Uninitialized Results** (Critical)

**Location:** `/Users/davidmontgomery/agro-rag-engine/server/app.py:3372-3376`

**Issue:** The baseline save endpoint checks if `_EVAL_STATUS["results"]` exists:

```python
@app.post("/api/eval/baseline/save")
def eval_baseline_save() -> Dict[str, Any]:
    """Save current evaluation results as baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No evaluation results to save")
```

But `_EVAL_STATUS["results"]` is only populated if:
1. The eval run completes successfully
2. No errors occur during `run_eval_with_results()`

**Problem:** If evaluation never ran or failed silently, `_EVAL_STATUS["results"]` remains `None`, and clicking "Save Baseline" shows the error dialog.

The frontend's `saveBaseline()` function (line 304-308) doesn't validate that results exist:

```javascript
async function saveBaseline() {
    if (!evalResults) {  // This only checks if JS object exists
        alert('No evaluation results to save');
        return;
    }
    // But evalResults might be {ok: false, message: "..."} and still pass this check!
```

---

### 4. **Learning Reranker NOT a Stub** (Investigation Result)

**Status:** VERIFIED - Reranker is properly implemented

- Located in `/Users/davidmontgomery/agro-rag-engine/retrieval/rerank.py` and `/server/reranker.py`
- CrossEncoder model loads from HuggingFace or local path
- Properly initialized on first call via `get_reranker()`
- Used in `search_routed_multi()` at line 805

The reranker is **not the problem**.

---

### 5. **Backend-Side Issue: Missing Qdrant Connectivity Check** (Architecture Issue)

The `/api/eval/run` endpoint should:

1. Validate Qdrant is running and accessible
2. Validate golden.json exists and is valid
3. Return clear error if preconditions fail
4. Only then start the background eval thread

Currently missing validation at **line 2715-2788** in `/Users/davidmontgomery/agro-rag-engine/server/app.py`.

---

## Data Flow Analysis

### Current (Broken) Flow:

```
GUI: "Run Full Evaluation"
  ↓
POST /api/eval/run
  ↓
eval_loop.py: run_eval_with_results()
  ↓
search_routed_multi(query) → search()
  ↓
Qdrant unavailable → Exception caught silently
  ↓
Returns empty [] results
  ↓
All questions get 0 hits
  ↓
Results: {top1_accuracy: 0, topk_accuracy: 0, results: [...]}
  ↓
GET /api/eval/results → Returns results with all zeros
  ↓
Frontend: renderEvalResults()
  ↓
NaN from 0 * 100 (if path through error handler)
  ↓
OR Shows "0.0%" (if Qdrant is actually running but has no data)

"Save Baseline" clicked
  ↓
POST /api/eval/baseline/save
  ↓
Backend returns results with 0% accuracy
  ↓
Saves baseline with 0% metrics
```

---

## Summary of Issues to Fix

| Issue | Severity | Location | Type |
|-------|----------|----------|------|
| Frontend error response handling mismatch | **Critical** | `gui/js/eval_runner.js:180` | Frontend/Backend contract |
| Silent failure in search when Qdrant down | **Critical** | `retrieval/hybrid_search.py:461` | Error handling |
| Missing Qdrant pre-flight check in eval | **Critical** | `server/app.py:2715` | Missing validation |
| Backend doesn't validate results before save | **High** | `server/app.py:3372` | Missing validation |
| Frontend accepts error responses as results | **High** | `gui/js/eval_runner.js:184` | Missing validation |

---

## Evidence

1. **Backend returns error response format that frontend doesn't recognize:**
   - File: `/Users/davidmontgomery/agro-rag-engine/server/app.py:2803-2805`
   - File: `/Users/davidmontgomery/agro-rag-engine/gui/js/eval_runner.js:180`

2. **Search silently fails when Qdrant unavailable:**
   - File: `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py:436-462`
   - No error logging or user notification

3. **No Qdrant connectivity check before eval:**
   - File: `/Users/davidmontgomery/agro-rag-engine/server/app.py:2715-2788`
   - Missing validation code

4. **Golden file exists and is valid:**
   - Path: `/Users/davidmontgomery/agro-rag-engine/data/golden.json`
   - Format: Valid JSON array with test questions

---

## Recommendations

### Immediate Fixes Required:

1. **Fix frontend error handling** - Check for both `error` and `ok` fields
2. **Add Qdrant pre-flight check** - Validate connectivity before eval starts
3. **Add search result validation** - Log when search returns empty due to Qdrant failure
4. **Update baseline save validation** - Verify results have valid metrics before saving

### Testing Approach:

1. Start Qdrant and verify it's responsive: `curl http://localhost:6333/health`
2. Run evaluation and check if search returns real results
3. Verify eval results contain numeric accuracy values (not NaN)
4. Test save baseline with valid results
5. Test error scenarios with Qdrant down to ensure proper error messages

### Prevention:

- Add smoke tests for Qdrant connectivity
- Add pre-flight validation to all eval endpoints
- Standardize API error response format across backend
- Add request/response validation middleware
