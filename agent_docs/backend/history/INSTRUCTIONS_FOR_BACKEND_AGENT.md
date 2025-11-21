# Instructions for Backend Agent: Final Cleanup for Slice 1

**Current Status**: Extraction EXCEEDS expectations! Just need minor cleanup.

---

## What You've Accomplished ✅

**Outstanding work!** You've extracted far more than initially planned:

### Routers Extracted
- ✅ `server/routers/config.py` - `/api/config-schema`
- ✅ `server/routers/pipeline.py` - `/api/pipeline/summary`
- ✅ `server/routers/traces.py` - `/api/traces*`
- ✅ `server/routers/repos.py` - `/api/repos*`
- ✅ `server/routers/editor.py` - editor endpoints
- ✅ `server/routers/search.py` - `/search`, `/answer`, `/api/chat` **[BONUS!]**

### Services Created
- ✅ `server/services/config_store.py` - atomic writes, secrets
- ✅ `server/services/traces.py` - trace management
- ✅ `server/services/editor.py` - lifecycle management
- ✅ `server/services/rag.py` - search/answer/chat with LangGraph **[BONUS!]**
- ✅ `server/services/keywords.py` - keyword generation **[BONUS!]**

### Infrastructure
- ✅ App factory with request ID middleware
- ✅ Global JSON error handler
- ✅ Logging standard documented
- ✅ Tests green for all extracted routers

**You've completed Slice 1 AND Slice 2 backend work!**

---

## Minor Cleanup Needed (Before Merge)

### Issue 1: Duplicate `config_router` Include

**File**: `.worktrees/feature-backend-modularization/server/asgi.py`

**Problem**: `config_router` is included twice:
- Line 106: `app.include_router(config_router)` ✅ First (correct)
- Line 216: `app.include_router(config_router)` ❌ Duplicate

**Fix**: Delete line 216 (or the second occurrence)

```python
# Around line 210-220 in asgi.py
app.include_router(feedback_router)
app.include_router(reranker_info_router)
app.include_router(alerts_router)
app.include_router(monitoring_router)
app.include_router(traces_router)
app.include_router(repos_router)
app.include_router(config_router)  # ❌ DELETE THIS LINE (duplicate)
app.include_router(editor_router)
```

### Issue 2: Inline `/api/pipeline/summary` Still in `asgi.py`

**File**: `.worktrees/feature-backend-modularization/server/asgi.py`

**Problem**: `/api/pipeline/summary` is defined in TWO places:
1. `server/routers/pipeline.py` (extracted router) ✅
2. Lines 112-207 in `asgi.py` (inline definition) ❌

**Decision needed**: Which one to keep?

**Option A (Recommended)**: Keep router, remove inline
- Router is cleaner separation of concerns
- Inline was probably leftover from initial implementation

**Option B**: Keep inline, remove router include
- If inline version has specific logic needed in app factory

**Recommended Fix** (Option A):
```python
# In asgi.py, DELETE lines 112-207 (entire inline function)
# Keep the router include at line 107:
app.include_router(pipeline_router)
```

### Cleanup Steps

```bash
cd .worktrees/feature-backend-modularization

# 1. Edit server/asgi.py
#    - Remove duplicate config_router include (line 216)
#    - Remove inline pipeline_summary function (lines 112-207)

# 2. Verify tests still pass
PYTHONPATH=. pytest -q tests/test_pipeline_summary_direct.py
PYTHONPATH=. pytest -q tests/test_config_schema_direct.py
PYTHONPATH=. pytest -q tests/test_request_id_header.py
PYTHONPATH=. pytest -q tests/routers/test_*.py

# 3. Verify no import errors
python -c "from server.app import app; print('✅ App imports successfully')"

# 4. Quick smoke test (optional)
python -m uvicorn server.app:app --reload --port 8012
# In another terminal:
curl http://localhost:8012/api/pipeline/summary
curl http://localhost:8012/api/config-schema
```

---

## After Cleanup: Ready to Merge!

Once cleanup is complete, you're **100% done with Slice 1** (and bonus Slice 2 backend work).

### What to Report Back

1. ✅ Duplicate router includes removed
2. ✅ Inline function removed (or clarify if keeping it intentionally)
3. ✅ All tests green (pytest output)
4. ✅ No import errors
5. 🚀 **Ready to merge to development**

---

## Merge Checklist

Before merge:
- ✅ All routers extracted and wired
- ✅ All services created
- ✅ No duplicate route definitions
- ✅ No duplicate router includes
- ✅ All tests passing
- ✅ No absolute paths in new code
- ✅ Logging uses `logger.info()` with context
- ✅ Request IDs on all responses
- ✅ JSON error handling for 500s

---

## Next Phase (After Merge to Development)

### Slice 3: Keywords Endpoints (Already Extracted!)

You've already extracted keywords service and likely have it wired. If not:

**Create**: `server/routers/keywords.py`
**Extract**:
- `GET /api/keywords`
- `POST /api/keywords/add`
- `POST /api/keywords/generate`

**Service**: `server/services/keywords.py` (already exists!)

### Slice 4: Indexing Endpoints

**Create**: `server/routers/indexing.py`
**Extract**:
- `POST /api/index/start`
- `POST /api/index/run`
- `GET /api/index/status`
- `GET /api/index/stats`

**Create**: `server/services/indexing.py`

### Slice 5: Remaining Endpoints

- Cost estimator (`/api/cost/*`)
- Profiles (`/api/profiles/*`)
- MCP (`/api/mcp/*`)
- Onboarding (`/api/onboarding/*`)
- Semantic Boosts (`/api/cards/*`)

---

## Notes

### About the Search/RAG Extraction

You've successfully extracted the most complex endpoints (search/answer/chat) with LangGraph integration. The implementation looks solid:
- ✅ Lazy-loading LangGraph graph
- ✅ Fallback to retrieval-only when generation unavailable
- ✅ Env override scoping for chat
- ✅ Metrics integration
- ✅ Error handling

**Great work managing the complexity!**

### About the Service Layer

Your service functions follow good patterns:
- Clear separation of concerns
- No HTTP-specific logic (that's in routers)
- Reusable across different router endpoints
- Error handling with logging

**This is exactly the right architecture.**

---

## Questions?

**Q: Should I add more tests?**
A: Current direct-import tests are sufficient for merge. Integration tests can come later.

**Q: Should I refactor the RAG service more?**
A: No - extraction is complete. Leave optimization for later.

**Q: What about the massive `app.py` in main branch?**
A: That's fine - it stays in main branch. After merge, it becomes the legacy version. We don't delete it until all routers are extracted and tested in production.

---

**You're essentially done!** Just clean up the two duplicates and you're ready to merge. Excellent work extracting way more than initially scoped! 🎉

