# HANDOFF: Reranker Config Unification

**Date**: 2025-12-02
**Status**: IN PROGRESS - Step 1b partially complete
**Priority**: CRITICAL - Complete before any other work

---

## THE TASK

Unify reranker configuration from THREE conflicting keys (`RERANKER_ACTIVE`, `RERANKER_BACKEND`, `RERANK_BACKEND`) into ONE unified system using `RERANKER_MODE`.

**Root Problem**: UI showed "cloud/cohere" but code loaded local cross-encoder because different parts of the codebase read different keys.

---

## MANDATORY RULES - READ THESE FIRST

### 1. NO "BACKEND" ANYWHERE
The word "backend" is **BANNED**. Use:
- `mode` = 'cloud' | 'local' | 'learning' | 'none'
- `provider` = 'cohere' | 'voyage' | 'jina' (only when mode='cloud')

**WRONG**: `backend`, `RERANK_BACKEND`, `RERANKER_BACKEND`, `backend_env`
**RIGHT**: `mode`, `RERANKER_MODE`, `provider`, `RERANKER_CLOUD_PROVIDER`

### 2. NO PROVIDER-SPECIFIC MODEL VARIABLES
**WRONG**: `cohere_model`, `voyage_model`, `jina_model`
**RIGHT**: `cloud_model` - ONE variable for whatever cloud provider is selected

### 3. NO ENVIRONMENT VARIABLES FOR CONFIG
**WRONG**: "update environment variables", os.getenv for config
**RIGHT**: Everything goes through Pydantic config:
- `agro_config.json` → Pydantic model (`server/models/agro_config_model.py`) → config_registry (`server/services/config_registry.py`) → UI

**.env is ONLY for secrets** (API keys like COHERE_API_KEY, VOYAGE_API_KEY)

### 4. NO HARDCODED DEFAULTS
**WRONG**: `local_model = _get("RERANKER_LOCAL_MODEL", "cross-encoder/ms-marco-MiniLM-L-12-v2")`
**RIGHT**: If a required value is missing, raise a Pydantic-style error with the actual values

### 5. NO BACKWARDS COMPATIBILITY FALLBACKS
**WRONG**: `mode = _get("RERANKER_MODE") or _get("RERANK_BACKEND") or "local"`
**RIGHT**: Read ONLY the new keys. If old keys exist, they should be migrated/removed.

### 6. NO SILENT FALLBACKS
**WRONG**: `cloud_model = cfg.get("cloud_model") or 'rerank-3.5'`
**RIGHT**:
```python
if mode == 'cloud' and not cloud_model:
    raise ValueError(
        f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
        f"requires RERANKER_CLOUD_MODEL to be set"
    )
```

### 7. PYDANTIC-STYLE ERROR MESSAGES
All errors must include:
1. The actual values from config (not hardcoded)
2. What exactly is missing
3. Where to fix it

---

## THE THREE MODES

1. **cloud**: Uses cloud API (Cohere, Voyage, Jina)
   - Requires: `RERANKER_CLOUD_PROVIDER`, `RERANKER_CLOUD_MODEL`, `{PROVIDER}_API_KEY`
   - API key goes in `.env` (it's a secret)
   - Provider and model go in `agro_config.json`

2. **local**: Uses a local cross-encoder model
   - Requires: `RERANKER_LOCAL_MODEL` (path or identifier)
   - Can be a local path like `models/my-custom-model` or a HuggingFace ID
   - User MUST specify which model - no default

3. **learning**: Uses AGRO's self-learning cross-encoder
   - Automatically uses `models/cross-encoder-agro`
   - No additional config needed

4. **none**: Reranking disabled

---

## WHAT'S BEEN COMPLETED

### ✅ `server/models/agro_config_model.py`
Pydantic model updated with mode/provider/cloud_model/local_model

### ✅ `retrieval/hybrid_search.py`
Now reads RERANKER_MODE

### ✅ `retrieval/rerank.py` - ELSE branch (config registry path)
- Removed COHERE_MODEL module variable
- Added cached variables: `_RERANKER_MODE`, `_RERANKER_CLOUD_PROVIDER`, `_RERANKER_CLOUD_MODEL`, `_RERANKER_LOCAL_MODEL`
- Updated `_load_cached_config()` with new keys
- Rewrote `_resolve_env_strategy()` to return mode/provider
- Updated `get_rerank_config_info()` to return mode/cloud_provider/cloud_model
- Fixed `get_reranker()` to handle mode properly
- Fixed else branch in `rerank_results()` with Pydantic error validation

### ✅ `reranker/config.py` - Dataclass fields
- Changed `backend` → `mode`
- Added `provider`, `cloud_model`, `local_model`
- Changed `cohere_api_key_present` → `cloud_api_key_present`
- Updated `metrics_label` property

### ✅ `reranker/config.py` - `load_settings()` function
- Reads RERANKER_MODE with validation
- Validates cloud mode requires provider + cloud_model + API key
- Validates local mode requires local_model
- Learning mode automatically sets local_model to AGRO path

---

## WHAT STILL NEEDS TO BE DONE

### Step 1c: `reranker/config.py` - Remaining functions
- Update docstring (remove references to legacy env vars, note that config goes through Pydantic not env)
- Update `resolve_model_target()` to use mode/local_model
- Verify `as_env()` works with new field names (should work automatically via asdict)

### Step 2: `retrieval/rerank.py` - Settings branch (lines 313-325)
The settings branch still reads from OLD field names:
```python
# CURRENT (WRONG):
if settings:
    backend = settings.backend
    cohere_model = settings.cohere_model
    cohere_key_present = settings.cohere_api_key_present

# NEEDS TO BE:
if settings:
    mode = settings.mode
    provider = settings.provider
    cloud_model = settings.cloud_model
    enabled = settings.enabled and mode != "none"
    model_name = settings.local_model if mode in {"local", "learning"} else ""
    metrics_label = settings.metrics_label
    snippet_chars = settings.snippet_chars
    cloud_api_key_present = settings.cloud_api_key_present
```

### Step 3: `retrieval/rerank.py` - Conditionals (lines ~372, ~454)
Change:
```python
# CURRENT (WRONG):
if backend == 'cohere':
elif backend == 'voyage':

# NEEDS TO BE:
if mode == 'cloud' and provider == 'cohere':
elif mode == 'cloud' and provider == 'voyage':
```

Inside cloud blocks, use `cloud_model` not `cohere_model`.

### Step 4: Remaining TIER 1 server files
- `server/services/config_store.py` - rename `_effective_rerank_backend()` → `_effective_rerank_mode()`
- `server/asgi.py` - API response keys
- `server/reranker_info.py` - return mode/provider not backend
- `server/services/rag.py`
- `server/routers/config.py`
- `server/routers/pipeline.py`
- `server/langgraph_app.py`

### Step 5: Config + Types
- `agro_config.json` - add new keys, remove old keys
- `web/src/types/index.ts` - add RerankerConfig interface

### Step 6: UI Components (39 files)
See full list in plan file at `/Users/davidmontgomery/.claude/plans/quirky-seeking-shell.md`

### Step 7: Tests + Verification
- Update 27 test files
- Run smoke tests

---

## UNIFIED SCHEMA FOR agro_config.json

```json
{
  "reranker_mode": "learning",
  "reranker_cloud_provider": "",
  "reranker_cloud_model": "",
  "reranker_local_model": ""
}
```

When mode is:
- `"cloud"` → provider and cloud_model must be set
- `"local"` → local_model must be set
- `"learning"` → nothing else needed (uses models/cross-encoder-agro automatically)
- `"none"` → reranking disabled

---

## COMMON MISTAKES TO AVOID

1. **Using "backend" anywhere** - Use mode/provider instead
2. **Creating provider-specific variables** like cohere_model - Use cloud_model for all
3. **Referencing environment variables for config** - Config goes through Pydantic
4. **Adding backwards compat fallbacks** - Clean migration, no safety nets
5. **Hardcoding default values** - Raise errors for missing required config
6. **Silent fallbacks with `or`** - Raise Pydantic-style errors instead
7. **Trying to update retrieval/rerank.py before reranker/config.py is complete** - Dependency chain matters
8. **Saying "HuggingFace model" for local models** - Local models can be local paths, not just HF IDs

---

## FILE DEPENDENCY CHAIN

```
reranker/config.py (dataclass + load_settings)
    ↓
retrieval/rerank.py (imports RerankerSettings from reranker/config.py)
    ↓
server/* files (import from retrieval/rerank.py)
    ↓
agro_config.json + TypeScript types
    ↓
React/JS UI components
    ↓
Tests
```

**CRITICAL**: You CANNOT update retrieval/rerank.py settings branch until reranker/config.py is fully updated, because it imports and reads from RerankerSettings.

---

## PLAN FILE LOCATION

Full file list and detailed implementation notes at:
`/Users/davidmontgomery/.claude/plans/quirky-seeking-shell.md`

---

## VERIFICATION REQUIRED (per CLAUDE.md)

After all changes:
1. Smoke test: RERANKER_MODE="cloud" + RERANKER_CLOUD_PROVIDER="cohere" calls Cohere API
2. Smoke test: RERANKER_MODE="local" + RERANKER_LOCAL_MODEL="path" loads local model
3. Smoke test: RERANKER_MODE="learning" loads AGRO model from models/cross-encoder-agro
4. Smoke test: RERANKER_MODE="none" skips reranking entirely
5. Playwright GUI smoke on port 5173 - verify UI shows correct mode/provider
