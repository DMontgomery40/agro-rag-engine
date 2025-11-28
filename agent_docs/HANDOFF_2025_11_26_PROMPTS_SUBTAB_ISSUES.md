# Handoff Document: System Prompts Subtab & Config Capture Issues
**Date:** 2025-11-26
**Status:** INCOMPLETE - Multiple Issues Unresolved
**Priority:** HIGH - User-facing features broken

---

## What is AGRO?

AGRO (Automated Grounded Retrieval Operations) is a local-first RAG (Retrieval-Augmented Generation) engine for codebases. It allows developers to:
1. Index code repositories into vector embeddings + BM25 sparse indexes
2. Search code using hybrid retrieval (dense vectors + sparse BM25 + reranking)
3. Chat with an LLM that answers questions grounded in the actual codebase
4. Evaluate retrieval accuracy with golden question sets
5. Configure all RAG parameters via a web GUI

**Key Architecture:**
- **Backend:** FastAPI server at `server/asgi.py` (port 8000 or 8012)
- **Frontend:** React/Vite app at `web/` (port 5173 dev, 8012/web prod)
- **Config System:** Pydantic models in `server/models/agro_config_model.py`, stored in `agro_config.json`, accessed via `server/services/config_registry.py`
- **Eval System:** `eval/eval_rag.py` runs retrieval accuracy tests, saves results to `data/evals/eval_YYYYMMDD_HHMMSS.json`

---

## What Was Being Implemented

### Part A: Filter EvalAnalysis Config Keys
**Goal:** Reduce config keys shown in EvalAnalysis from 242+ down to ~68 RAG-relevant keys.

**Problem:** The `capture_eval_config()` function in `eval/eval_rag.py` was calling `config_registry.get_all_with_sources()` which returns ALL environment variables (PATH, HOME, Grafana theme, etc.) - not just RAG settings.

**Solution Implemented:**
1. Created `RAG_EVAL_CONFIG_KEYS` whitelist in `server/models/agro_config_model.py` (~70 keys)
2. Updated `capture_eval_config()` to filter by this whitelist

**Files Modified:**
- `server/models/agro_config_model.py` - Added `RAG_EVAL_CONFIG_KEYS` set
- `eval/eval_rag.py` - Updated `capture_eval_config()` to filter

### Part B: System Prompts Subtab
**Goal:** Add a "System Prompts" subtab under Eval Analysis where users can edit all LLM prompts used in the RAG pipeline.

**Solution Implemented:**
1. Created `SystemPromptsConfig` Pydantic model with 7 prompt fields
2. Created `/api/prompts` API endpoints in `server/routers/prompts.py`
3. Created `SystemPromptsSubtab.tsx` React component
4. Added subtab navigation to `EvalAnalysisTab.tsx`
5. Wired prompts from hardcoded strings to config registry lookups

**Files Created:**
- `server/routers/prompts.py` - CRUD API for prompts
- `web/src/components/Evaluation/SystemPromptsSubtab.tsx` - React UI

**Files Modified:**
- `server/models/agro_config_model.py` - Added `SystemPromptsConfig`
- `server/asgi.py` - Registered prompts router
- `web/src/components/tabs/EvalAnalysisTab.tsx` - Added subtab navigation
- `agro_config.json` - Added `system_prompts` section
- Multiple files to wire prompts to config (see below)

---

## CURRENT ISSUES (UNRESOLVED)

### Issue 1: Eval Runs Show 0 Config Keys

**Symptom:** When running an eval from the GUI, the saved JSON file has `"config": null` or `"config": {}`.

**What Was Verified:**
```bash
# This WORKS - returns 68 keys:
PYTHONPATH=. python3 -c "
from eval.eval_rag import capture_eval_config
cfg = capture_eval_config()
print('Config keys:', len(cfg))
"
# Output: Config keys: 68

# But the actual eval file has 0 keys:
python3 -c "import json; d=json.load(open('data/evals/eval_20251126_123957.json')); print('Config:', d.get('config'))"
# Output: Config: None
```

**Root Cause Investigation Needed:**
The `_config_registry` module-level variable in `eval/eval_rag.py` (lines 12-17) might be `None` when the eval is run via the GUI/API vs. when run directly from CLI.

```python
# eval/eval_rag.py lines 12-17
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None
```

The `capture_eval_config()` function (line 73) returns `{}` if `_config_registry is None`:
```python
def capture_eval_config() -> dict:
    if _config_registry is None:
        return {}
    # ...
```

**Possible Causes:**
1. When eval runs via subprocess from the API, the import might fail
2. The config registry might not be loaded when running in Docker container context
3. There may be a circular import issue

**To Debug:**
1. Add logging to `capture_eval_config()` to see if `_config_registry` is None
2. Check how the eval is invoked from `server/routers/eval.py` - is it a subprocess?
3. Test running eval from both CLI and API to compare behavior

---

### Issue 2: System Prompts Subtab Not Visible

**Symptom:** The subtab buttons ("Eval Analysis" and "System Prompts") do not appear in the Eval Analysis tab UI.

**What Should Appear:**
Looking at `web/src/components/tabs/EvalAnalysisTab.tsx` lines 567-615, there should be a subtab navigation bar with two buttons. The code is present:

```tsx
{/* Subtab Navigation */}
<div style={{
  display: 'flex',
  gap: '2px',
  padding: '0 24px',
  borderBottom: '1px solid var(--line)',
  background: 'var(--bg-elev1)'
}}>
  <button onClick={() => setActiveSubtab('analysis')} ...>
    📊 Eval Analysis
  </button>
  <button onClick={() => setActiveSubtab('prompts')} ...>
    📝 System Prompts
  </button>
</div>
```

**Root Cause Investigation Needed:**

1. **Conditional Rendering:** The subtab navigation is ONLY rendered in the final return block (after line 283). There are early returns for:
   - `loading` state (lines 190-214) - shows spinner
   - `error` state (lines 216-241) - shows error message
   - `runs.length === 0` (lines 243-281) - shows "No Evaluation Runs Yet"

   If the component is stuck in loading or error state, subtabs won't show.

2. **API Issues Fixed But May Need Verification:**
   - Fixed trailing slash issue: Changed `@router.get("/")` to `@router.get("")` in `server/routers/prompts.py`
   - The `/api/prompts` endpoint now returns 200 (verified via curl)
   - The `/api/eval/runs` endpoint returns 35 runs (verified via curl)

3. **Possible Causes:**
   - Component may be erroring silently in the browser
   - CSS may be hiding the elements
   - State management issue with `activeSubtab`
   - Import of `SystemPromptsSubtab` may be failing

**To Debug:**
1. Open browser DevTools Console - check for React errors
2. Open browser DevTools Network tab - verify `/api/eval/runs` and `/api/prompts` return 200
3. Use React DevTools to inspect the EvalAnalysisTab component state
4. Add `console.log` statements to verify the component reaches the subtab render section

---

### Issue 3: Duplicate Cards Builder Prompts (NOT ADDRESSED)

**Critical Oversight:** There are TWO separate "cards builder" systems, but only ONE is actually used. The other is dead code that does nothing.

**The Two Files:**

1. **`indexer/build_cards.py`** - This is the ACTUAL cards builder used during indexing
   - Called by the indexing pipeline
   - Generates semantic cards (JSON summaries) for code chunks
   - Builds BM25 index over the cards
   - Uses `PROMPT_SEMANTIC_CARDS` config key

2. **`server/cards_builder.py`** - This appears to be DEAD CODE or a duplicate
   - Not clear if it's actually called anywhere
   - May have been created as a server-side version but never wired up
   - Uses `PROMPT_LIGHTWEIGHT_CARDS` config key

**Investigation Needed:**
```bash
# Find all references to cards_builder.py
grep -r "cards_builder" --include="*.py" .
grep -r "from server.cards_builder" --include="*.py" .
grep -r "import cards_builder" --include="*.py" .

# Find all references to build_cards.py
grep -r "build_cards" --include="*.py" .
grep -r "from indexer.build_cards" --include="*.py" .
```

**Questions to Answer:**
1. Is `server/cards_builder.py` actually used anywhere?
2. Should `PROMPT_LIGHTWEIGHT_CARDS` be removed from the prompts API?
3. Are there two different prompts doing the same thing?

**Current State of Prompts:**
The `SystemPromptsSubtab` and API expose 7 prompts:
1. `main_rag_chat` - Main chat system prompt (USED in `server/langgraph_app.py`)
2. `query_expansion` - Multi-query generation (USED in `retrieval/hybrid_search.py`)
3. `query_rewrite` - Query optimization (USED in `server/langgraph_app.py`)
4. `semantic_cards` - Full card generation (USED in `indexer/build_cards.py`)
5. `lightweight_cards` - Quick card generation (MAYBE UNUSED - `server/cards_builder.py`)
6. `code_enrichment` - Metadata extraction (USED in `common/metadata.py`)
7. `eval_analysis` - Eval regression analysis (USED in `server/routers/eval.py`)

**Action Required:**
- Verify if `server/cards_builder.py` is dead code
- If dead, remove it and remove `PROMPT_LIGHTWEIGHT_CARDS` from config
- If used, document when/why it's used vs `indexer/build_cards.py`

---

## Files Changed in This Session

### Created:
- `server/routers/prompts.py` - Prompts CRUD API

### Modified:
- `server/models/agro_config_model.py` - Added `RAG_EVAL_CONFIG_KEYS`, `SystemPromptsConfig`
- `server/asgi.py` - Registered prompts router
- `eval/eval_rag.py` - Updated `capture_eval_config()` to filter by whitelist
- `agro_config.json` - Added `system_prompts` section with defaults
- `web/src/components/tabs/EvalAnalysisTab.tsx` - Added subtab navigation
- `web/src/components/Evaluation/EvalDrillDown.tsx` - Added `CollapsibleValue` component
- `retrieval/hybrid_search.py` - Wired `PROMPT_QUERY_EXPANSION` to config
- `server/langgraph_app.py` - Wired `PROMPT_QUERY_REWRITE` to config
- `indexer/build_cards.py` - Wired `PROMPT_SEMANTIC_CARDS` to config
- `server/cards_builder.py` - Wired `PROMPT_LIGHTWEIGHT_CARDS` to config (MAY BE DEAD CODE)
- `common/metadata.py` - Wired `PROMPT_CODE_ENRICHMENT` to config
- `server/routers/eval.py` - Wired `PROMPT_EVAL_ANALYSIS` to config

### Created (New Component):
- `web/src/components/Evaluation/SystemPromptsSubtab.tsx` - React component for editing prompts

---

## How to Verify the Backend Works

```bash
# 1. Start the stack
./scripts/down.sh && ./scripts/up.sh

# 2. Test prompts API
curl -s http://localhost:8000/api/prompts | python3 -c "import sys,json; d=json.load(sys.stdin); print('Keys:', list(d['prompts'].keys()))"
# Expected: ['main_rag_chat', 'query_expansion', 'query_rewrite', 'semantic_cards', 'lightweight_cards', 'code_enrichment', 'eval_analysis']

# 3. Test config capture directly
PYTHONPATH=. python3 -c "from eval.eval_rag import capture_eval_config; print(len(capture_eval_config()), 'keys')"
# Expected: 68 keys

# 4. Test eval runs API
curl -s http://localhost:8000/api/eval/runs | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['runs']), 'runs')"
# Expected: 35+ runs
```

---

## How to Debug the Frontend

```bash
# 1. Start vite dev server
cd web && npm run dev
# Note the port (usually 5173 or 5174)

# 2. Open browser to http://localhost:5174/web/
# 3. Navigate to Eval Analysis tab
# 4. Open DevTools (F12)
# 5. Check Console for errors
# 6. Check Network tab for failed requests
# 7. Use React DevTools to inspect EvalAnalysisTab state
```

---

## Key Code Locations

| Purpose | File | Key Lines |
|---------|------|-----------|
| Config whitelist | `server/models/agro_config_model.py` | Search for `RAG_EVAL_CONFIG_KEYS` |
| Prompts Pydantic model | `server/models/agro_config_model.py` | Search for `SystemPromptsConfig` |
| Prompts API | `server/routers/prompts.py` | Entire file |
| Config capture | `eval/eval_rag.py` | `capture_eval_config()` function |
| Subtab UI | `web/src/components/tabs/EvalAnalysisTab.tsx` | Lines 567-615 |
| Prompts UI | `web/src/components/Evaluation/SystemPromptsSubtab.tsx` | Entire file |
| Cards builder (USED) | `indexer/build_cards.py` | Uses `PROMPT_SEMANTIC_CARDS` |
| Cards builder (MAYBE DEAD) | `server/cards_builder.py` | Uses `PROMPT_LIGHTWEIGHT_CARDS` |

---

## Recommended Next Steps

1. **Debug config capture in eval:**
   - Add print/logging to `capture_eval_config()` to see if `_config_registry` is None
   - Check how eval is invoked from API - subprocess or direct call?
   - Run eval from CLI and verify config is captured

2. **Debug subtab visibility:**
   - Check browser console for React errors
   - Verify the component isn't stuck in loading/error state
   - Add console.log to verify code flow reaches subtab render

3. **Investigate cards_builder.py:**
   - Search codebase for all imports/references
   - Determine if it's dead code
   - If dead, remove it and the `PROMPT_LIGHTWEIGHT_CARDS` config

4. **Run a fresh eval and verify:**
   ```bash
   PYTHONPATH=. REPO=agro python3 eval/eval_rag.py
   # Check the new eval file has config keys
   ```

---

## Environment Notes

- **Working Directory:** `/Users/davidmontgomery/agro-rag-engine`
- **Git Branch:** `development`
- **Services:** Use `./scripts/up.sh` and `./scripts/down.sh`
- **Dev Server:** `cd web && npm run dev` (port 5173 or 5174)
- **API Server:** Docker container `rag-service-api` (port 8000 mapped to 8012)

---

## Summary

Two user-facing features are broken:
1. **Eval config capture** - Shows 0 keys instead of 68
2. **System Prompts subtab** - Not visible in UI

One technical debt issue discovered:
3. **Duplicate cards builder** - `server/cards_builder.py` may be dead code

All backend APIs appear to work when tested directly via curl. The issues are likely in:
- How eval is invoked (subprocess vs import) affecting config registry availability
- React component state/rendering preventing subtabs from appearing
