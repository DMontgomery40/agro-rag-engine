# Hybrid Search Stack Consolidation - Change Log

## Session: 2025-12-10

---
## CRITICAL FINDINGS FROM RULES RE-READ

### Files with os.getenv() Config Violations (Must Fix)

1. **`reranker/config.py`** (lines 97-167)
   - ~~ENTIRE FILE uses `os.getenv()` for config values~~
   - **FIXED**: Now uses `config_registry.get_*()` for all config values
   - API keys (COHERE_API_KEY, etc.) correctly still use `os.getenv()` (secrets are OK)
   - Added `reload_config()` function for module reload protocol

2. **`retrieval/synonym_expander.py`** (line 27)
   - ~~Uses `os.getenv('AGRO_SYNONYMS_PATH', '')`~~
   - **FIXED**: Now uses `config_registry.get_str('AGRO_SYNONYMS_PATH', '')`
   - Added `reload_config()` function for module reload protocol
   - Also added `AGRO_SYNONYMS_PATH` to Pydantic model (was missing)

3. **`retrieval/rerank.py`** (lines 51-65)
   - HAD os.getenv fallback when config_registry is None
   - **FIXED**: Now raises RuntimeError instead

4. **`server/learning_reranker.py`** (line 41)
   - ~~Uses `os.getenv(key, str(default))` as fallback~~
   - **FIXED**: Now uses config_registry exclusively (no os.getenv fallback)
   - Added `reload_config()` function for module reload protocol
   - Kept as separate module (not merged) - it serves a specific purpose for learning mode

### Rules Documentation Stale

1. **`.claude/rules/retrieval/hybrid-search.md`** (line 20)
   - ~~Still references `retrieval/hybrid_search_v2.py`~~
   - **FIXED**: Removed stale v2 reference, updated file list
   - Added `reranker/config.py` to key files

### Key Architecture Points from Rules

1. **`reranker/config.py`** exists as "Unified settings loader (RerankerSettings dataclass)"
2. **`retrieval/rerank.py`** is "Main reranking pipeline (633 lines)"
3. **`server/learning_reranker.py`** is separate - handles hot-reload for learning mode
4. Both must implement `reload_config()` protocol

---

### Rules Summary (Re-read)

**CRITICAL RULES:**
1. **NEVER use `os.getenv()` for config values** - Only for secrets (API keys)
2. **All settings MUST appear in GUI** - Accessibility requirement
3. **Pydantic → agro_config.json → config_registry** - Single source of truth
4. **Module Reload Protocol** - `reload_config()` must clear caches
5. **Fix, Don't Delete** - Never remove broken features, fix them
6. **No stubs/placeholders** - Everything fully wired

**API Key Pattern (from RerankerConfigSubtab.tsx):**
- Keys in `.env` only
- Frontend checks via `/api/secrets/check` → boolean
- Keys NEVER exposed to frontend

---

## Phase 1: Archive hybrid_search_v2.py

### Change 1.1
- **Action**: Archived `retrieval/hybrid_search_v2.py` to `_archived/retrieval/`
- **Reason**: Zero imports anywhere in codebase, dead code
- **Files affected**:
  - MOVED: `retrieval/hybrid_search_v2.py` → `_archived/retrieval/hybrid_search_v2.py`
- **Note**: Did NOT delete - archived per user request
- **Note**: Reference in `scripts/seed_training_logs.py:583` left unchanged - it's just training data expectations, search won't return non-existent files

---

## Phase 2: Merge learning_reranker.py into rerank.py

### Pre-merge State

**server/learning_reranker.py (160 lines)**:
- Functions: `get_reranker()`, `rerank_candidates()`, `get_reranker_info()`
- Hot-reload CrossEncoder with mtime checking
- Alpha blending in `rerank_candidates()`
- **CONFIG VIOLATION**: Line 41 uses `os.getenv(key, str(default))` as fallback

**retrieval/rerank.py (633 lines)**:
- Functions: `get_reranker()`, `rerank_results()`, `get_rerank_config_info()`
- Multiple modes: none, local, learning, cloud
- **CONFIG VIOLATION**: Lines 53-65 have `os.getenv` fallback block (already fixed to raise RuntimeError)

**Importers of learning_reranker.py**:
1. `server/reranker_info.py:4` - `from .learning_reranker import get_reranker, get_reranker_info`
2. `server/services/config_store.py:153` - `from server.learning_reranker import get_reranker_info`
3. Tests: `tests/test_learning_reranker_imports.py`, `tests/config_migration_reranking_smoke.py`

### Change 2.1
- **Action**: Fixed config violation in rerank.py lines 51-65
- **Before**: `os.getenv` fallback block when `_config_registry is None`
- **After**: `raise RuntimeError("Config registry not available...")`
- **Reason**: Config registry MUST be available - no silent fallbacks

### Change 2.1.1 - Added missing Pydantic field RERANKER_CLOUD_TOP_N
- **Action**: Added `RERANKER_CLOUD_TOP_N` to Pydantic model
- **Reason**: `reranker/config.py` uses `RERANKER_CLOUD_TOP_N` but it was NOT in Pydantic model
- **Files modified**:
  - `server/models/agro_config_model.py`:
    - Added `reranker_cloud_top_n: int = Field(default=50, ge=1, le=200, description="Number of candidates to rerank (cloud mode)")`
    - Added to `to_flat_dict()` output
    - Added to `from_flat_dict()` input
    - Added to `AGRO_CONFIG_KEYS` set
    - Added to `KEY_CATEGORIES` mapping
  - `agro_config.json`: Added `"reranker_cloud_top_n": 50`

### Change 2.2 (PENDING)
- **Action**: Add CrossEncoder import and learning mode state variables to rerank.py
- **What to add**:
  ```python
  from sentence_transformers import CrossEncoder

  # Learning mode state (hot-reload)
  _LEARNING_RERANKER: Optional[CrossEncoder] = None
  _LEARNING_MODEL_PATH: Optional[str] = None
  _LEARNING_MODEL_MTIME: float = 0.0
  _LEARNING_LAST_CHECK: float = 0.0
  ```

### Change 2.3 (PENDING)
- **Action**: Add `_get_learning_reranker()` function from learning_reranker.py:63-86
- **Features to preserve**:
  - Hot-reload via mtime checking
  - AGRO_RERANKER_RELOAD_ON_CHANGE config
  - AGRO_RERANKER_RELOAD_PERIOD_SEC config

### Change 2.4 (PENDING)
- **Action**: Add `rerank_candidates()` function with alpha blending from learning_reranker.py:96-129
- **Features to preserve**:
  - AGRO_RERANKER_ALPHA blending
  - AGRO_RERANKER_TOPN limiting
  - AGRO_RERANKER_BATCH batch size
  - Score normalization via minmax

### Change 2.5 (PENDING)
- **Action**: Merge `get_reranker_info()` into `get_rerank_config_info()`
- **Fields to add**:
  - `enabled`, `path`, `resolved_path`
  - `model_loaded`, `device`
  - `model_dir_mtime`, `last_check_monotonic`

### Change 2.6 (PENDING)
- **Action**: Update `server/reranker_info.py` imports
- **Before**: `from .learning_reranker import get_reranker, get_reranker_info`
- **After**: `from retrieval.rerank import get_learning_reranker, get_rerank_config_info`

### Change 2.7 (PENDING)
- **Action**: Update `server/services/config_store.py` imports

### Change 2.8 (PENDING)
- **Action**: Archive `server/learning_reranker.py` to `_archived/server/`

### Change 2.9 (PENDING)
- **Action**: Update test files

---

## Phase 3: Integrate synonym_expander.py (PENDING)

### Pre-integration State
- File exists: `retrieval/synonym_expander.py` (138 lines)
- Functions: `load_synonyms()`, `expand_query_with_synonyms()`, `get_synonym_variants()`
- **CONFIG VIOLATION**: Line 27 uses `os.getenv('AGRO_SYNONYMS_PATH', '')`
- **GUI EXISTS**: Toggle at RetrievalSubtab.tsx:53 (`USE_SEMANTIC_SYNONYMS`)
- **NEVER CALLED**: No imports in search pipeline

---

## Phase 4: Create unified embeddings.py (PENDING)

---

## Phase 5: Fix hardcoded values in hybrid_search.py (PENDING)

---

## Phase 6: Add missing GUI controls (PENDING)

### Settings missing GUI:
- EMBEDDING_TYPE
- EMBEDDING_MODEL
- EMBEDDING_MODEL_LOCAL
- VOYAGE_MODEL
- EMBEDDING_DIM
- SYNONYM_MAX_EXPANSIONS (new)

---

## Verification Checklist

- [x] `pytest tests/test_agro_config.py::TestConfigContractEnforcement -v`
  - 4/5 tests pass
  - `test_no_env_usage_for_agro_config_keys` has 40 PRE-EXISTING violations in OTHER files (not from this work)
  - Files fixed in this session have NO violations:
    - `reranker/config.py` ✓
    - `retrieval/synonym_expander.py` ✓
    - `server/learning_reranker.py` ✓
- [x] All imports updated (no changes needed - existing imports work)
- [x] No `os.getenv` for config values in fixed files
- [ ] All new settings have GUI controls (RERANKER_CLOUD_TOP_N, AGRO_SYNONYMS_PATH)
- [ ] All new settings have tooltips
- [x] `reload_config()` added to:
  - `reranker/config.py` ✓
  - `retrieval/synonym_expander.py` ✓
  - `server/learning_reranker.py` ✓

## Summary of Changes (Session 2025-12-10)

### Config Violations Fixed (4 files):
1. `retrieval/rerank.py` - Removed os.getenv fallback, now raises RuntimeError
2. `reranker/config.py` - Full rewrite to use config_registry
3. `retrieval/synonym_expander.py` - Converted to use config_registry
4. `server/learning_reranker.py` - Converted to use config_registry

### Missing Pydantic Fields Added (2):
1. `RERANKER_CLOUD_TOP_N` - Cloud reranker top-n limit (separate from local)
2. `AGRO_SYNONYMS_PATH` - Custom path to semantic_synonyms.json

### Dead Code Archived (1):
1. `retrieval/hybrid_search_v2.py` → `_archived/retrieval/hybrid_search_v2.py`

### Rules Docs Updated (1):
1. `.claude/rules/retrieval/hybrid-search.md` - Removed stale v2 reference
