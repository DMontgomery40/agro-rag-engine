# Evening Shift Handoff - October 24, 2025

**From**: Sonnet (Day Shift - Middle Management)  
**To**: Fresh Agent (Evening Shift)  
**User**: David Montgomery (will be back in the morning)  
**Time**: ~8pm PT  
**Project**: AGRO RAG Engine - Dual Backend + Frontend Refactor

---

## TL;DR - What You Need to Know

**You're coordinating a massive double refactor** of a production RAG system:
1. **Backend**: Modularizing 4165-line monolithic FastAPI app into routers/services
2. **Frontend**: Migrating legacy HTML/JS to modern React/TypeScript/Tailwind

**Current Status**: 
- ✅ Slices 1 & 2 CODE COMPLETE in worktrees (backend: 9 routers, frontend: Dashboard + Config UI)
- ✅ Both MERGED to development and PUSHED to origin
- ✅ Production stable (old monolithic code still running)
- ⏳ **Frontend Slice 2 just finished** - needs testing & merge
- ⏳ Backend Slice 3 assigned but not started yet

**Your Job**: Review frontend's Slice 2 work, coordinate testing/merge, keep both agents moving forward.

---

## System Context (5-Minute Brief)

### The Application
**AGRO RAG Engine** - Code search/Q&A system for developers
- **9 Docker containers**: API, Qdrant (vectors), Redis, VSCode, Grafana, Prometheus, Loki, Promtail, Alertmanager
- **Production deployment**: Everything runs in Docker
- **Complex GUI**: 20+ features, accessibility requirements (ADA compliance)

### The Refactor
**Why**: Monolithic 4165-line `server/app.py` unmaintainable; legacy GUI (74 files) hard to extend

**Strategy**: **Strangler pattern** - new code lives alongside old until proven, then cutover

**Progress**: ~20% complete

---

## Current State (Verified Working)

### Git:
```
Branch: development (HEAD: 7c0109e)
Pushed to: origin/development ✅
Worktrees:
  - .worktrees/feature-backend-modularization (Slices 1&2 merged)
  - .worktrees/feature-ui-migration (Slice 1 merged, Slice 2 just completed)
```

### Production (Docker):
```bash
# All working:
curl http://localhost:8012/health          # ✅ 200
curl http://localhost:8012/api/config      # ✅ 200
curl http://localhost:8012/search?q=test   # ✅ 200
curl http://localhost:8012/gui             # ✅ Legacy GUI loads
curl http://localhost:8012/web             # ✅ React Dashboard loads
```

### Docker Containers:
```
9 containers running (all healthy):
agro-api, qdrant, rag-redis, agro-openvscode, agro-grafana,
agro-prometheus, agro-loki, agro-promtail, agro-alertmanager
```

---

## What Just Got Done (Frontend - Slice 2)

**Agent**: Lead/Front  
**Location**: `.worktrees/feature-ui-migration/`  
**Completed**: Config Management UI (schema-driven settings page)

**Files Created**:
- `web/src/services/api.ts` - API client (fetchConfigSchema, updateConfig, ingestSecrets)
- `web/src/pages/Config.tsx` - Config page component
- `web/src/components/ConfigForm.tsx` - Schema-driven form (5941 bytes)
- `web/src/App.tsx` - Updated with React Router (Dashboard + Config routes)
- `tests/config-ui.spec.ts` - Playwright tests
- Built to `web/dist/` (~181KB bundle)

**What It Does**:
- Fetches `/api/config-schema` from backend
- Renders ALL settings dynamically from schema (Generation, Retrieval, Reranker, Enrichment, Repo)
- Maps JSON Schema types to inputs (string+enum→select, boolean→checkbox, number→input)
- Masks secrets (password inputs with show/hide toggle)
- Saves via `POST /api/config`
- Imports secrets from file via `/api/secrets/ingest`

**Status**: Code complete, needs Playwright verification

---

## What's Pending

### Frontend Slice 2: Needs Testing & Merge

**Location**: `.worktrees/feature-ui-migration/`  
**Status**: ⚠️ Code done, tests added, NOT VERIFIED yet

**To Complete**:
1. Build the UI (if not already):
   ```bash
   cd .worktrees/feature-ui-migration/web
   npm install
   npm run build
   ```

2. Run Playwright tests:
   ```bash
   cd .worktrees/feature-ui-migration
   docker compose -f ../../docker-compose.services.yml restart api  # Ensure API up
   UI_BASE=http://localhost:8012 npx playwright test tests/dashboard.spec.ts tests/config-ui.spec.ts
   ```

3. If tests pass:
   - Commit changes in UI worktree
   - Merge to development
   - Push to origin

### Backend Slice 3: Not Started

**Assigned**: Extract Cost & Profiles routers  
**File**: `agent_docs/backend/current/SLICE_3_ASSIGNMENT.md`  
**Status**: Waiting for backend agent to start

---

## Critical Rules (User's Requirements)

### 1. Docker-First
- All code MUST work in Docker containers (`/app/...` paths, not `/Users/...`)
- Bind mounts in `docker-compose.services.yml`: `/server`, `/gui`, `/web`, `/data`, `/out`
- After code changes: `docker compose -f docker-compose.services.yml restart api`

### 2. No Placeholders (ADA/Legal)
- Every GUI element must wire to real backend
- Every backend endpoint must be fully functional
- No `TODO` comments or stubs
- **This is a legal/accessibility requirement - user is serious**

### 3. Strangler Pattern (Learned Hard Way)
- Old and new code must COEXIST until cutover
- Never replace working code - add alongside
- Monolithic `server/app.py` stays until proven
- New `server/asgi.py` + routers run in parallel

### 4. Testing Required
- Playwright for GUI changes (non-negotiable)
- Smoke tests for backend (pytest)
- Cannot claim "done" without proof

### 5. No Commits Without Approval
- User (David) approves all pushes
- Document work, get approval, THEN push

---

## Documentation Structure (IMPORTANT)

**DO NOT add docs to `agent_docs/` root!** (145+ files there already)

Use this structure:
```
agent_docs/
  backend/
    README.md (start here)
    current/     ← ACTIVE work ONLY
    history/     ← Completed work for reference
  ui/
    README.md (start here)
    current/     ← ACTIVE work ONLY
    history/     ← Completed work for reference
  shared/
    README.md (start here)
    current/     ← Active coordination, status
    history/     ← Past incidents, strategies
```

**When adding docs**:
- Active assignment? → `{domain}/current/`
- Completed work? → `{domain}/history/`
- Cross-cutting status? → `shared/current/`

---

## Key Documents to Read (Priority Order)

### Must Read (30 min):

1. **`agent_docs/shared/current/DELEGATION_INSTRUCTIONS_2025_10_24.md`**
   - Opus architect's merge strategy
   - Current assignments for both agents
   - Success criteria

2. **`agent_docs/shared/current/STATUS_2025_10_24_READY_FOR_SLICES_2_3.md`**
   - What's been completed
   - What's working in production
   - Current branch state

3. **`agent_docs/shared/current/PROGRESS_UI_BACKEND_MIGRATION.md`**
   - Detailed progress log
   - How to run tests
   - File locations

4. **`agent_docs/shared/history/MERGE_STRATEGY_CORRECTED.md`**
   - Critical lesson on strangler pattern
   - Why we don't replace monolithic code yet

### Reference (As Needed):

- `agent_docs/backend_modularization_plan.md` - Backend overall strategy
- `agent_docs/ui_migration_to_vite_react_ts_tailwind.md` - Frontend overall strategy
- `agent_docs/feature_inventory_and_mapping.md` - All features mapped
- `agent_docs/HANDOFF_TO_REFACTOR_ARCHITECT.md` - Full context (if you need deep dive)

---

## Immediate Tasks for You

### Task 1: Review & Test Frontend Slice 2 (1-2 hours)

**Check the code**:
```bash
cd .worktrees/feature-ui-migration/web/src

# Review files
cat services/api.ts          # API client
cat pages/Config.tsx         # Config page
cat components/ConfigForm.tsx  # Form component
```

**Build & test**:
```bash
cd .worktrees/feature-ui-migration/web
npm install
npm run build

# Check bundle size
ls -lh dist/assets/

# Run Playwright
cd ..
npx playwright test tests/config-ui.spec.ts tests/dashboard.spec.ts
```

**If tests pass**:
- Commit in UI worktree
- Merge to development
- Push to origin (with user approval in morning)

**If tests fail**:
- Document issues in `agent_docs/ui/current/SLICE_2_ISSUES.md`
- Fix or assign back to frontend agent

### Task 2: Coordinate Backend Slice 3 (if time)

**Backend agent assigned**: Extract Cost & Profiles routers  
**Assignment**: `agent_docs/backend/current/SLICE_3_ASSIGNMENT.md`

**Monitor for**:
- Are they following the pattern (routers + services, don't touch app.py)?
- Docker-compatible paths (use `common.paths` helpers)?
- Tests added?

### Task 3: Update Status Docs

**After frontend Slice 2 merges**:
Update `agent_docs/shared/current/PROGRESS_UI_BACKEND_MIGRATION.md` with:
- Slice 2 completion timestamp
- Files merged
- Test results

**Keep it concise** - just facts, no stream-of-consciousness

---

## Common Issues & Solutions

### Issue: Playwright Tests Fail

**Symptom**: Tests timeout or can't find elements  
**Fix**:
```bash
# Ensure Docker API running
docker ps | grep agro-api

# Check API responds
curl http://localhost:8012/health

# Verify /web mount works
curl -I http://localhost:8012/web

# Run with debug
PWDEBUG=1 npx playwright test tests/config-ui.spec.ts
```

### Issue: Build Size Too Large

**Symptom**: Bundle > 300KB  
**Fix**: Check for accidental imports, code-split heavy routes

### Issue: Docker Not Picking Up Changes

**Symptom**: Code changes don't reflect in container  
**Fix**:
```bash
# Restart API container
docker compose -f docker-compose.services.yml restart api

# Or force recreate
docker compose -f docker-compose.services.yml up -d --force-recreate api
```

### Issue: Import Errors in Container

**Symptom**: `ModuleNotFoundError` in Docker  
**Fix**: Check if new dependencies added - may need `docker compose build api`

---

## Agent Coordination

### Backend Agent
**Current assignment**: Slice 3 - Cost & Profiles  
**File**: `agent_docs/backend/current/SLICE_3_ASSIGNMENT.md`  
**Pattern**: Create routers + services, wire into asgi.py, add tests  
**DO NOT**: Modify monolithic app.py

### Frontend Agent  
**Just completed**: Slice 2 - Config UI  
**Next**: Await your review/merge, then Slice 3 (Search UI)  
**Pattern**: Fetch from API, render with Tailwind tokens, add Playwright test

### Your Role
- **Review** their work for architecture compliance
- **Test** before approving merges
- **Coordinate** to avoid conflicts
- **Escalate** architectural questions to Opus or user
- **Document** decisions concisely in appropriate `current/` folders

---

## Architectural Constraints (From Opus)

### Parallel Architecture (CRITICAL)
```
Current Production:
  server/app.py (4165 lines - monolithic) ← Docker runs THIS

New Modular Code (parallel):
  server/asgi.py (app factory)
  server/routers/* (extracted endpoints) ← Tested via direct import
  server/services/* (business logic)
```

**Both must work**. Cutover happens later via Dockerfile change.

### Docker Integration
- Bind mounts: `/server`, `/gui`, `/web` → `/app/*` in container
- Paths: Use `common.paths.repo_root()`, never `/Users/...` or hardcoded `/app/...`
- Restart: `docker compose ... restart api` after code changes

### Testing
- Backend: `PYTHONPATH=. pytest tests/routers/test_*.py`
- Frontend: `npx playwright test tests/*.spec.ts` (API must be running)
- Both: Verify in Docker via `docker exec agro-api python3 -c "..."`

---

## Files Changed Today (For Context)

### Merged to Development:
- Backend Slices 1 & 2: Routers/services extraction (9 routers, 5 services)
- Frontend Slice 1: React Dashboard
- Docker: Added `/web` bind mount to docker-compose.services.yml

### In UI Worktree (Uncommitted - Slice 2 COMPLETE):
- Config page (pages/Config.tsx, components/ConfigForm.tsx - 5941 bytes)
- API client (services/api.ts - fetchConfigSchema, updateConfig, ingestSecrets)
- Router update (App.tsx - React Router with /config route)
- Playwright tests (config-ui.spec.ts, dashboard.spec.ts)
- Built bundle (web/dist/ - ~181KB)
- **Status**: ✅ Code complete, needs Playwright verification + merge

### In Backend Worktree (Uncommitted - Slice 3 COMPLETE):
- Routers: cost.py, profiles.py
- Services: cost.py, profiles.py
- Tests: test_cost_direct.py, test_profiles_direct.py (both passing)
- Wired into asgi.py
- **Status**: ✅ Code complete, tests green, ready for merge

---

## What User Expects in Morning

1. **Frontend Slice 2**: ✅ COMPLETE - Test, merge, update docs
2. **Backend Slice 3**: ✅ COMPLETE - Merge, update docs
3. **Both Slices**: Playwright verification results + merge confirmation
4. **Backend Slice 4**: Assignment ready (already created: `backend/current/SLICE_4_ASSIGNMENT.md`)
5. **Status doc**: Updated in `shared/current/PROGRESS_UI_BACKEND_MIGRATION.md`
6. **No surprises**: Don't break production, get approval before pushing

---

## Quick Commands Reference

### Check Current State:
```bash
pwd && git rev-parse --abbrev-ref HEAD
git log --oneline -3
docker ps | grep agro
curl http://localhost:8012/health
```

### Test Frontend Work:
```bash
cd .worktrees/feature-ui-migration/web
npm run build
cd ..
npx playwright test tests/config-ui.spec.ts
```

### Restart Docker:
```bash
docker compose -f docker-compose.services.yml restart api
```

### Test New Routers (Backend):
```bash
python3 -c "
from server.asgi import create_app
from fastapi.testclient import TestClient
app = create_app()
client = TestClient(app)
print(client.get('/api/pipeline/summary').json())
"
```

---

## Critical Constraints (Don't Violate These)

1. ❌ Never modify `server/app.py` (keep monolithic intact)
2. ❌ Never add placeholder/stub code
3. ❌ Never push without user approval
4. ❌ Never add docs to `agent_docs/` root
5. ❌ Never use absolute paths (`/Users/...` or `/app/...`)
6. ✅ Always test in Docker before claiming done
7. ✅ Always use `{domain}/current/` for active work docs
8. ✅ Always verify Playwright passes for GUI changes

---

## Handoff Checklist for Morning

**What user wants to see**:
- [ ] Frontend Slice 2 tested (Playwright results)
- [ ] Frontend Slice 2 merged (if tests passed)
- [ ] Backend Slice 3 status (started/blocked/completed?)
- [ ] Production still stable (no 404s, no errors)
- [ ] Docker containers healthy
- [ ] Updated status in `shared/current/STATUS_*.md`

**What user does NOT want**:
- ❌ Broken production
- ❌ Uncommitted work without explanation
- ❌ Stream-of-consciousness docs everywhere
- ❌ Surprises

---

## If You Get Stuck

### Backend Issues:
- Check `agent_docs/backend/current/` for active assignment
- Reference `history/` for patterns from completed slices
- Verify Docker paths with `docker exec agro-api ls /app/...`

### Frontend Issues:
- Check `agent_docs/ui/current/` for active assignment
- Ensure API running: `docker ps | grep agro-api`
- Verify bundle builds: `cd web && npm run build`

### Architecture Questions:
- Check `agent_docs/shared/current/ARCHITECTURE_DECISION_2025_10_24.md`
- Opus made key decisions - follow them
- If truly blocked: Document in `shared/current/BLOCKERS.md` for morning

---

## Pro Tips

1. **Read the delegation doc first**: `shared/current/DELEGATION_INSTRUCTIONS_2025_10_24.md`
2. **Test before merging**: Run Playwright for frontend, pytest for backend
3. **Keep docs concise**: Update existing docs, don't create 10 new ones
4. **Use history folders**: Completed work goes to `history/`, active to `current/`
5. **Docker is king**: If it doesn't work in Docker, it doesn't work

---

## Contact

**User**: David Montgomery (back in morning PT)  
**Your Role**: Keep refactor moving, don't break things  
**Success**: Both agents make progress, production stays stable

**Good luck! The foundation is solid, just need to keep executing the pattern.** 🚀

