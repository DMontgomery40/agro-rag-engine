# HANDOFF: Code Audit & Critical Issues

**Date:** 2025-11-28  
**Branch:** `development`  
**Status:** 1 of 12 issues completed

---

## Session Summary

Conducted a thorough code audit of the AGRO RAG Engine repository, excluding `/gui`, `/public`, `/website`, `/screenshots`, `/tests`, `/assets`, `/examples`, `/agent_docs`, `/internal_docs`, `/node_mcp`, `/playwright-report`, `/reports`, and `/tools`.

### What Was Completed

**Issue #3: Dynamic Repository Selection & Config Propagation** ✅

Created a centralized repo management system:

1. **New Files Created:**
   - `web/src/stores/useRepoStore.ts` - Zustand store for repo state (168 lines)
   - `web/src/components/ui/RepoSelector.tsx` - Reusable dropdown (116 lines)
   - `web/src/components/ui/RepoSwitcherModal.tsx` - Dashboard modal (261 lines)

2. **Files Modified:**
   - `web/src/components/Dashboard/QuickActions.tsx` - Uses modal instead of `prompt()`
   - `web/src/components/Chat/ChatInterface.tsx` - Uses centralized store
   - `web/src/components/RAG/IndexingSubtab.tsx` - Uses centralized store
   - `web/src/components/RAG/DataQualitySubtab.tsx` - Uses centralized store
   - `web/src/stores/index.ts` - Exports new store
   - `web/src/components/ui/index.ts` - Exports new components
   - `server/routers/config.py` - Calls `reload_config()` on all modules when config changes
   - `server/langgraph_app.py` - Uses `_REPO` from config registry instead of `os.getenv()`
   - `retrieval/hybrid_search.py` - Proper `reload_config()` implementation

3. **Playwright Verification:** PASSED (smoke test confirms app renders)

---

## Remaining Critical Issues (11 total)

### CRITICAL PRIORITY

#### Issue #1: from_flat_dict Field Mapping Bug in agro_config_model.py

**Location:** `server/models/agro_config_model.py`, `from_flat_dict()` method

**Problem:** The `LayerBonusConfig` initialization has incorrect field mappings. The model has fields `vendor_penalty`, `freshness_bonus`, `intent_matrix` but the code tries to set `gui`, `retrieval`, `indexer` which don't exist.

**Impact:** Config loading may silently fail or use wrong defaults

---

#### Issue #2: Hardcoded Model Names Throughout Codebase

**Locations:**
- `server/routers/eval.py` - hardcoded model as default analysis model
- `server/env_model.py` - hardcoded model fallbacks
- Various other locations

**Problem:** Model names should come from config registry, not hardcoded.

---

#### Issue #4: Incomplete Config Propagation

**Problem:** Several modules cache config values at import time but lack proper `reload_config()` functions.

**Modules needing review:**
- `indexer/index_repo.py`
- `indexer/build_cards.py`
- `server/services/rag.py`
- `reranker/learning_reranker.py`
- `eval/eval_rag.py`

---

### MEDIUM PRIORITY

#### Issue #5: Embedding Type Validation Gap

**Location:** `retrieval/hybrid_search.py`

**Problem:** When `EMBEDDING_TYPE` is invalid, code falls back silently to OpenAI without warning.

---

#### Issue #6: BM25 Index Path Resolution

**Location:** `retrieval/hybrid_search.py`, `_load_bm25_index()`

**Problem:** BM25 index path construction uses mixed approaches and may fail for some repo configurations.

---

#### Issue #7: Reranker Backend Validation

**Location:** `retrieval/rerank.py`

**Problem:** No validation for `RERANKER_BACKEND` values. Invalid values silently disable reranking.

---

#### Issue #8: Dead Import Cleanup

**Locations:** Multiple files have unused imports that should be cleaned.

---

#### Issue #9: Inconsistent Error Handling

**Pattern Found:** Mix of return None, raise exceptions, return empty dicts/lists, log and continue.

---

### MINOR PRIORITY

#### Issue #10: Type Hints Missing

**Locations:** Several core modules lack comprehensive type hints.

---

#### Issue #11: Duplicate Code in Search Pipeline

**Location:** `retrieval/hybrid_search.py` - similar boost/scoring logic in multiple places.

---

#### Issue #12: React Component Prop Validation

**Location:** Various web components lack proper TypeScript interfaces.

---

## Files Currently Modified (Unstaged)

```
retrieval/hybrid_search.py (+33 lines)
retrieval/rerank.py (+158 lines)
server/langgraph_app.py (+14 lines)
server/models/agro_config_model.py (+213 lines)
server/routers/config.py (+96 lines)
web/src/components/Dashboard/QuickActions.tsx (+16 lines)
web/src/components/Chat/ChatInterface.tsx (-17 lines, refactored)
+ 3 new untracked files (store, selector, modal)
```

## Verification Status

- ✅ Playwright smoke test passed
- ✅ Git diff shows reasonable changes (963 insertions, 214 deletions)
- ✅ All files intact (QuickActions: 356 lines, hybrid_search: 822 lines)
- ⏳ User approval pending for commit

---

## Important Notes

- **DO NOT** commit without user approval
- All changes must be TSX React, no legacy JS
- All new settings must go in agro_config.json and Pydantic models
- Screenshots showing massive deletions were Cursor UI cache errors - actual diffs are minimal
- User is dyslexic - all settings must be in GUI (ADA compliance)
- Branch workflow: development → staging → main
