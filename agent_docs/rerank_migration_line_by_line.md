# retrieval/rerank.py - Line-by-Line Migration Details

**Status:** ✅ Migration Complete (Already Done by Previous Agent)
**Verification:** ✅ All tests passing (7/7)

---

## Summary

The file `retrieval/rerank.py` has been successfully migrated from `os.getenv()` to `config_registry`. This document provides line-by-line details of the migration pattern.

**Note:** The migration was completed by Agent 5 on 2025-11-21. This verification confirms the migration is correct and complete.

---

## Migration Pattern Overview

### Original Pattern (NOT USED ANYMORE)
```python
# Direct os.getenv() calls scattered throughout code
model_name = os.getenv('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
batch_size = int(os.getenv('AGRO_RERANKER_BATCH', '16'))
```

### New Pattern (CURRENT)
```python
# Module-level cache loaded once at import
_RERANKER_MODEL = None
_AGRO_RERANKER_BATCH = None

def _load_cached_config():
    global _RERANKER_MODEL, _AGRO_RERANKER_BATCH
    if _config_registry is None:
        # Fallback when registry unavailable
        _RERANKER_MODEL = os.getenv('RERANKER_MODEL', 'cross-encoder/...')
        _AGRO_RERANKER_BATCH = int(os.getenv('AGRO_RERANKER_BATCH', '16'))
    else:
        # Use registry when available
        _RERANKER_MODEL = _config_registry.get_str('RERANKER_MODEL', 'cross-encoder/...')
        _AGRO_RERANKER_BATCH = _config_registry.get_int('AGRO_RERANKER_BATCH', 16)

# Initialize on module import
_load_cached_config()

# Usage in functions
model_name = _RERANKER_MODEL or DEFAULT_MODEL
```

---

## Line-by-Line Changes

### Section 1: Config Registry Import (Lines 23-27)

**Added:**
```python
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None
```

**Purpose:** Import config_registry with fallback if unavailable

---

### Section 2: Module-Level Cache Variables (Lines 30-44)

**Added 15 cached variables:**
```python
_RERANKER_MODEL = None                      # Line 30
_AGRO_RERANKER_ENABLED = None               # Line 31
_AGRO_RERANKER_ALPHA = None                 # Line 32
_AGRO_RERANKER_TOPN = None                  # Line 33
_AGRO_RERANKER_BATCH = None                 # Line 34
_AGRO_RERANKER_MAXLEN = None                # Line 35
_AGRO_RERANKER_RELOAD_ON_CHANGE = None      # Line 36
_AGRO_RERANKER_RELOAD_PERIOD_SEC = None     # Line 37
_COHERE_RERANK_MODEL = None                 # Line 38
_VOYAGE_RERANK_MODEL = None                 # Line 39
_RERANKER_BACKEND = None                    # Line 40
_RERANKER_TIMEOUT = None                    # Line 41
_RERANK_BACKEND = None                      # Line 42
_RERANK_INPUT_SNIPPET_CHARS = None          # Line 43
_COHERE_RERANK_TOP_N = None                 # Line 44
```

**Purpose:** Create module-level cache for all reranker config params

---

### Section 3: _load_cached_config() Function (Lines 46-86)

**Lines 46-52: Function Declaration and Globals**
```python
def _load_cached_config():
    """Load all reranking config values into module-level cache."""
    global _RERANKER_MODEL, _AGRO_RERANKER_ENABLED, _AGRO_RERANKER_ALPHA, _AGRO_RERANKER_TOPN
    global _AGRO_RERANKER_BATCH, _AGRO_RERANKER_MAXLEN, _AGRO_RERANKER_RELOAD_ON_CHANGE
    global _AGRO_RERANKER_RELOAD_PERIOD_SEC, _COHERE_RERANK_MODEL, _VOYAGE_RERANK_MODEL
    global _RERANKER_BACKEND, _RERANKER_TIMEOUT, _RERANK_BACKEND, _RERANK_INPUT_SNIPPET_CHARS
    global _COHERE_RERANK_TOP_N
```

**Lines 54-70: Fallback Block (When Registry Unavailable)**
```python
    if _config_registry is None:
        # Fallback to env vars if registry not available
        _RERANKER_MODEL = os.getenv('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
        _AGRO_RERANKER_ENABLED = int(os.getenv('AGRO_RERANKER_ENABLED', '1') or '1')
        _AGRO_RERANKER_ALPHA = float(os.getenv('AGRO_RERANKER_ALPHA', '0.7') or '0.7')
        _AGRO_RERANKER_TOPN = int(os.getenv('AGRO_RERANKER_TOPN', '50') or '50')
        _AGRO_RERANKER_BATCH = int(os.getenv('AGRO_RERANKER_BATCH', '16') or '16')
        _AGRO_RERANKER_MAXLEN = int(os.getenv('AGRO_RERANKER_MAXLEN', '512') or '512')
        _AGRO_RERANKER_RELOAD_ON_CHANGE = int(os.getenv('AGRO_RERANKER_RELOAD_ON_CHANGE', '0') or '0')
        _AGRO_RERANKER_RELOAD_PERIOD_SEC = int(os.getenv('AGRO_RERANKER_RELOAD_PERIOD_SEC', '60') or '60')
        _COHERE_RERANK_MODEL = os.getenv('COHERE_RERANK_MODEL', 'rerank-3.5')
        _VOYAGE_RERANK_MODEL = os.getenv('VOYAGE_RERANK_MODEL', 'rerank-2')
        _RERANKER_BACKEND = os.getenv('RERANKER_BACKEND', 'local')
        _RERANKER_TIMEOUT = int(os.getenv('RERANKER_TIMEOUT', '10') or '10')
        _RERANK_BACKEND = os.getenv('RERANK_BACKEND', 'local')
        _RERANK_INPUT_SNIPPET_CHARS = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '600') or '600')
        _COHERE_RERANK_TOP_N = int(os.getenv('COHERE_RERANK_TOP_N', '50') or '50')
```

**Migration Notes:**
- 15 `os.getenv()` calls preserved in fallback block
- Uses manual type conversions: `int()`, `float()`
- Preserves `or` fallback for empty string handling

**Lines 71-86: Config Registry Block (When Registry Available)**
```python
    else:
        _RERANKER_MODEL = _config_registry.get_str('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
        _AGRO_RERANKER_ENABLED = _config_registry.get_int('AGRO_RERANKER_ENABLED', 1)
        _AGRO_RERANKER_ALPHA = _config_registry.get_float('AGRO_RERANKER_ALPHA', 0.7)
        _AGRO_RERANKER_TOPN = _config_registry.get_int('AGRO_RERANKER_TOPN', 50)
        _AGRO_RERANKER_BATCH = _config_registry.get_int('AGRO_RERANKER_BATCH', 16)
        _AGRO_RERANKER_MAXLEN = _config_registry.get_int('AGRO_RERANKER_MAXLEN', 512)
        _AGRO_RERANKER_RELOAD_ON_CHANGE = _config_registry.get_int('AGRO_RERANKER_RELOAD_ON_CHANGE', 0)
        _AGRO_RERANKER_RELOAD_PERIOD_SEC = _config_registry.get_int('AGRO_RERANKER_RELOAD_PERIOD_SEC', 60)
        _COHERE_RERANK_MODEL = _config_registry.get_str('COHERE_RERANK_MODEL', 'rerank-3.5')
        _VOYAGE_RERANK_MODEL = _config_registry.get_str('VOYAGE_RERANK_MODEL', 'rerank-2')
        _RERANKER_BACKEND = _config_registry.get_str('RERANKER_BACKEND', 'local')
        _RERANKER_TIMEOUT = _config_registry.get_int('RERANKER_TIMEOUT', 10)
        _RERANK_BACKEND = _config_registry.get_str('RERANK_BACKEND', 'local')
        _RERANK_INPUT_SNIPPET_CHARS = _config_registry.get_int('RERANK_INPUT_SNIPPET_CHARS', 600)
        _COHERE_RERANK_TOP_N = _config_registry.get_int('COHERE_RERANK_TOP_N', 50)
```

**Migration Notes:**
- Uses typed methods: `get_str()`, `get_int()`, `get_float()`
- Default values changed from strings to native types
  - `'1'` → `1`
  - `'0.7'` → `0.7`
  - `'50'` → `50`
- No manual type conversion needed (handled by registry)

---

### Section 4: reload_config() Function (Lines 88-90)

**Added:**
```python
def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()
```

**Purpose:** Allow hot-reload of config values without restarting

---

### Section 5: Module Initialization (Lines 92-93)

**Added:**
```python
# Initialize cache on module import
_load_cached_config()
```

**Purpose:** Load config values immediately when module is imported

---

### Section 6: get_reranker() Usage (Lines 148-170)

**Lines 156-158: Using Cached Values**

**Before (hypothetical):**
```python
model_name = os.getenv('RERANKER_MODEL', DEFAULT_MODEL)
max_length = int(os.getenv('AGRO_RERANKER_MAXLEN', '512'))
```

**After (Current):**
```python
# Use cached config values instead of os.getenv
model_name = _RERANKER_MODEL or DEFAULT_MODEL
max_length = _AGRO_RERANKER_MAXLEN or 512
```

**Migration:**
- Line 157: Comment added explaining cached value usage
- Line 158: `_RERANKER_MODEL` cached variable used
- Line 159: `_AGRO_RERANKER_MAXLEN` cached variable used

---

### Section 7: rerank_results() Usage (Lines 173-398)

**Lines 190-200: Backend Configuration**

**Before (hypothetical):**
```python
backend = os.getenv('RERANK_BACKEND', 'local').lower()
model_name = os.getenv('RERANKER_MODEL', DEFAULT_MODEL)
snippet_local = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '600'))
cohere_model = os.getenv('COHERE_RERANK_MODEL', COHERE_MODEL)
cohere_top_n = int(os.getenv('COHERE_RERANK_TOP_N', '50'))
```

**After (Current):**
```python
# Use cached config values instead of os.getenv
backend = (_RERANK_BACKEND or 'local').lower()
enabled = backend not in ('none', 'off', 'disabled')
model_name = _RERANKER_MODEL or DEFAULT_MODEL
metrics_label = f"cohere:{COHERE_MODEL}" if backend == 'cohere' else f"local:{model_name}"
snippet_local = _RERANK_INPUT_SNIPPET_CHARS or 600
# Cohere typically needs slightly longer snippets
snippet_cohere = min(_RERANK_INPUT_SNIPPET_CHARS + 100, 700) if _RERANK_INPUT_SNIPPET_CHARS else 700
cohere_model = _COHERE_RERANK_MODEL or COHERE_MODEL
cohere_top_n = _COHERE_RERANK_TOP_N or 50
cohere_key_present = bool(os.getenv('COHERE_API_KEY'))
```

**Migration:**
- Line 190: Comment added
- Line 191: `_RERANK_BACKEND` used with fallback
- Line 193: `_RERANKER_MODEL` used with fallback
- Line 195: `_RERANK_INPUT_SNIPPET_CHARS` used with fallback
- Line 197: Complex calculation using `_RERANK_INPUT_SNIPPET_CHARS`
- Line 198: `_COHERE_RERANK_MODEL` used with fallback
- Line 199: `_COHERE_RERANK_TOP_N` used with fallback
- Line 200: **COHERE_API_KEY remains os.getenv()** ✅

**Lines 223: Cohere API Key (PRESERVED)**
```python
api_key = os.getenv('COHERE_API_KEY')
```

**Migration:** ✅ **NOT CHANGED** - Secrets must use os.getenv()

---

## Type Conversion Changes

### Manual Conversions (Fallback Block)

The fallback block preserves manual type conversions for backward compatibility:

| Parameter | Fallback Conversion | Registry Method |
|-----------|---------------------|-----------------|
| RERANKER_MODEL | Direct string | get_str() |
| AGRO_RERANKER_ENABLED | `int(os.getenv(...) or '1')` | get_int() |
| AGRO_RERANKER_ALPHA | `float(os.getenv(...) or '0.7')` | get_float() |
| AGRO_RERANKER_TOPN | `int(os.getenv(...) or '50')` | get_int() |
| AGRO_RERANKER_BATCH | `int(os.getenv(...) or '16')` | get_int() |
| AGRO_RERANKER_MAXLEN | `int(os.getenv(...) or '512')` | get_int() |
| AGRO_RERANKER_RELOAD_ON_CHANGE | `int(os.getenv(...) or '0')` | get_int() |
| AGRO_RERANKER_RELOAD_PERIOD_SEC | `int(os.getenv(...) or '60')` | get_int() |
| COHERE_RERANK_MODEL | Direct string | get_str() |
| VOYAGE_RERANK_MODEL | Direct string | get_str() |
| RERANKER_BACKEND | Direct string | get_str() |
| RERANKER_TIMEOUT | `int(os.getenv(...) or '10')` | get_int() |
| RERANK_BACKEND | Direct string | get_str() |
| RERANK_INPUT_SNIPPET_CHARS | `int(os.getenv(...) or '600')` | get_int() |
| COHERE_RERANK_TOP_N | `int(os.getenv(...) or '50')` | get_int() |

### Default Value Changes

When using config_registry, default values changed from strings to native types:

**String defaults (fallback):**
```python
'1', '0.7', '50', '16', '512', '0', '60', '10', '600', '50'
```

**Native type defaults (registry):**
```python
1, 0.7, 50, 16, 512, 0, 60, 10, 600, 50
```

This eliminates the need for manual type conversion in the registry path.

---

## os.getenv() Accounting

### Total: 19 calls

| Lines | Count | Purpose | Status |
|-------|-------|---------|--------|
| 56-70 | 15 | Fallback when registry unavailable | ✅ Correct |
| 200 | 1 | COHERE_API_KEY secret check | ✅ Correct |
| 223 | 1 | COHERE_API_KEY secret retrieval | ✅ Correct |
| 156, 190 | 2 | Comments (matched by grep) | ✅ Correct |

**All 19 calls are appropriately placed and serve valid purposes.**

---

## Migration Completeness Checklist

- [x] Config registry imported with fallback (lines 23-27)
- [x] 15 cached variables created (lines 30-44)
- [x] _load_cached_config() function implemented (lines 46-86)
- [x] Fallback path uses os.getenv() (lines 54-70)
- [x] Registry path uses _config_registry.get_*() (lines 71-86)
- [x] reload_config() function added (lines 88-90)
- [x] Module initialization added (lines 92-93)
- [x] get_reranker() uses cached values (lines 156-158)
- [x] rerank_results() uses cached values (lines 190-200)
- [x] COHERE_API_KEY remains os.getenv() (lines 200, 223)
- [x] Type conversions handled correctly
- [x] Default values match expected types
- [x] Comments added for clarity
- [x] No unexpected os.getenv() calls

---

## Verification Results

### Syntax Check
```bash
$ python3 -m py_compile retrieval/rerank.py
# No errors
```

### Import Check
```bash
$ python3 -c "from retrieval.rerank import *"
# Success
```

### Config Values Check
```python
from retrieval import rerank

rerank._RERANKER_MODEL           # 'models/cross-encoder-agro'
rerank._AGRO_RERANKER_ENABLED    # 1
rerank._AGRO_RERANKER_ALPHA      # 0.7
rerank._AGRO_RERANKER_TOPN       # 50
rerank._AGRO_RERANKER_BATCH      # 16
rerank._AGRO_RERANKER_MAXLEN     # 512
rerank._COHERE_RERANK_MODEL      # 'rerank-3.5'
rerank._RERANK_BACKEND           # 'local'
rerank._RERANK_INPUT_SNIPPET_CHARS  # 700
rerank._COHERE_RERANK_TOP_N      # 50
```

### Test Results
- test_rerank_config_smoke.py: 5/5 tests passing ✅
- test_rerank_functional_smoke.py: 2/2 tests passing ✅

---

## Conclusion

The migration of `retrieval/rerank.py` from `os.getenv()` to `config_registry` is **complete and verified**.

**Key Points:**
1. All 15 tunable parameters use config_registry when available
2. Proper fallback to os.getenv() when registry unavailable
3. COHERE_API_KEY correctly remains as os.getenv() for security
4. Module-level caching pattern preserves performance
5. Type conversions handled correctly in both paths
6. Hot-reload functionality via reload_config()
7. All 7 tests passing (5 config + 2 functional)

**No further changes needed.**
