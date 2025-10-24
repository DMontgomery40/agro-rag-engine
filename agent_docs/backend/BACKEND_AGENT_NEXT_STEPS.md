# Backend Agent: Next Steps Summary

## Current Status ✅

You've made excellent progress:
- ✅ App factory with request ID middleware + JSON error handling
- ✅ Routers extracted: `config`, `pipeline`, `traces`, `repos`, `editor`
- ✅ Services created: `config_store`, `traces`, `editor`
- ✅ All tests green

**Issue to fix first**: Duplicate `/api/config-schema` in `asgi.py` (lines 110-237) - delete it, router version is already included.

---

## Phase 2: Extract Search/RAG Endpoints

**Priority**: HIGH - Frontend needs these for Search page (Vertical Slice 2)

**Endpoints to Extract**:
- `GET /search` - Retrieval-only
- `GET /answer` - Full RAG with LangGraph
- `POST /api/chat` - Chat with settings overrides

**Complexity**: MEDIUM (LangGraph integration but no redesign)

**Detailed Guide**: See `agent_docs/backend/search_rag_extraction_guide.md`

### Quick Summary:

1. **Create Service Layer** (`server/services/rag.py`):
   - `search_only()` - wraps hybrid search
   - `answer_question()` - wraps LangGraph invoke
   - `chat_with_settings()` - env override scoping
   - `scoped_env_override()` - context manager for env cleanup

2. **Create Router** (`server/routers/search.py`):
   - Thin request/response handlers
   - Trace management
   - Telemetry integration
   - Pydantic models for `/api/chat`

3. **Wire into asgi.py**:
   - `app.include_router(search_router)`

4. **Add Tests**:
   - `tests/routers/test_search_direct.py`
   - Test all 3 endpoints return expected shape

5. **Remove from main branch `server/app.py`** (after tests pass)

**Estimated Time**: 4 hours

---

## Phase 3: Continue Extraction (Lower Priority)

After search/RAG:
- Keywords endpoints (`/api/keywords/*`)
- Indexing endpoints (`/api/index/*`)
- Cost estimator (`/api/cost/*`)
- Profiles (`/api/profiles/*`)

---

## Merge Cadence

**After Phase 2 complete**:
1. Verify all tests green in worktree
2. Ask user to merge `feature-backend-modularization` → `development`
3. Frontend can then integrate against stable search endpoints

---

## Remember

- ❌ Don't refactor LangGraph itself (just wrap it)
- ❌ Don't add new features (extraction only)
- ✅ Small commits per router
- ✅ Test immediately after each extraction
- ✅ Use relative paths (no `/Users/...`)
- ✅ Log with request_id context

---

**Start with**: Fix duplicate route, then proceed with search/RAG extraction using the detailed guide.

