# Pydantic Config Fixes - November 28, 2025

## Summary

This document records fixes made to address systemic violations of the "Pydantic-first" configuration principle outlined in CLAUDE.md. The core rule violated was: **".env is for secrets only"** - all other configuration must go through `agro_config.json` and the Pydantic model.

**CRITICAL RULE (CLAUDE.md lines 95-96):** "any new parameter, variable, knob, lever, or setting, or anything else that can be configured MUST go to agro_config.json and be registered with the Pydantic model in /server/models and the registry in /server/services/config_registry.py and /server/services/config_store.py"

This means ALL 4 FILES must be updated together:
1. `agro_config.json` - the actual values
2. `server/models/agro_config_model.py` - Pydantic schema
3. `server/services/config_registry.py` - loads/serves config
4. `server/services/config_store.py` - saves config

---

## Root Cause Analysis

### Problem 1: Non-secrets polluting .env
Multiple RAG configuration keys were in `.env` when they should ONLY be in `agro_config.json`:
- `GEN_MODEL_CLI`, `GEN_MODEL_HTTP`, `GEN_MODEL_MCP`
- `CARDS_EXCLUDE_DIRS`
- `LAYER_BONUS_GUI`, `LAYER_BONUS_RETRIEVAL`
- `RERANKER_CLOUD_MODEL`, `RERANKER_CLOUD_MODEL_SELECT`, `RERANKER_PROVIDER`, `RERANKER_TRAIN_MAX_LENGTH`
- `SKIP_DENSE`, `THEME_MODE`

### Problem 2: config_registry.py overriding agro_config with .env
Lines 93-100 in `config_registry.py` were overriding ALL `AGRO_CONFIG_KEYS` from `.env`, violating the rule that `.env` is for secrets only.

### Problem 3: Hardcoded model values in frontend
Multiple frontend files had hardcoded model names like `gpt-5-mini` or `gpt-4o-mini` instead of loading from Pydantic config:
- `Sidepanel.tsx` - hardcoded `gpt-5-mini`
- `ChatSettings.tsx` - hardcoded `gpt-5-mini`
- `ChatInterface.tsx` - hardcoded `gpt-4o-mini`
- `cost_logic.js` - hardcoded fallbacks
- `ChatTab.jsx` - hardcoded placeholder
- `model_flows.js` - hardcoded prompts

### Problem 4: DataQualitySubtab CARDS_MAX issues
- Initialized `cardsMax` state to `0` (below Pydantic minimum of 10)
- Input `min="0"` allowed invalid values
- Tooltip said "0 = all" which contradicted Pydantic constraint `ge=10`
- Never loaded `CARDS_MAX` from backend config

---

## Changes Made

### 0. Fixed Pydantic Model - Added 11 Missing Keys

**Problem:** AGRO_CONFIG_KEYS had 173 keys but `to_flat_dict()` only returned 162. Missing keys:
- `GEN_MODEL_HTTP`, `GEN_MODEL_MCP`, `ENRICH_MODEL_OLLAMA`, `OLLAMA_URL`, `OPENAI_BASE_URL`
- `LANGCHAIN_ENDPOINT`, `LANGCHAIN_PROJECT`, `LANGCHAIN_TRACING_V2`, `LANGTRACE_API_HOST`, `LANGTRACE_PROJECT_ID`
- `PROMPT_LIGHTWEIGHT_CARDS`

**Files Updated:**

1. **`server/models/agro_config_model.py`:**
   - Added 5 fields to `GenerationConfig`: `gen_model_http`, `gen_model_mcp`, `enrich_model_ollama`, `ollama_url`, `openai_base_url`
   - Added 5 fields to `TracingConfig`: `langchain_endpoint`, `langchain_project`, `langchain_tracing_v2`, `langtrace_api_host`, `langtrace_project_id`
   - Added 1 field to `SystemPromptsConfig`: `lightweight_cards`
   - Updated `to_flat_dict()` to include all 11 new fields
   - Updated `from_flat_dict()` to handle all 11 new fields

2. **`agro_config.json`:**
   - Regenerated with `AgroConfigRoot.model_dump_json()` to include all default values

**Verification:**
```bash
python3 -c "from server.models.agro_config_model import AGRO_CONFIG_KEYS, AgroConfigRoot; m=AgroConfigRoot(); print(len(AGRO_CONFIG_KEYS), len(m.to_flat_dict()))"
# Should print: 173 173
```

### 1. Removed non-secrets from .env

**File:** `.env`

Removed these keys (they belong in `agro_config.json`):
```
GEN_MODEL_CLI=gpt-5
GEN_MODEL_HTTP=gpt-5
GEN_MODEL_MCP=gpt-5
CARDS_EXCLUDE_DIRS=...
LAYER_BONUS_GUI=0.15
LAYER_BONUS_RETRIEVAL=0.15
RERANKER_CLOUD_MODEL=rerank-3.5
RERANKER_CLOUD_MODEL_SELECT=rerank-3.5
RERANKER_PROVIDER=cohere
RERANKER_TRAIN_MAX_LENGTH=512
SKIP_DENSE=0
THEME_MODE=dark
```

### 2. Fixed config_registry.py

**File:** `server/services/config_registry.py`

**Before:**
```python
# Step 3: Override with .env values (precedence)
for key in AGRO_CONFIG_KEYS:
    env_value = os.getenv(key)
    if env_value is not None:
        # .env takes precedence
        self._config[key] = env_value
        self._sources[key] = ".env"
        logger.debug(f"Config key {key} overridden by .env")
```

**After:**
```python
# NOTE: .env is for SECRETS ONLY per CLAUDE.md rules
# AGRO_CONFIG_KEYS should ONLY come from agro_config.json
# Do NOT override agro_config values with .env values
```

### 3. Fixed DataQualitySubtab.tsx

**File:** `web/src/components/RAG/DataQualitySubtab.tsx`

**Changes:**
1. Changed initial state from `useState(0)` to `useState(100)` (Pydantic default)
2. Added useEffect to load `CARDS_MAX` from `/api/config` on mount
3. Changed input `min="0"` to `min="10"` (matches Pydantic `ge=10`)
4. Added `Math.max(10, val)` enforcement in onChange
5. Updated tooltip from "Limit chunks (0 = all)" to "Max chunks to process (min: 10, default: 100)"

### 4. Fixed Sidepanel.tsx

**File:** `web/src/components/Sidepanel.tsx`

**Changes:**
1. Changed hardcoded `useState('gpt-5-mini')` to `useState('')`
2. Added `configLoaded` state to track initial load
3. Added useEffect to sync `costModel` from `config.env.GEN_MODEL`
4. Added sync for `costEmbeddingModel` from `config.env.EMBEDDING_MODEL`
5. Added sync for `costRerankModel` from `config.env.RERANKER_CLOUD_MODEL`

### 5. Fixed ChatSettings.tsx

**File:** `web/src/components/Chat/ChatSettings.tsx`

**Changes:**
1. Changed `DEFAULT_CONFIG.model` from `'gpt-5-mini'` to `''`
2. Updated `loadConfig()` to fetch `GEN_MODEL` from `/api/config` first
3. Uses `GEN_MODEL` from agro_config when no chat-specific model is saved
4. Removed hardcoded placeholder

### 6. Fixed ChatInterface.tsx

**File:** `web/src/components/Chat/ChatInterface.tsx`

**Changes:**
1. Added import for `useConfigStore`
2. Changed `useState('gpt-4o-mini')` to `useState('')`
3. Added useEffect to load model from `config.env.GEN_MODEL`

### 7. Fixed cost_logic.js

**File:** `web/src/modules/cost_logic.js`

**Changes:**
1. Removed hardcoded fallback values in `estimateFromUI()`:
   - `gen_model: ''` instead of `'gpt-5-mini'`
   - `embed_model: ''` instead of `'text-embedding-3-small'`
   - `rerank_model: ''` instead of `'rerank-3.5'`
2. Added comment: "All values come from Pydantic config - no hardcoded fallbacks"

### 8. Fixed ChatTab.jsx

**File:** `web/src/components/tabs/ChatTab.jsx`

**Changes:**
1. Changed placeholder from `"e.g., gpt-4o-mini (leave empty for default)"` to `"(uses GEN_MODEL from config)"`

### 9. Fixed model_flows.js

**File:** `web/src/modules/model_flows.js`

**Changes:**
1. Changed prompt default from `'gpt-4o-mini'` to `''`
2. Updated prompt text to reference config

---

## Files Still Containing Hardcoded Model Values

These files still have hardcoded model values but they are INTENTIONAL defaults for the onboarding wizard profile computation:

- `web/src/modules/app.js` - Profile proposal logic
- `web/src/modules/profile_logic.js` - Profile proposal logic
- `web/src/modules/onboarding.js` - Onboarding wizard
- `web/src/hooks/useOnboarding.ts` - Onboarding hook
- `web/src/modules/autoprofile_v2.js` - Auto-profile logic
- `web/src/components/Onboarding/TuneStep.tsx` - Onboarding UI
- `web/src/hooks/useTooltips.ts` - Tooltip examples (documentation)

These compute SUGGESTED profiles based on budget and local runtime availability. The hardcoded values are the default cloud model suggestions when proposing profiles to users.

---

### 10. Removed Hardcoded Absolute Paths from .env

**File:** `.env`

Removed/commented out these hardcoded paths (violate CLAUDE.md rule):
```
# REPO_ROOT=/Users/davidmontgomery/agro-rag-engine  <-- REMOVED
# AGRO_PATH=/Users/davidmontgomery/agro-rag-engine  <-- REMOVED
# DATA_DIR=/Users/davidmontgomery/agro-rag-engine/data  <-- REMOVED
# DOCS_DIR=/Users/davidmontgomery/agro-rag-engine/docs  <-- REMOVED
# GUI_DIR=/Users/davidmontgomery/agro-rag-engine/gui  <-- REMOVED
```

These should use relative paths or environment defaults. In Docker, these default to `/app/*`.

### 11. Removed Non-Secret Config Keys from .env

Also removed these keys that should only be in `agro_config.json`:
- `MQ_REWRITES`, `active_reranker`
- `LANGCHAIN_ENDPOINT`, `LANGCHAIN_TRACING_V2`
- `LANGTRACE_API_HOST`, `EDITOR_*`, `OPEN_BROWSER`
- `TRANSFORMERS_TRUST_REMOTE_CODE`, `OUT_DIR_BASE`, `REPOS_FILE`

---

## Remaining .env Contents

After cleanup, `.env` should contain ONLY:
1. **API Keys/Secrets:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `COHERE_API_KEY`, `VOYAGE_API_KEY`, `LANGSMITH_API_KEY`, `LANGTRACE_API_KEY`, `MCP_API_KEY`, etc.
2. **Infrastructure URLs:** `QDRANT_URL`, `REDIS_URL`, `OLLAMA_URL` (these can vary between local and Docker)
3. **Networking:** `HOST`, `PORT`, `CORS_ALLOW_ORIGINS`, `MCP_HTTP_*`
4. **Runtime flags:** `DEV_LOCAL_UVICORN`, `AUTO_COLIMA`

---

## The 4 Pydantic Files

Per CLAUDE.md, configuration flows through these 4 files:

1. **`agro_config.json`** - The source of truth for RAG parameters
2. **`server/models/agro_config_model.py`** - Pydantic schema defining all config fields with validation
3. **`server/services/config_store.py`** - API layer for getting/setting config
4. **`server/services/config_registry.py`** - Runtime registry that loads and merges config

**Key rule:** All configurable parameters MUST be defined in `agro_config_model.py` and stored in `agro_config.json`. The frontend MUST read values from `/api/config`, never hardcode.

---

## Verification

To verify the fixes:

1. **Check .env has no AGRO_CONFIG_KEYS:**
   ```bash
   grep -E "^(GEN_|EMBEDDING_|RERANK|CARDS_|BM25_|VECTOR_|TOPK_|FINAL_K|RRF_|CONF_|HYDRATION_|MULTI_QUERY|LAYER_BONUS|VENDOR_|FRESHNESS_|FILENAME_BOOST|SKIP_DENSE|THEME_MODE)" .env
   ```
   Should return nothing.

2. **Check config values are loaded from agro_config.json:**
   ```bash
   curl -s http://localhost:8012/api/config | python3 -c "import sys,json; d=json.load(sys.stdin); print('GEN_MODEL:', d['env'].get('GEN_MODEL'))"
   ```
   Should show the value from `agro_config.json`.

3. **Check UI loads from config:**
   - Open http://localhost:8012/web/rag
   - Click "Retrieval" tab
   - GEN_MODEL dropdown should show value from `agro_config.json`

---

## Date

November 28, 2025

## Author

AI Agent (Claude)

