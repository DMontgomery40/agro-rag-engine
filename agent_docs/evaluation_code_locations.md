# Evaluation Runner Issues - Exact Code Locations

## Quick Reference: Issue Locations

### Issue #1: Frontend/Backend API Mismatch

**File:** `/Users/davidmontgomery/agro-rag-engine/gui/js/eval_runner.js`

**Problem Area - Lines 175-185:**
```javascript
async function loadEvalResults() {
    try {
        const response = await fetch('/api/eval/results');
        const data = await response.json();

        if (data.error) {  // ← LINE 180: Only checks for 'error' field
            throw new Error(data.error);
        }

        evalResults = data;  // ← LINE 184: Accepts any response as valid results
        renderEvalResults();
```

**Backend Response Mismatch - `/Users/davidmontgomery/agro-rag-engine/server/app.py:2803-2805`:**
```python
@app.get("/api/eval/results")
def eval_results() -> Dict[str, Any]:
    """Get last evaluation results."""
    if _EVAL_STATUS["results"] is None:
        return {"ok": False, "message": "No evaluation results available"}  # ← Backend uses 'ok' + 'message'
    return _EVAL_STATUS["results"]
```

**Impact Area - Lines 222-223:**
```javascript
const top1Pct = (evalResults.top1_accuracy * 100).toFixed(1) + '%';  // ← undefined * 100 = NaN
const topkPct = (evalResults.topk_accuracy * 100).toFixed(1) + '%';  // ← undefined * 100 = NaN
```

---

### Issue #2: Silent Search Failure

**File:** `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py`

**Vector Search Silent Failure - Lines 436-438:**
```python
# SPAN: Vector Search (Qdrant)
if _tracer:
    with _tracer.start_as_current_span("agro.vector_search", attributes={"query": expanded_query, "topk": topk_dense}) as span:
        qc = QdrantClient(url=QDRANT_URL)
        coll = os.getenv('COLLECTION_NAME', f'code_chunks_{repo}')
        try:
            e = _get_embedding(expanded_query, kind="query")
            backend = (os.getenv('VECTOR_BACKEND','qdrant') or 'qdrant').lower()
            if backend != 'faiss':
                dres = qc.query_points(  # ← Can raise if Qdrant unavailable
                    collection_name=coll,
                    query=e,
                    using='dense',
                    limit=topk_dense,
                    with_payload=models.PayloadSelectorInclude(include=['file_path', 'start_line', 'end_line', 'language', 'layer', 'repo', 'hash', 'id'])
                )
                points = getattr(dres, 'points', dres)
                dense_pairs = [(str(p.id), dict(p.payload)) for p in points]
                span.set_attribute("results_count", len(dense_pairs))
        except Exception as ex:  # ← LINE 436: Exception caught
            span.set_attribute("error", str(ex))
            dense_pairs = []  # ← LINE 438: Silently returns empty
```

**Non-traced Vector Search Silent Failure - Lines 441-462:**
```python
else:
    # No tracing
    qc = QdrantClient(url=QDRANT_URL)
    coll = os.getenv('COLLECTION_NAME', f'code_chunks_{repo}')
    try:
        e = _get_embedding(expanded_query, kind="query")
    except Exception:
        e = []
    try:
        backend = (os.getenv('VECTOR_BACKEND','qdrant') or 'qdrant').lower()
        if backend == 'faiss':
            dense_pairs = []
        else:
            dres = qc.query_points(  # ← Can raise if Qdrant unavailable
                collection_name=coll,
                query=e,
                using='dense',
                limit=topk_dense,
                with_payload=models.PayloadSelectorInclude(include=['file_path', 'start_line', 'end_line', 'language', 'layer', 'repo', 'hash', 'id'])
            )
            points = getattr(dres, 'points', dres)
            dense_pairs = [(str(p.id), dict(p.payload)) for p in points]
    except Exception:  # ← LINE 461: Exception caught silently
        dense_pairs = []  # ← LINE 462: No logging, silently fails
```

**BM25 Search Error Handling - Lines 490-510:**
```python
else:
    idx_dir = os.path.join(out_dir(repo), 'bm25_index')
    retriever = bm25s.BM25.load(idx_dir)  # ← Can fail if index doesn't exist
    tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
    tokens = tokenizer.tokenize([expanded_query])
    ids, _ = retriever.retrieve(tokens, k=topk_sparse)
    ids = ids.tolist()[0] if hasattr(ids, 'tolist') else list(ids[0])
    id_map = _load_bm25_map(idx_dir)
    by_chunk_id = {str(c['id']): c for c in chunks}
    sparse_pairs = []
    for i in ids:
        if id_map is not None:
            if 0 <= i < len(id_map):
                pid_or_cid = id_map[i]
                key = str(pid_or_cid)
                if key in by_chunk_id:
                    sparse_pairs.append((key, by_chunk_id[key]))
```

---

### Issue #3: Missing Qdrant Pre-flight Check

**File:** `/Users/davidmontgomery/agro-rag-engine/server/app.py`

**Initialization - Lines 2707-2713:**
```python
_EVAL_STATUS: Dict[str, Any] = {
    "running": False,
    "progress": 0,
    "total": 0,
    "current_question": "",
    "results": None
}
```

**Eval Run Endpoint - Lines 2715-2788:**
```python
@app.post("/api/eval/run")
def eval_run(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """Run full evaluation suite in background."""
    # ← NO PRE-FLIGHT CHECKS HERE
    global _EVAL_STATUS
    import threading

    if _EVAL_STATUS["running"]:
        return {"ok": False, "error": "Evaluation already running"}

    use_multi = payload.get("use_multi", os.getenv("EVAL_MULTI", "1") == "1")
    final_k = int(payload.get("final_k") or os.getenv("EVAL_FINAL_K", "5"))

    def run_eval():
        global _EVAL_STATUS
        _EVAL_STATUS = {
            "running": True,
            "progress": 0,
            "total": 0,
            "current_question": "",
            "results": None
        }

        try:
            # Temporarily set env vars
            old_multi = os.environ.get("EVAL_MULTI")
            old_k = os.environ.get("EVAL_FINAL_K")
            old_gp = os.environ.get("GOLDEN_PATH")

            # Ensure GOLDEN_PATH points to repo-standard path if not set or invalid
            gp = old_gp or "data/golden.json"
            try:
                from pathlib import Path as _P
                if not _P(gp).exists():
                    # If legacy value like 'golden.json', try under data/
                    candidate = _P('data') / _P(gp).name
                    gp = str(candidate)
            except Exception:
                gp = "data/golden.json"

            print(f"[eval] Using GOLDEN_PATH={gp}")
            os.environ["GOLDEN_PATH"] = gp
            from eval.eval_loop import run_eval_with_results
            os.environ["EVAL_MULTI"] = "1" if use_multi else "0"
            os.environ["EVAL_FINAL_K"] = str(final_k)

            try:
                results = run_eval_with_results()  # ← Runs without checking Qdrant first
                _EVAL_STATUS["results"] = results
                _EVAL_STATUS["progress"] = results.get("total", 0)
                _EVAL_STATUS["total"] = results.get("total", 0)
            finally:
                # Restore env
                if old_multi is not None:
                    os.environ["EVAL_MULTI"] = old_multi
                elif "EVAL_MULTI" in os.environ:
                    del os.environ["EVAL_MULTI"]
                if old_k is not None:
                    os.environ["EVAL_FINAL_K"] = old_k
                elif "EVAL_FINAL_K" in os.environ:
                    del os.environ["EVAL_FINAL_K"]
                if old_gp is not None:
                    os.environ["GOLDEN_PATH"] = old_gp
                elif "GOLDEN_PATH" in os.environ:
                    del os.environ["GOLDEN_PATH"]

        except Exception as e:
            _EVAL_STATUS["results"] = {"error": str(e)}
        finally:
            _EVAL_STATUS["running"] = False

    thread = threading.Thread(target=run_eval, daemon=True)
    thread.start()

    return {"ok": True, "message": "Evaluation started"}
```

---

### Issue #4: Baseline Save Without Validation

**File:** `/Users/davidmontgomery/agro-rag-engine/server/app.py:3372-3386`

```python
@app.post("/api/eval/baseline/save")
def eval_baseline_save() -> Dict[str, Any]:
    """Save current evaluation results as baseline."""
    if _EVAL_STATUS["results"] is None:  # ← Only checks if None
        raise HTTPException(status_code=400, detail="No evaluation results to save")

    # Prefer data/evals, fallback to root if overridden or missing
    env_bp = os.getenv("BASELINE_PATH")
    if env_bp:
        baseline_path = Path(env_bp)
    else:
        candidate = Path("data/evals/eval_baseline.json")
        baseline_path = candidate if candidate.parent.exists() else Path("eval_baseline.json")
    _write_json(baseline_path, _EVAL_STATUS["results"])
    return {"ok": True, "path": str(baseline_path)}
```

**Issue:** Doesn't validate that `results` contains actual metrics:
- Could be `{"error": "..."}`
- Could be `{"ok": False, "message": "..."}`
- Could have `top1_accuracy: 0` (which is technically valid but should be questioned)

---

### Issue #5: Frontend Acceptance of Invalid Responses

**File:** `/Users/davidmontgomery/agro-rag-engine/gui/js/eval_runner.js:214-229`

```javascript
// Render evaluation results
function renderEvalResults() {
    if (!evalResults) return;  // ← Only checks if falsy, not if it's an error response

    // Show results section
    document.getElementById('eval-results').style.display = 'block';

    // Overall metrics
    const top1Pct = (evalResults.top1_accuracy * 100).toFixed(1) + '%';  // ← LINE 222
    const topkPct = (evalResults.topk_accuracy * 100).toFixed(1) + '%';  // ← LINE 223
    const duration = evalResults.duration_secs + 's';

    document.getElementById('eval-top1-acc').textContent = top1Pct;
    document.getElementById('eval-topk-acc').textContent = topkPct;
    document.getElementById('eval-duration').textContent = duration;

    // Per-question details
    const detailsContainer = document.getElementById('eval-details');
    const results = evalResults.results || [];
    const failures = results.filter(r => !r.topk_hit);
    const passes = results.filter(r => r.topk_hit);
```

**Problem:**
- Line 216: `if (!evalResults) return;` - passes if object exists, even if it's `{ok: false}`
- Line 222: Assumes `top1_accuracy` exists, will be `undefined` if error response
- `undefined * 100 = NaN`

---

## Supporting Evidence Files

### Golden Questions (Valid)
- **Path:** `/Users/davidmontgomery/agro-rag-engine/data/golden.json`
- **Size:** 23,339 bytes
- **Format:** Valid JSON array with test questions
- **Sample:** Questions like "Where is the hybrid search implementation?" with expected file paths

### Eval Loop (Correctly Implemented)
- **Path:** `/Users/davidmontgomery/agro-rag-engine/eval/eval_loop.py:20-91`
- **Function:** `run_eval_with_results()`
- **Returns:** Dict with `top1_accuracy`, `topk_accuracy`, `results` array
- **Correctly:** Handles empty search results (produces 0% accuracy)

### Learning Reranker (NOT a Stub)
- **Primary Path:** `/Users/davidmontgomery/agro-rag-engine/retrieval/rerank.py:54-62`
- **Backend Model:** `/Users/davidmontgomery/agro-rag-engine/server/reranker.py:31-59`
- **Status:** Properly initialized, uses CrossEncoder from HuggingFace
- **Default Model:** `cross-encoder/ms-marco-MiniLM-L-12-v2`

---

## Environment Variables Involved

```bash
# Search configuration
GOLDEN_PATH='data/golden.json'
BASELINE_PATH='data/evals/eval_baseline.json'
QDRANT_URL='http://localhost:6333'  # Likely
COLLECTION_NAME='code_chunks_{repo}'

# Evaluation configuration
EVAL_MULTI='1'  # Enable multi-query expansion
EVAL_FINAL_K='5'
EVAL_MULTI_M='10'

# Search parameters
TOPK_SPARSE='75'
TOPK_DENSE='75'
HYDRATION_MODE='lazy'
USE_SEMANTIC_SYNONYMS='1'

# Reranker configuration
RERANKER_MODEL='cross-encoder/ms-marco-MiniLM-L-12-v2'
AGRO_RERANKER_MODEL_PATH='cross-encoder/ms-marco-MiniLM-L-12-v2'
AGRO_RERANKER_ALPHA='0.7'
AGRO_RERANKER_TOPN='50'
```

---

## Call Chain

```
User clicks "Run Full Evaluation"
  ↓
gui/js/eval_runner.js:51 runEvaluation()
  ↓
POST /api/eval/run (server/app.py:2715)
  ↓
Spawns background thread with run_eval()
  ↓
eval/eval_loop.py:20 run_eval_with_results()
  ↓
For each question in golden.json:
  retrieval/hybrid_search.py:763 search_routed_multi()
    ↓
    retrieval/hybrid_search.py:783-785 search() x m variants
      ↓
      retrieval/hybrid_search.py:407-462 _search_impl()
        ├─ Vector: QdrantClient.query_points() (LINE 452)
        │   └─ SILENTLY FAILS if Qdrant unreachable (LINE 461)
        └─ Sparse: BM25 retrieval (LINE 492)
  ↓
Sets hits_top1/hits_topk based on search results
  ↓
Returns {top1_accuracy, topk_accuracy, results}
  ↓
GET /api/eval/results (server/app.py:2800)
  ↓
gui/js/eval_runner.js:175 loadEvalResults()
  ↓
Checks data.error (NOT data.ok) → ERROR NOT CAUGHT
  ↓
gui/js/eval_runner.js:215 renderEvalResults()
  ↓
Accesses undefined.top1_accuracy * 100 → NaN
```

---

## Summary Table

| Issue | File | Lines | Type | Fix Priority |
|-------|------|-------|------|--------------|
| Frontend error check | `gui/js/eval_runner.js` | 180 | Mismatch | 1 |
| Silent vector search fail | `retrieval/hybrid_search.py` | 436-438, 461-462 | Error handling | 2 |
| No Qdrant pre-check | `server/app.py` | 2715-2788 | Validation | 2 |
| Unsafe metric calculation | `gui/js/eval_runner.js` | 222-223 | Null check | 3 |
| Invalid response validation | `server/app.py` | 3372-3376 | Validation | 3 |
| No response format check | `gui/js/eval_runner.js` | 184 | Validation | 4 |

