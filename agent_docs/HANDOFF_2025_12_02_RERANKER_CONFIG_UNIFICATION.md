# Reranker Config Unification - Full Cleanup Plan

## Progress Summary

### ✅ COMPLETED
1. `server/models/agro_config_model.py` - Pydantic model updated with mode/provider/cloud_model/local_model
2. `retrieval/hybrid_search.py` - Now reads RERANKER_MODE
3. `retrieval/rerank.py` - ELSE branch (config registry path):
   - ✅ Removed COHERE_MODEL module variable
   - ✅ Added cached variables: `_RERANKER_MODE`, `_RERANKER_CLOUD_PROVIDER`, `_RERANKER_CLOUD_MODEL`, `_RERANKER_LOCAL_MODEL`
   - ✅ Updated `_load_cached_config()` with new keys
   - ✅ Rewrote `_resolve_env_strategy()` to return mode/provider (NO backend)
   - ✅ Updated `get_rerank_config_info()` to return mode/cloud_provider/cloud_model
   - ✅ Fixed `get_reranker()` to handle mode properly
   - ✅ Fixed else branch in `rerank_results()` with proper Pydantic error validation
4. `reranker/config.py` - Dataclass fields updated:
   - ✅ Changed `backend` → `mode`
   - ✅ Added `provider`, `cloud_model`, `local_model`
   - ✅ Changed `cohere_api_key_present` → `cloud_api_key_present`
   - ✅ Updated `metrics_label` property
5. `reranker/config.py` - `load_settings()` function updated:
   - ✅ Reads RERANKER_MODE with validation
   - ✅ Validates cloud mode requires provider + cloud_model + API key
   - ✅ Validates local mode requires local_model
   - ✅ Learning mode automatically sets local_model to AGRO path
6. `reranker/config.py` - Docstring updated (Step 1c) ✅
7. `retrieval/rerank.py` - Settings branch (lines 315-343) updated:
   - ✅ Now reads mode/provider/cloud_model from settings
   - ✅ Added Pydantic-style validation for cloud mode
8. `server/learning_reranker.py` - Refactored (2025-12-03):
   - ✅ Removed module-level cached config variables (_AGRO_RERANKER_BATCH, _AGRO_RERANKER_MAXLEN, etc.)
   - ✅ Added `_get()` helper for Pydantic/Zustand pattern - reads from registry with type coercion
   - ✅ All functions (get_reranker, rerank_candidates, get_reranker_info) now read from _config_registry directly
   - ✅ `get_reranker_info()` returns `enabled` based on RERANKER_MODE=="learning"
   - WHY COMPLETE: Verified file has no cached globals, uses _get() for all config reads
9. `server/routers/pipeline.py` - Updated (2025-12-03):
   - ✅ Removed all legacy variables (AGRO_RERANKER_ENABLED, RERANKER_ACTIVE, RERANKER_PROVIDER, RERANKER_BACKEND, RERANK_BACKEND)
   - ✅ Uses unified RERANKER_MODE/RERANKER_CLOUD_PROVIDER/RERANKER_CLOUD_MODEL
   - ✅ Returns Pydantic-compliant keys: reranker_mode, reranker_cloud_provider, reranker_cloud_model, reranker_local_model
   - WHY COMPLETE: Verified via grep - no RERANK_BACKEND or legacy keys remain; response structure uses Pydantic field names
10. `server/cards_builder.py` - Updated (2025-12-03):
    - ✅ Replaced RERANK_BACKEND, COHERE_RERANK_MODEL, RERANKER_MODEL with unified schema
    - ✅ Added Pydantic snake_case cached vars: _reranker_mode, _reranker_cloud_provider, _reranker_cloud_model, _reranker_local_model
    - ✅ Added embedding model vars: _embedding_model, _voyage_model, _embedding_model_local, _agro_reranker_model_path
    - ✅ Refactored _model_info() to return all config values without hardcoded conditionals
    - 🔧 PENDING: Add CardsConfig Pydantic fields for: code_snippet_length, max_symbols, max_routes, purpose_max_length, quick_tips
11. `server/models/agro_config_model.py` - Additions needed (2025-12-03):
    - 🔧 PENDING: Add BM25_STOPWORDS_LANG to IndexingConfig
    - 🔧 PENDING: Add to CardsConfig: code_snippet_length, max_symbols, max_routes, purpose_max_length, quick_tips
    - 🔧 PENDING: Add to to_flat_dict() and from_flat_dict()
    - 🔧 PENDING: Add to ALL_CONFIG_KEYS
12. `retrieval/rerank.py` - Step 3 Conditionals (2025-12-03):
    - ✅ Line 388: Uses `if mode == 'cloud' and provider == 'cohere':` (not `backend == 'cohere'`)
    - ✅ Line 470: Uses `elif mode == 'cloud' and provider == 'voyage':` (not `backend == 'voyage'`)
    - ✅ Lines 403, 483: Uses `snippet_cloud` (not `snippet_cohere`)
    - ✅ Lines 406, 486: Uses `cloud_top_n` (not `cohere_top_n`)
    - ✅ Lines 409, 489: Uses `cloud_model` (not `cohere_model`)
    - ✅ Line 395: Uses `cloud_api_key_present` (not `cohere_key_present`)
    - WHY COMPLETE: Verified via read_file lines 385-504 - all conditionals use mode/provider pattern
    - 🔧 PENDING: Lines 149-225 still have `_normalize_backend` function name and internal `backend` variable for metrics_label
13. `retrieval/rerank.py` - Step 4 Backwards Compat Fallbacks (2025-12-03):
    - ✅ Lines 51-80: _load_cached_config() uses only unified keys (RERANKER_MODE, RERANKER_CLOUD_PROVIDER, etc.)
    - ✅ No legacy fallback patterns like `or os.getenv('RERANK_BACKEND')`
    - WHY COMPLETE: Verified via read_file lines 50-94 - only unified keys, comments say "no legacy fallbacks"
14. `server/services/config_store.py` - Step 5a (2025-12-03):
    - ✅ Function is `_effective_rerank_mode()` (not `_effective_rerank_backend()`)
    - ✅ Returns dict with keys: reranker_mode, reranker_cloud_provider, reranker_cloud_model, reason
    - ✅ Line 244: hints["reranker_mode"] uses the function
    - WHY COMPLETE: Verified via grep and read_file - function name and return structure are Pydantic-compliant
15. `server/asgi.py` - Step 5b (2025-12-03):
    - ✅ Lines 411-415: Returns reranker_mode, reranker_cloud_provider, reranker_cloud_model, reranker_local_model
    - ✅ Lines 426-430: Fallback also uses Pydantic-compliant keys
    - ✅ No `rerank_backend` or `backend` references in reranker context (only `enrich_backend` for enrichment)
    - WHY COMPLETE: Verified via grep - only "backend" hits are for enrichment, not reranker
16. `server/reranker_info.py` - Step 5c (2025-12-03):
    - ✅ Lines 17-20: Returns reranker_mode, reranker_cloud_provider, reranker_cloud_model, reranker_local_model
    - ✅ Lines 47-101: Options use reranker_mode and reranker_cloud_provider
    - 🔧 PENDING: Line 55 hardcodes `learning_path = "models/cross-encoder-agro"` - should use AGRO_RERANKER_MODEL_PATH
17. `server/routers/config.py` - Verified (2025-12-03):
    - ✅ Line 24 already says "reranker mode"
    - ✅ Line 106 already says "RERANKER_MODE"
    - ✅ Line 116 critical_keys already has 'RERANKER_MODE'
    - WHY COMPLETE: Verified via read_file lines 20-30 and 100-120
18. `server/autoprofile.py` - Verified (2025-12-03):
    - ✅ Lines 248-262 already use unified schema (RERANKER_MODE, RERANKER_CLOUD_PROVIDER, RERANKER_CLOUD_MODEL, RERANKER_LOCAL_MODEL)
    - WHY COMPLETE: Verified via read_file lines 240-265
19. `web/src/types/index.ts` - Added (2025-12-03):
    - ✅ Added RerankerConfig, RerankerOption, RerankerInfo interfaces
    - Uses Pydantic-compliant field names
20. `web/src/components/RAG/ExternalRerankersSubtab.tsx` - 🔧 NEEDS MAJOR REFACTOR:
    - ❌ Still uses `useState` for config values instead of `useConfig()` hook
    - ❌ Still has `activeChoice: 'local' | 'cloud'` - should be 4 modes
    - ❌ Still has hardcoded defaults
    - ❌ Needs to use `useConfig().get()` and `useConfig().set()`

### ✅ TIER 1 COMPLETE - Core Backend (9 files)
1. ✅ `reranker/config.py` - Done (dataclass fields, load_settings, metrics_label)
2. ✅ `retrieval/rerank.py` - Done (conditionals use mode/provider, no backend var)
3. ✅ `server/services/config_store.py` - Done (_effective_rerank_mode)
4. ✅ `server/asgi.py` - Done (returns Pydantic-compliant keys)
5. ✅ `server/reranker_info.py` - Done (one hardcoded path pending)
6. 🔧 `server/services/rag.py` - NOT VERIFIED
7. ✅ `server/routers/config.py` - Done
8. ✅ `server/routers/pipeline.py` - Done
9. 🔧 `server/langgraph_app.py` - NOT VERIFIED

### ✅ TIER 2 MOSTLY COMPLETE - Other Server Files (8 files)
10. 🔧 `server/models/chat_models.py` - NOT VERIFIED
11. 🔧 `server/env_model.py` - NOT VERIFIED
12. ✅ `server/autoprofile.py` - Done
13. ✅ `server/cards_builder.py` - Done (Pydantic defaults, unified vars)
14. 🗑️ `server/models/agro_config_model_old.py` - archive/remove
15. 🔧 `indexer/index_repo.py` - NOT VERIFIED
16. 🔧 `scripts/docs_ai/bootstrap_docs.py` - NOT VERIFIED
17. 🔧 `scripts/test_token_savings.py` - NOT VERIFIED

### 🔧 TIER 4 IN PROGRESS - TypeScript Types & API
- ✅ `web/src/types/index.ts` - Done (RerankerConfig interface added)
- 🔧 Other API files - NOT VERIFIED

### ❌ TIER 5 NOT STARTED - React Components
- ❌ `web/src/components/RAG/ExternalRerankersSubtab.tsx` - NEEDS MAJOR REFACTOR (must use useConfig hook, 4 modes)

### ❌ NOT STARTED - FULL FILE LIST (99 files total)

#### TIER 1: Core Backend (9 files) - DO FIRST
1. `reranker/config.py` - Legacy settings loader with backend field
2. `retrieval/rerank.py` - Finish conditionals
3. `server/services/config_store.py` - _effective_rerank_backend() → _effective_rerank_mode()
4. `server/asgi.py` - API response keys
5. `server/reranker_info.py` - return mode/provider
6. `server/services/rag.py` - backend references
7. `server/routers/config.py` - config endpoint
8. `server/routers/pipeline.py` - pipeline config
9. `server/langgraph_app.py` - if uses reranker config

#### TIER 2: Other Server Files (8 files)
10. `server/models/chat_models.py`
11. `server/env_model.py`
12. `server/autoprofile.py`
13. `server/cards_builder.py`
14. `server/models/agro_config_model_old.py` (archive/remove?)
15. `indexer/index_repo.py`
16. `scripts/docs_ai/bootstrap_docs.py`
17. `scripts/test_token_savings.py`

#### TIER 3: Config Files (2 files)
18. `agro_config.json` - update keys
19. `fix_config_init.py`

#### TIER 4: TypeScript Types & API (14 files)
20. `web/src/types/index.ts` - add mode/provider/cloud_model types
21. `web/src/api/client.ts`
22. `web/src/api/dashboard.ts`
23. `web/src/services/RAGService.ts`
24. `web/src/services/TerminalService.ts`
25. `web/src/stores/useRepoStore.ts`
26. `web/src/hooks/useConfig.ts`
27. `web/src/hooks/useAPI.ts`
28. `web/src/hooks/useDashboard.ts`
29. `web/src/hooks/useOnboarding.ts`
30. `web/src/hooks/useCards.ts`
31. `web/src/hooks/useGlobalSearch.ts`
32. `web/src/hooks/useErrorHandler.ts`
33. `web/src/hooks/useEmbeddingStatus.ts`

#### TIER 5: React Components (22 files)
34. `web/src/App.tsx`
35. `web/src/components/Sidepanel.tsx`
36. `web/src/components/DockerStatusCard.tsx`
37. `web/src/components/RAG/ExternalRerankersSubtab.tsx` - KEY FILE for reranker UI
38. `web/src/components/RAG/LearningRankerSubtab.tsx`
39. `web/src/components/RAG/DataQualitySubtab.tsx`
40. `web/src/components/RAG/EvaluateSubtab.tsx`
41. `web/src/components/RAG/IndexingSubtab.tsx`
42. `web/src/components/Dashboard/EmbeddingConfigPanel.tsx`
43. `web/src/components/Dashboard/QuickActions.tsx`
44. `web/src/components/Dashboard/StorageBreakdownPanel.tsx`
45. `web/src/components/Dashboard/IndexingCostsPanel.tsx`
46. `web/src/components/Chat/ChatInterface.tsx`
47. `web/src/components/Chat/ChatSettings.tsx`
48. `web/src/components/Infrastructure/ServicesSubtab.tsx`
49. `web/src/components/Infrastructure/MonitoringSubtab.tsx`
50. `web/src/components/Infrastructure/MCPSubtab.tsx`
51. `web/src/components/Onboarding/TuneStep.tsx`
52. `web/src/components/Onboarding/QuestionsStep.tsx`
53. `web/src/components/Profiles/ProfileEditor.tsx`
54. `web/src/components/Evaluation/HistoryViewer.tsx`
55. `web/src/components/tabs/EvalAnalysisTab.tsx`

#### TIER 6: Legacy JavaScript Modules (17 files)
56. `web/src/modules/reranker.js` - KEY FILE
57. `web/src/modules/config.js`
58. `web/src/modules/app.js`
59. `web/src/modules/chat.js`
60. `web/src/modules/onboarding.js`
61. `web/src/modules/eval_runner.js`
62. `web/src/modules/eval_history.js`
63. `web/src/modules/indexing.js`
64. `web/src/modules/docker.js`
65. `web/src/modules/profile_logic.js`
66. `web/src/modules/profile_renderer.js`
67. `web/src/modules/autoprofile_v2.js`
68. `web/src/modules/cards_builder.js`
69. `web/src/modules/cost_logic.js`
70. `web/src/modules/model_flows.js`
71. `web/src/modules/editor-settings.js`
72. `web/src/modules/tooltips.js`

#### TIER 7: Tests (27 files)
73. `tests/test_react_config_migration.py`
74. `tests/test_asgi_config_migration.py`
75. `tests/test_secret_masking.py`
76. `tests/test_cards_config_smoke.py`
77. `tests/test_hybrid_pipeline_modes.py`
78. `tests/smoke_test_rag.py`
79. `tests/test_new_tooltips.py`
80. `tests/config_migration_retrieval_smoke.py`
81. `tests/test_rerank_functional_smoke.py`
82. `tests/test_rerank_config_smoke.py`
83. `tests/compare_rerankers.py`
84. `tests/test_learning_reranker_imports.py`
85. `tests/test_agro_config.py`
86. `tests/analyze_failures.py`
87. `tests/unit/test_reranker_config.py`
88. `tests/routers/test_pipeline_config_smoke.py`
89. `tests/smoke/verify_metrics.py`
90. `tests/smoke/test_pydantic_conformity.py`
91. `tests/smoke/test_metrics_instrumentation.py`
92. `tests/smoke/test_config_models_consistency.py`
93. `tests/smoke/test_enriching_toggle.py`
94. `tests/smoke/test_trace_steps_log.py`
95. `tests/smoke/test_evaluation_dataset.py`
96. `tests/smoke/test_golden_questions.py`
97. `tests/smoke/test_evaluate_backend_wiring.py` - rename file too

#### TIER 8: Archive/Scripts (2 files)
98. `scripts/archive/runtime_config.py`
99. (Registry file already handled in config_store.py)

---

## Core Principles (MANDATORY)

### NO "backend" ANYWHERE
The word "backend" is BANNED. Use:
- `mode` = 'cloud' | 'local' | 'learning' | 'none'
- `provider` = 'cohere' | 'voyage' | 'jina' (only when mode='cloud')

### THE 4 RERANKER MODES (CRITICAL - AGENT KEPT GETTING THIS WRONG)
| Mode | Description | Config Values Used |
|------|-------------|-------------------|
| `cloud` | Calls external cloud API (Cohere, Voyage, Jina) | `RERANKER_CLOUD_PROVIDER`, `RERANKER_CLOUD_MODEL` |
| `local` | Runs ANY local model (NOT HuggingFace specifically - just whatever `RERANKER_LOCAL_MODEL` points to) | `RERANKER_LOCAL_MODEL` |
| `learning` | Uses AGRO's self-learning cross-encoder with feedback loop | `AGRO_RERANKER_MODEL_PATH`, `AGRO_RERANKER_ALPHA`, `AGRO_RERANKER_TOPN`, etc. |
| `none` | Reranking disabled entirely | None |

**`local` ≠ HuggingFace. `local` = ANY local model.**

### EVERYTHING MUST BE PYDANTIC-FIRST AND ZUSTAND-COMPLIANT
Every config value MUST:
1. Be in Pydantic model (`server/models/agro_config_model.py`)
2. Be in `to_flat_dict()`, `from_flat_dict()`, `ALL_CONFIG_KEYS`
3. Be in `agro_config.json`
4. Backend: access via `_config_registry.get_str/get_int/get_float`
5. Frontend: access via `useConfig().get('KEY', default)` / `useConfig().set('KEY', value)`
6. NEVER `os.getenv()` for config (only SECRETS)
7. NEVER hardcode defaults - use Pydantic Field defaults

### NO provider-specific model variables
WRONG: `cohere_model`, `voyage_model`, `jina_model`
RIGHT: `cloud_model` - ONE variable for whatever provider is selected

### NO silent fallbacks
WRONG: `cloud_model = cfg.get("cloud_model") or 'rerank-3.5'`
RIGHT: Validate and raise clear Pydantic-style errors with actual values:
```python
if mode == 'cloud':
    if not provider:
        raise ValueError(f"RERANKER_MODE='{mode}' requires RERANKER_CLOUD_PROVIDER to be set")
    if not cloud_model:
        raise ValueError(f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' requires RERANKER_CLOUD_MODEL to be set")
    api_key_env = f"{provider.upper()}_API_KEY"
    if not os.getenv(api_key_env):
        raise ValueError(f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' requires {api_key_env} to be set")
```

---

## Unified Schema

```json
{
  "reranking": {
    "reranker_mode": "cloud",
    "reranker_cloud_provider": "cohere",
    "reranker_cloud_model": "rerank-3.5",
    "reranker_local_model": "cross-encoder/ms-marco-MiniLM-L-12-v2"
  }
}
```

**Mode values:**
- `"cloud"` → Use cloud API (provider determines which)
- `"local"` → Use local HuggingFace cross-encoder
- `"learning"` → Use AGRO's self-learning model (models/cross-encoder-agro)
- `"none"` → Disable reranking

---

## Implementation Details by Tier

### TIER 1: Core Backend - Specific Changes

#### 1. `reranker/config.py` - REPLACE dataclass fields:
```python
# OLD:
backend: str  # "local" | "cohere" | "none"
cohere_model: str
cohere_api_key_present: bool

# NEW:
mode: str  # 'cloud' | 'local' | 'learning' | 'none'
provider: str  # 'cohere' | 'voyage' | 'jina' | ''
cloud_model: str
local_model: str
cloud_api_key_present: bool  # generalized
```

Update `load_settings()`:
```python
mode = _get("RERANKER_MODE", "local")
provider = _get("RERANKER_CLOUD_PROVIDER", "")
cloud_model = _get("RERANKER_CLOUD_MODEL", "")
local_model = _get("RERANKER_LOCAL_MODEL", "cross-encoder/ms-marco-MiniLM-L-12-v2")

if mode == 'cloud':
    if not provider:
        raise ValueError(f"RERANKER_MODE='{mode}' requires RERANKER_CLOUD_PROVIDER to be set")
    if not cloud_model:
        raise ValueError(f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' requires RERANKER_CLOUD_MODEL")
    api_key_env = f"{provider.upper()}_API_KEY"
    if not _get(api_key_env):
        raise ValueError(f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' requires {api_key_env}")
```

Update `metrics_label` property:
```python
# OLD:
if self.backend == "cohere":
    return f"cohere:{self.cohere_model}"

# NEW:
if self.mode == "cloud":
    return f"{self.provider}:{self.cloud_model}"
```

#### 2. `retrieval/rerank.py` - FINISH:
Change all conditionals:
```python
# Lines ~356, ~438, etc:
if backend == 'cohere':    →  if mode == 'cloud' and provider == 'cohere':
elif backend == 'voyage':  →  elif mode == 'cloud' and provider == 'voyage':
elif backend == 'jina':    →  elif mode == 'cloud' and provider == 'jina':
```

Inside cloud blocks:
```python
# OLD:
model_id = cohere_model

# NEW:
model_id = cloud_model  # same variable for all providers
```

Settings branch:
```python
# OLD:
settings = config_loader.load_settings()
backend = settings.backend
cohere_model = settings.cohere_model

# NEW:
settings = config_loader.load_settings()
mode = settings.mode
provider = settings.provider
cloud_model = settings.cloud_model
```

#### 3. `server/services/config_store.py`:
```python
# OLD:
def _effective_rerank_backend() -> str:

# NEW:
def _effective_rerank_mode() -> str:
```

#### 4. `server/asgi.py` - API responses:
```python
# OLD:
"rerank_backend": ...

# NEW:
"reranker_mode": ...
"reranker_cloud_provider": ...
"reranker_cloud_model": ...
```

#### 5. `server/reranker_info.py`:
```python
# OLD:
return {"backend": ...}

# NEW:
return {"mode": ..., "provider": ..., "cloud_model": ...}
```

### TIER 3: agro_config.json Changes
```json
// OLD:
"rerank_backend": "local",
"reranker_active": "local",

// NEW:
"reranker_mode": "local",
"reranker_cloud_provider": "",
"reranker_cloud_model": "",
"reranker_local_model": "cross-encoder/ms-marco-MiniLM-L-12-v2"
```

### TIER 4: TypeScript Types
```typescript
// web/src/types/index.ts - ADD:
export interface RerankerConfig {
  reranker_mode: 'cloud' | 'local' | 'learning' | 'none';
  reranker_cloud_provider: 'cohere' | 'voyage' | 'jina' | '';
  reranker_cloud_model: string;
  reranker_local_model: string;
}
```

### TIER 5-6: React/JS - Search-Replace Pattern
```javascript
// All files: find/replace
"rerank_backend"        → "reranker_mode"
"reranker_active"       → "reranker_mode"
"backend"              → "mode" (context-aware, only reranker-related)
".cohere_model"        → ".cloud_model"
"RERANK_BACKEND"       → "RERANKER_MODE"
"COHERE_RERANK_MODEL"  → "RERANKER_CLOUD_MODEL"
```

---

## Error Handling (MANDATORY)

All config errors must:
1. Include the actual values from config (not hardcoded)
2. Tell user exactly what's missing
3. Tell user exactly where to fix it

Example:
```python
raise ValueError(
    f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
    f"requires {api_key_env} environment variable to be set"
)
```

---

## Verification (per CLAUDE.md)

After all changes:
1. Smoke test: `RERANKER_MODE: "cloud"` + `RERANKER_CLOUD_PROVIDER: "cohere"` calls Cohere API
2. Smoke test: `RERANKER_MODE: "local"` loads local HF model
3. Smoke test: `RERANKER_MODE: "learning"` loads AGRO model from models/cross-encoder-agro
4. Smoke test: `RERANKER_MODE: "none"` skips reranking entirely
5. Playwright GUI smoke on port 5173 - verify UI shows correct mode/provider

---

## Execution Order (CORRECTED - Pydantic First)

**CRITICAL DEPENDENCY**: `retrieval/rerank.py` IMPORTS from `reranker/config.py`:
```python
from reranker.config import (
    load_settings,
    resolve_model_target,
    shared_loader_enabled,
    RerankerSettings,  # <-- This dataclass MUST be updated FIRST
)
```

The settings branch in `rerank_results()` reads:
```python
if settings:
    mode = settings.mode          # <-- Needs new field
    provider = settings.provider  # <-- Needs new field
    cloud_model = settings.cloud_model  # <-- Needs new field
```

**CORRECT ORDER:**

### Step 1: `reranker/config.py` - COMPLETE UPDATE ✅ DONE
1a. ✅ Update dataclass fields (mode, provider, cloud_model, local_model, cloud_api_key_present)
1b. ✅ Update `load_settings()` function
1c. ✅ Update docstring (remove legacy env var references)
1d. ✅ Update `resolve_model_target()` to use mode/local_model
1e. ✅ Update `as_env()` to export new field names

### Step 2: `retrieval/rerank.py` - Settings Branch ✅ DONE
2a. ✅ Updated settings branch (lines 315-343) to read from new fields
2b. ✅ Added Pydantic-style validation for cloud mode

### Step 3: `retrieval/rerank.py` - Conditionals 🔧 IN PROGRESS
**CURRENT TASK** - Fix undefined `backend` variable:
3a. Line 390: `if backend == 'cohere':` → `if mode == 'cloud' and provider == 'cohere':`
3b. Line 472: `elif backend == 'voyage':` → `elif mode == 'cloud' and provider == 'voyage':`
3c. Replace `cohere_model` → `cloud_model` in all cloud blocks
3d. Replace `snippet_cohere` → `snippet_cloud`
3e. Replace `cohere_top_n` → `cloud_top_n`
3f. Replace `cohere_key_present` → `cloud_api_key_present`
3g. Remove hardcoded fallback `cloud_model or "rerank-2"` → just `cloud_model`

### Step 4: `retrieval/rerank.py` - Remove Backwards Compat Fallbacks ⏳ PENDING
4a. Remove fallback chains in `_load_cached_config()` (lines 53-80)
4b. Clean reads only - no `or os.getenv('OLD_KEY')` patterns

### Step 5: Remaining TIER 1 server files
5a. `server/services/config_store.py`
5b. `server/asgi.py`
5c. `server/reranker_info.py`
5d. Other server files

### Step 6: Config + Types
6a. `agro_config.json`
6b. `web/src/types/index.ts`

### Step 7: UI Components
7a. React components (TIER 5)
7b. JS modules (TIER 6)

### Step 8: Tests + Verification
8a. Update tests (TIER 7)
8b. Run smoke tests
