# Delegation Instructions for Agent Teams
**Date**: October 24, 2025  
**From**: Opus (Refactor Architect)  
**To**: Sonnet (Middle Management) → Backend/Frontend Agents  
**Status**: Ready for tactical execution

## Executive Summary

Both refactors successfully merged to development with **parallel architecture**:
- Old monolithic code remains in production 
- New modular code exists alongside for testing
- Zero production impact
- Ready for incremental slices

## Current State

### ✅ Completed:
- Backend: 9 routers + 5 services extracted (Slice 1 + 2)
- Frontend: React Dashboard scaffold with live data
- Docker: All bind mounts configured, containers running
- Tests: Both old and new code paths verified
- **PUSHED TO ORIGIN**: All changes now in remote `development` branch

### ⚠️ Fixed Issues:
- Reranker import error (`unified_config_enabled` → backward compat alias added)
- Docker web mount (already in docker-compose.services.yml)

### 📋 Three Major Projects Status:
1. **Backend modularization**: ACTIVE - ready for Slice 3+
2. **Frontend React migration**: ACTIVE - ready for feature build-out  
3. **Reranker reset**: ON HOLD - do not modify reranker code beyond critical fixes

---

## Backend Agent Instructions (via Sonnet)

### Immediate Tasks (Slice 3):

**Extract Cost & Profiles Routers**:
```python
# Target endpoints from server/app.py:
/api/cost/*
/api/profiles/*

# Create:
server/routers/cost.py
server/routers/profiles.py
server/services/cost.py
server/services/profiles.py
tests/routers/test_cost_direct.py
tests/routers/test_profiles_direct.py
```

### Guidelines:
1. **DO NOT modify server/app.py** - keep monolithic version intact
2. **Add routers to server/asgi.py** incrementally
3. **Use common.paths helpers** for all file paths (Docker compatibility)
4. **Test via direct import**: `from server.asgi import create_app`
5. **Verify in Docker**: `docker exec agro-api python3 -c "..."`

### Success Criteria:
- All new routers importable via asgi.py
- Tests pass via `pytest tests/routers/`
- No changes to monolithic app.py
- Docker paths work (`/app/...`)

---

## Frontend Agent Instructions (via Sonnet)

### Immediate Tasks (Slice 2):

**Build Config Management UI**:
```typescript
// Target features:
web/src/pages/Config.tsx - Main config page
web/src/components/ConfigForm.tsx - Schema-driven form
web/src/hooks/useConfigSchema.ts - Fetch /api/config-schema
web/src/services/api.ts - Centralized API client
```

### Schema-Driven Approach:
1. Fetch schema from `/api/config-schema`
2. Generate form fields dynamically
3. Map to existing CSS tokens (in `web/src/styles/tokens.css`)
4. Wire save to `/api/config` POST

### Guidelines:
1. **DO NOT modify backend** (consume existing APIs only)
2. **Use existing design tokens** from legacy CSS
3. **Test with Playwright**: Add `tests/config-ui.spec.ts`
4. **Build to dist/**: `cd web && npm run build`
5. **Verify at**: http://localhost:8012/web

### Success Criteria:
- Config form renders from schema
- Settings persist via API
- Playwright test passes
- Production build < 200KB

---

## Critical Constraints (Both Agents)

### DO NOT TOUCH:
- ❌ **server/app.py** (except /web mount logic if needed)
- ❌ **Reranker code** (retrieval/rerank.py, server/reranker.py)
- ❌ **Production Dockerfile CMD** (stays as server.app:app)

### MUST DO:
- ✅ **Test everything** (smoke tests required)
- ✅ **Docker compatibility** (use relative paths)
- ✅ **Maintain parallel paths** (old and new coexist)
- ✅ **Document in agent_docs/** subdirectories

### Accessibility Requirements:
- Every backend setting must be exposed in GUI
- Every GUI control must wire to real backend
- No placeholders or stubs

---

## Coordination Points

### API Contract Changes:
If backend adds new endpoints, update:
1. OpenAPI schema if applicable
2. Frontend TypeScript types
3. Integration tests

### Shared Dependencies:
- Both use `/api/pipeline/summary` (already working)
- Both use `/api/config-schema` (backend provides, frontend consumes)

### Testing Sync:
1. Backend tests new routers via direct import
2. Frontend tests via Playwright
3. Integration tested via Docker exec

---

## Next Slices Planning

### Backend Roadmap:
- Slice 3: Cost & Profiles *(current)*
- Slice 4: Reranker & Docker endpoints
- Slice 5: Index & Storage endpoints
- Slice 6: Final extraction (cards, misc)

### Frontend Roadmap:
- Slice 2: Config UI *(current)*
- Slice 3: Search & Chat interfaces
- Slice 4: Analytics & Metrics
- Slice 5: Dev Tools tab
- Slice 6: Settings & Admin

---

## Rollback Instructions

If anything breaks production:

### Quick Rollback:
```bash
# No changes needed - monolithic still runs
docker compose -f docker-compose.services.yml restart api
```

### Full Rollback (if needed):
```bash
git revert HEAD~2  # Revert both merge commits
docker compose -f docker-compose.services.yml up -d --force-recreate api
```

---

## Questions for User (David)

Before agents proceed:
1. **Priority**: Which slice is more urgent - Backend Slice 3 or Frontend Slice 2?
2. **Cutover timeline**: When do you want to switch Docker to modular app?
3. **PR strategy**: Merge each slice separately or batch?

---

## Hand-off Checklist

**For Sonnet**:
- [ ] Assign backend agent to Slice 3 (cost/profiles)
- [ ] Assign frontend agent to Slice 2 (config UI)
- [ ] Set up daily sync to verify no conflicts
- [ ] Ensure both test before claiming "done"
- [ ] Report blockers immediately

**Success Metrics**:
- Zero production downtime
- All tests green
- Docker integration verified
- Both old and new paths functional

---

*Ready for delegation to Sonnet for tactical execution*
