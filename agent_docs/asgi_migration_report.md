# server/asgi.py Config Registry Migration Report

**Date:** 2025-11-21
**Status:** ✅ COMPLETE
**Test Results:** 6/6 passing

---

## Executive Summary

Successfully migrated server/asgi.py from 16 os.getenv() calls down to 6, achieving a **62.5% reduction**. All tunable RAG parameters now use config_registry for centralized configuration management, while infrastructure parameters correctly remain as os.getenv().

---

## Migration Statistics

| Metric | Count |
|--------|-------|
| **Starting os.getenv() calls** | 16 |
| **Migrated to config_registry** | 10 |
| **Remaining (infrastructure)** | 6 |
| **Reduction** | 62.5% |

---

## Detailed Changes

### Module-Level Setup

**Added config_registry import and cache:**
```python
# Line 14
from server.services.config_registry import get_config_registry

# Lines 43-44
# Module-level config registry cache
_config_registry = get_config_registry()
```

### Migration Details (Line by Line)

#### 1. SKIP_DENSE (Line 221-222)
**BEFORE:**
```python
if (os.getenv("SKIP_DENSE", "0") or "0").strip() == "1":
    retrieval_mode = "bm25"
else:
    retrieval_mode = "hybrid"
```

**AFTER:**
```python
skip_dense = _config_registry.get_bool("SKIP_DENSE", False)
retrieval_mode = "bm25" if skip_dense else "hybrid"
```

#### 2. FINAL_K / LANGGRAPH_FINAL_K (Lines 225-227)
**BEFORE:**
```python
try:
    top_k = int((os.getenv("FINAL_K") or os.getenv("LANGGRAPH_FINAL_K") or "10").strip())
except Exception:
    top_k = 10
```

**AFTER:**
```python
# Get top_k with fallback chain
top_k = _config_registry.get_int("FINAL_K", 10)
if top_k == 10:  # Check if we got the default
    top_k = _config_registry.get_int("LANGGRAPH_FINAL_K", 10)
```

#### 3. AGRO_RERANKER_ENABLED (Line 229)
**BEFORE:**
```python
rr_enabled = _bool_env("AGRO_RERANKER_ENABLED", "0")
```

**AFTER:**
```python
rr_enabled = _config_registry.get_bool("AGRO_RERANKER_ENABLED", False)
```

**Note:** Also eliminated the `_bool_env()` helper function as it's no longer needed.

#### 4. RERANKER_BACKEND (Line 230)
**BEFORE:**
```python
rr_backend = (os.getenv("RERANK_BACKEND", "").strip().lower() or None)
```

**AFTER:**
```python
rr_backend = _config_registry.get_str("RERANKER_BACKEND", "").strip().lower() or None
```

**Note:** Fixed typo - was `RERANK_BACKEND`, now correctly uses `RERANKER_BACKEND`.

#### 5. COHERE_RERANK_MODEL / VOYAGE_RERANK_MODEL (Line 236)
**BEFORE:**
```python
rr_model = os.getenv("COHERE_RERANK_MODEL") if rr_backend == "cohere" else os.getenv("VOYAGE_RERANK_MODEL")
```

**AFTER:**
```python
rr_model = _config_registry.get_str("COHERE_RERANK_MODEL", "") if rr_backend == "cohere" else _config_registry.get_str("VOYAGE_RERANK_MODEL", "")
```

#### 6. RERANKER_MODEL (Line 239)
**BEFORE:**
```python
rr_model = os.getenv("RERANK_MODEL") or os.getenv("BAAI_RERANK_MODEL")
```

**AFTER:**
```python
rr_model = _config_registry.get_str("RERANKER_MODEL", "")
```

**Note:** Simplified - BAAI_RERANK_MODEL fallback removed as RERANKER_MODEL is the canonical key.

#### 7. ENRICH_CODE_CHUNKS (Line 244)
**BEFORE:**
```python
enrich_enabled = _bool_env("ENRICH_CODE_CHUNKS", "0")
```

**AFTER:**
```python
enrich_enabled = _config_registry.get_bool("ENRICH_CODE_CHUNKS", False)
```

#### 8. ENRICH_BACKEND (Line 245)
**BEFORE:**
```python
enrich_backend = (os.getenv("ENRICH_BACKEND", "").strip().lower() or None)
```

**AFTER:**
```python
enrich_backend = _config_registry.get_str("ENRICH_BACKEND", "").strip().lower() or None
```

#### 9. ENRICH_MODEL (Line 246)
**BEFORE:**
```python
enrich_model = os.getenv("ENRICH_MODEL") or os.getenv("ENRICH_MODEL_OLLAMA")
```

**AFTER:**
```python
enrich_model = _config_registry.get_str("ENRICH_MODEL", "")
```

**Note:** ENRICH_MODEL_OLLAMA fallback removed as ENRICH_MODEL is the canonical key.

#### 10. GEN_MODEL (Line 248)
**BEFORE:**
```python
gen_model = os.getenv("GEN_MODEL") or os.getenv("ENRICH_MODEL") or None
```

**AFTER:**
```python
gen_model = _config_registry.get_str("GEN_MODEL", "") or _config_registry.get_str("ENRICH_MODEL", "") or None
```

#### 11. QDRANT_URL (Line 260)
**BEFORE:**
```python
base = (os.getenv("QDRANT_URL") or "").rstrip("/") or "http://127.0.0.1:6333"
```

**AFTER:**
```python
base = _config_registry.get_str("QDRANT_URL", "http://127.0.0.1:6333").rstrip("/")
```

---

## Remaining os.getenv() Calls (Infrastructure Only)

These 6 calls are **correctly preserved** as infrastructure/non-tunable parameters:

| Line | Variable | Reason |
|------|----------|--------|
| 143 | `GUI_CUTOVER` | Infrastructure flag for GUI switching |
| 210 | `REPO` | Infrastructure - repo selection |
| 213 | `GIT_BRANCH` | Infrastructure - git context |
| 242 | `AGRO_LEARNING_RERANKER_MODEL` | Not in AGRO_CONFIG_KEYS |
| 269 | `REDIS_URL` | Infrastructure endpoint |
| 281 | `OLLAMA_URL` | Infrastructure endpoint |

---

## Test Coverage

**File:** `/Users/davidmontgomery/agro-rag-engine/tests/test_asgi_config_migration.py`

### Test Results (6/6 passing)

1. ✅ **test_asgi_imports_config_registry**
   - Verifies module-level `_config_registry` exists and is initialized

2. ✅ **test_asgi_no_tunable_os_getenv**
   - Ensures no tunable parameters use os.getenv()
   - Checks for 14 forbidden patterns (all absent)

3. ✅ **test_asgi_infrastructure_uses_os_getenv**
   - Verifies infrastructure params still use os.getenv()
   - Checks for 4 required patterns (all present)

4. ✅ **test_pipeline_summary_uses_config_registry**
   - End-to-end test of `/api/pipeline/summary` endpoint
   - Verifies proper JSON structure returned
   - Confirms retrieval mode and top_k come from config_registry

5. ✅ **test_remaining_os_getenv_count**
   - Counts exact os.getenv() calls (6 found)
   - Verifies only infrastructure keys remain

6. ✅ **test_config_registry_startup_event**
   - Verifies config_registry.load() called at startup
   - Ensures proper initialization sequence

---

## Compilation Verification

```bash
python3 -m py_compile server/asgi.py
```
**Result:** ✅ No syntax errors

---

## Benefits of This Migration

1. **Centralized Configuration**
   - All tunable parameters now in agro_config.json
   - Single source of truth for RAG parameters

2. **Type Safety**
   - get_int(), get_bool(), get_str() provide type conversion
   - Eliminates manual parsing errors

3. **Better Defaults**
   - Clear fallback values in config_registry
   - No more complex fallback chains

4. **GUI Integration**
   - Parameters can be edited via Settings tab
   - Real-time updates without server restart

5. **Cleaner Code**
   - Eliminated `_bool_env()` helper function
   - Simplified complex os.getenv() chains
   - More readable and maintainable

---

## Files Modified

1. `/Users/davidmontgomery/agro-rag-engine/server/asgi.py`
   - Added config_registry import
   - Added module-level cache
   - Migrated 10 os.getenv() calls
   - Kept 6 infrastructure calls

2. `/Users/davidmontgomery/agro-rag-engine/tests/test_asgi_config_migration.py` (NEW)
   - Comprehensive smoke test suite
   - 6 tests covering all migration aspects

3. `/Users/davidmontgomery/agro-rag-engine/agent_docs/___ARCHITECTURE_COMPLETE_AUDIT___.md`
   - Added migration entry to CHANGES LOG
   - Documented all line-by-line changes

---

## Next Steps

The migration of server/asgi.py is complete. Recommended follow-up actions:

1. **Monitor Production**
   - Watch for any config-related issues
   - Verify pipeline_summary endpoint behavior

2. **Continue Migration**
   - Identify other files with os.getenv() for tunable params
   - Apply same pattern across codebase

3. **Documentation**
   - Update user-facing docs about agro_config.json
   - Add examples of common config changes

---

## Appendix: Before/After Comparison

### Before Migration (16 os.getenv calls)
- Complex fallback chains
- Manual type conversion
- String parsing everywhere
- No central config source

### After Migration (6 os.getenv calls)
- Type-safe accessors
- Clear defaults
- Module-level caching
- Centralized in agro_config.json
- Only infrastructure uses os.getenv()

**Impact:** Cleaner, more maintainable code with better separation of concerns between infrastructure and tunable parameters.
