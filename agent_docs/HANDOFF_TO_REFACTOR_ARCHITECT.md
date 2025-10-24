# Handoff to Refactor Architect (Opus Agent)

**Role**: Lead Architect & Integration Coordinator for dual backend + frontend refactor  
**User**: David Montgomery (POC - Product Owner & Final Approver)  
**Date**: October 24, 2025  
**Status**: Mid-flight - ~15% complete, recent merge incident reverted, agents awaiting direction

---

## Executive Summary

You're coordinating a **simultaneous backend modularization + frontend modernization** for a production RAG system with **9 Docker containers** serving a complex GUI with 20+ features. Two specialist agents (backend, frontend) have made strong progress but need architectural coordination to merge safely without breaking production.

**Critical Context**:
- This is a **strangler pattern refactor** - old and new must coexist until proven
- System is **PRODUCTION** - serves real users, cannot break
- **Docker-first deployment** - all code must work in containers
- **Accessibility requirements** - GUI must expose ALL settings (ADA compliance)
- **No placeholders/stubs allowed** - everything must be fully wired

---

## What Happened So Far

### ✅ Strong Progress (Both Agents)

**Backend Agent** (worktree: `feature/backend-modularization`):
- Extracted **9 routers**: config, pipeline, repos, traces, editor, search, keywords, indexing
- Created **5 services**: config_store, traces, editor, rag, keywords  
- Built **app factory** (`server/asgi.py`) with request ID middleware + JSON error handling
- Added **comprehensive tests** (all passing in worktree)
- **All code is Docker-compatible** (uses `common.paths.repo_root()` → `/app` in containers)

**Frontend Agent** (worktree: `feature/ui-migration`):
- Scaffolded **complete Vite/React/TypeScript/Tailwind** app in `web/`
- Built **Dashboard component** that fetches `/api/pipeline/summary` (live data)
- Wired **Tailwind to existing CSS tokens** (design continuity)
- **Built production bundle** (`web/dist/` ready)
- Added **Playwright test** scaffold
- **All paths relative** - no hardcoded `/Users/...`

### ❌ Recent Incident (My Fault - Claude Sonnet)

**What I did wrong**:
1. Merged backend worktree which had **replaced** monolithic `server/app.py` (4165 lines → 4-line shim)
2. This **broke all production endpoints** (404s everywhere)
3. **Violated strangler pattern** - new code should be ADDITIVE, not destructive

**Recovery**:
- ✅ Reverted with `git reset --hard HEAD~2`
- ✅ Restored working monolithic `app.py`
- ✅ Docker restarted, all endpoints functional
- ✅ Fixed `docker-compose.services.yml` to add `/web` bind mount

**Current State**:
- `development` branch: Stable at commit `ed34bb9` (includes Docker web mount fix + doc updates)
- Both worktrees: Have committed changes (fb41272 backend, 72b7721 frontend)
- **NOT merged** - awaiting your architectural decision on correct integration approach

---

## Key Architecture Documents (Read These First)

### Must-Read (Priorities):

1. **`agent_docs/shared/MERGE_STRATEGY_CORRECTED.md`**  
   - What went wrong + corrected strangler pattern approach
   - Additive vs destructive refactoring

2. **`agent_docs/backend/backend_modularization_plan.md`**  
   - Backend decomposition strategy
   - Router/service extraction plan
   - SettingsRegistry as single source of truth

3. **`agent_docs/ui_migration_to_vite_react_ts_tailwind.md`**  
   - UI modernization plan
   - React/TypeScript/Tailwind architecture
   - Schema-driven forms from backend

4. **`agent_docs/feature_inventory_and_mapping.md`**  
   - All 20+ features mapped (current → target)
   - Backend routes + frontend files inventory

5. **`agent_docs/shared/CRITICAL_DOCKER_WEB_MOUNT_FIX.md`**  
   - Docker integration requirements
   - Why bind mounts matter

6. **`agent_docs/shared/WORKTREE_STATUS_REPORT.md`**  
   - Current state of both worktrees
   - What each agent accomplished

### Reference (As Needed):

- `agent_docs/ux_ia_and_navigation.md` - UI navigation architecture
- `agent_docs/cloud_ready_architecture.md` - Forward-looking cloud strategy
- `agent_docs/shared/logging_and_error_handling.md` - Standards enforced
- `agent_docs/runbooks/backend_decomposition_runbook.md` - Step-by-step execution
- `agent_docs/runbooks/ui_migration_runbook.md` - UI migration steps

---

## System Architecture Overview

### Current Production Stack:

**9 Docker Containers**:
1. `agro-api` - FastAPI backend (main app)
2. `qdrant` - Vector database
3. `rag-redis` - Cache + checkpointing
4. `agro-openvscode` - Embedded code editor
5. `agro-grafana` - Metrics dashboards
6. `agro-prometheus` - Metrics collection
7. `agro-loki` - Log aggregation
8. `agro-promtail` - Log shipping
9. `agro-alertmanager` - Alert routing

**Bind Mounts** (docker-compose.services.yml):
```yaml
volumes:
  - ./server:/app/server    # Backend code (hot-reload)
  - ./gui:/app/gui          # Legacy UI
  - ./web:/app/web          # NEW React UI (just added)
  - ./data:/app/data        # Datasets, evals, keywords
  - ./out:/app/out          # Runtime output (traces, indexes)
  - ./repos.json:/app/repos.json
```

**Key Point**: Code changes on host immediately reflect in container via bind mounts, but uvicorn needs restart to reload Python.

### Current Codebase:

**Backend** (Python/FastAPI):
- `server/app.py` - 4165-line monolithic app (PRODUCTION)
- `server/asgi.py` - NEW app factory (in worktree, not merged)
- `server/routers/*` - NEW extracted routers (in worktree)
- `server/services/*` - NEW business logic (in worktree)

**Frontend** (currently):
- `gui/` - Legacy multi-file HTML/JS (~74 files)
- `web/` - NEW Vite/React/TS app (in worktree, not merged)

**Key Dependencies**:
- LangGraph for RAG pipeline
- Qdrant for vector search
- Redis for LangGraph checkpointing
- Prometheus + Grafana for observability

---

## Division of Responsibilities

### Backend Agent
**Focus**: Python/FastAPI backend modularization  
**Worktree**: `.worktrees/feature-backend-modularization`  
**Scope**:
- Extract endpoints from monolithic `app.py` into `routers/*`
- Create `services/*` for business logic
- Maintain Docker compatibility
- Add tests for all extracted code
- **DO NOT touch frontend** (`web/`, `gui/` except mounting logic)

### Frontend Agent (Lead/Front)
**Focus**: React/TypeScript UI modernization  
**Worktree**: `.worktrees/feature-ui-migration`  
**Scope**:
- Build Vite/React/TS/Tailwind app in `web/`
- Create schema-driven forms from `/api/config-schema`
- Wire all features to existing/new backend APIs
- Add Playwright tests
- **DO NOT touch backend routers/services** (only consume APIs)

### Your Role (Refactor Architect)
**Focus**: Coordination, integration, architectural decisions  
**Scope**:
- **Merge strategy** - ensure strangler pattern executed correctly
- **Docker integration** - verify containerization works
- **API contracts** - ensure frontend/backend stay in sync
- **Testing strategy** - define smoke vs full test gates
- **Cutover planning** - when/how to switch from old → new
- **Resolve conflicts** between backend/frontend work
- **Make architectural calls** when agents hit ambiguity

---

## Critical Architectural Question (Needs Your Decision)

### The Core Issue: How Should Old + New Code Coexist?

**Background**: Backend agent extracted routers/services and shimmed `app.py` to use them. This works but is an IMMEDIATE switch (no parallel testing).

**Options**:

### Option A: Separate Entrypoints (Safest - Recommended)

**Keep TWO apps running in parallel**:

**Current Production**:
```python
# server/app.py (4165 lines - monolithic, UNCHANGED)
app = FastAPI(...)
@app.get("/search")
def search(...):
    # all the existing code
```

**New Modular** (parallel, testable):
```python
# server/asgi.py (NEW)
def create_app():
    app = FastAPI(...)
    app.include_router(search_router)  # uses server/routers/search.py
    return app

app = create_app()  # Expose for testing
```

**Docker runs**: `uvicorn server.app:app` (monolithic)  
**Tests can verify**: `from server.asgi import app` (modular)

**Cutover later**: Change Dockerfile CMD to `server.asgi:app`

**Pros**:
- Zero risk to production
- Can test new code extensively
- Easy rollback (just don't change Dockerfile)
- Both agents can continue working independently

**Cons**:
- Temporary code duplication
- Need to maintain both until cutover

---

### Option B: Environment Switch (Medium Risk)

**Modify server/app.py** to optionally use new code:

```python
# server/app.py (at end of file)
import os

# Normal monolithic app definition (4165 lines)
app = FastAPI(...)
# ... all existing routes ...

# Optional: use modular version
if os.getenv("USE_MODULAR_APP") == "1":
    from server.asgi import create_app
    app = create_app()  # Replace with modular
```

**Pros**:
- One file to maintain
- Can toggle via env var
- Gradual rollout possible

**Cons**:
- More complex logic in app.py
- Risk of env var misconfiguration
- Harder to test both paths

---

### Option C: Immediate Cutover (Highest Risk - NOT Recommended)

**Replace app.py with shim immediately** (what I accidentally did):

```python
# server/app.py
from server.asgi import create_app
app = create_app()
```

**Pros**:
- Clean, simple
- Forces all testing on new code

**Cons**:
- **Breaks production** if new code has bugs
- No fallback without git revert
- High risk for complex migration

---

## Recommended Merge Approach (Option A)

### Step 1: Fix Backend Worktree Commit

```bash
cd .worktrees/feature-backend-modularization

# Soft reset to unstage
git reset --soft HEAD~1

# Restore monolithic app.py from base
git checkout 8edf134 -- server/app.py

# Recommit WITHOUT app.py changes
git add server/asgi.py server/routers/ server/services/ tests/
git commit -m "feat: Add modular routers/services (parallel to monolithic)

ADDITIVE REFACTOR - does not replace existing code

Added:
- server/asgi.py: App factory with request ID middleware
- server/routers/*: 9 extracted routers
- server/services/*: 5 service modules  
- tests/routers/*: Direct-import tests for new code

Unchanged:
- server/app.py: Monolithic app remains active (production)

Docker-compatible: all paths use common.paths helpers
Both old and new code coexist for parallel testing
"
```

### Step 2: Merge Backend to Development

```bash
cd /Users/davidmontgomery/agro-rag-engine
git checkout development
git merge --no-ff feature/backend-modularization
# Should be clean - only adds NEW files
```

### Step 3: Merge Frontend to Development

```bash
git merge --no-ff feature/ui-migration
# May have minor conflict in package.json - take both changes
```

### Step 4: Build UI in Development

```bash
cd web
npm install
npm run build
```

### Step 5: Test Integration

**Old paths still work**:
```bash
curl http://localhost:8012/health
curl http://localhost:8012/api/config
curl http://localhost:8012/gui
```

**New UI works**:
```bash
curl http://localhost:8012/web
# Browser: Should show React Dashboard
```

**New routers accessible via Python**:
```bash
python3 -c "
from server.asgi import create_app
from fastapi.testclient import TestClient
app = create_app()
client = TestClient(app)
print(client.get('/api/pipeline/summary').json())
"
```

### Step 6: Docker Integration Test

```bash
docker compose -f docker-compose.services.yml restart api
sleep 5

# Verify old app works
curl http://localhost:8012/health

# Verify new UI mount works
curl http://localhost:8012/web

# Verify Docker sees new code
docker exec agro-api ls /app/server/routers
docker exec agro-api ls /app/web/dist
```

---

## Critical Constraints & Rules

### From User's Project Rules:

**1. Docker-First Deployment**
- All code must work in Docker containers
- Paths: Use `common.paths.repo_root()` → `/app` in containers
- Never hardcode `/Users/davidmontgomery/...` paths
- Verify `docker-compose.services.yml` bind mounts for new directories

**2. No Stubs/Placeholders (ADA Compliance)**
- Every GUI element must be fully wired to backend
- Every backend endpoint must have real implementation
- No `TODO` comments or placeholder functions
- Violations are contractual/legal issues (seriously)

**3. Testing Mandatory**
- Playwright for GUI changes
- Smoke tests for backend (in `/tests`, not root)
- Cannot claim "done" without proof it works

**4. No Commits Without Approval**
- Never push/commit without user's explicit approval
- User is the POC - they approve all merges

**5. Branch Workflow**
- `development` → `staging` → `main`
- Never push directly to `main`
- Work in feature branches/worktrees

**6. Agent Documentation**
- DO NOT dump docs in `agent_docs/` root (145+ files already!)
- Use subdirectories: `/backend/`, `/ui/`, `/shared/`, `/runbooks/`
- Make concise updates AFTER assessing, not stream-of-consciousness

---

## Current System State

### Git Branches:
```
development (HEAD: ed34bb9)
├── feature/backend-modularization (commit: fb41272) [READY - needs fix]
└── feature/ui-migration (commit: 72b7721) [READY]
```

### Worktrees:
- `.worktrees/feature-backend-modularization/` - Backend extraction work
- `.worktrees/feature-ui-migration/` - UI React scaffold work

### Docker:
- ✅ All 9 containers running
- ✅ API container has bind mounts including `/web` (just added)
- ✅ API currently runs monolithic `server/app:app`
- ⏳ New routers/services exist in worktree but not merged yet

### Production Endpoints (Currently Working):
- `/health`, `/api/config`, `/search`, `/answer`, `/api/chat`
- `/api/repos/*`, `/api/traces/*`, `/api/keywords/*`
- `/api/cost/*`, `/api/profiles/*`, `/api/index/*`
- `/api/cards/*` (Semantic Boosts)
- `/api/reranker/*`, `/api/editor/*`, `/api/docker/*`
- **All returning 200** via monolithic app.py

---

## Technical Architecture

### Backend Refactor Target:

**From**: Monolithic `server/app.py` (4165 lines, all endpoints inline)

**To**: Modular FastAPI with layers:
```
server/
  asgi.py         # App factory (create_app())
  app.py          # EITHER: monolithic (current) OR shim (after cutover)
  core/
    settings.py   # SettingsRegistry (planned)
  routers/
    *.py          # Thin controllers (9 extracted so far)
  services/
    *.py          # Business logic (5 created so far)
```

**Key APIs for UI**:
- `GET /api/pipeline/summary` - Dashboard card data
- `GET /api/config-schema` - Schema-driven forms

### Frontend Refactor Target:

**From**: Monolithic `gui/index.html` + 57 JS files (jQuery-style)

**To**: Modern SPA:
```
web/
  src/
    pages/        # Route components
    components/   # Shared UI components
    features/     # Feature modules
    styles/       # Tailwind + design tokens
  dist/           # Production build
```

**Strategy**: Strangler pattern
- New UI at `/web`
- Legacy UI at `/gui`  
- Cutover via `GUI_CUTOVER=1` env flag (redirects `/` → `/web`)

---

## Immediate Tasks for You

### 1. Assess the Backend Worktree Commit

**Location**: `.worktrees/feature-backend-modularization/`  
**Commit**: `fb41272`

**Check**:
```bash
cd .worktrees/feature-backend-modularization
git show fb41272 --stat
git show fb41272:server/app.py | wc -l  # Should this be 4 or 4165?
```

**Question**: Did backend agent commit a shim (4 lines) or keep monolithic (4165)?

**If shim**: Need to amend commit to restore monolithic app.py  
**If monolithic**: Ready to merge as-is

### 2. Review Docker Integration

**Verify**:
- [ ] All routers/services use `common.paths.repo_root()` (not absolute paths)
- [ ] docker-compose.services.yml has `- ./web:/app/web` mount
- [ ] No hardcoded `/Users/...` or `/app/...` paths in code
- [ ] Tests will run in Docker (or have Docker-aware variants)

**Check**:
```bash
grep -r "/Users/" .worktrees/feature-backend-modularization/server/routers/ || echo "✅ No absolute paths"
grep -r "/Users/" .worktrees/feature-ui-migration/web/src/ || echo "✅ No absolute paths"
```

### 3. Define Merge Strategy

**Decide**:
- **Option A**: Parallel entrypoints (monolithic + modular coexist)
- **Option B**: Environment switch in app.py
- **Option C**: Immediate cutover (risky)

**My recommendation**: **Option A** - safest for production system

### 4. Plan Testing Approach

**Questions to answer**:
- How to test new routers in Docker before cutover?
- Should we add `api-beta` service in docker-compose for parallel testing?
- What's the smoke test contract for each merge?

---

## Merge Conflicts to Expect

### `server/app.py`
**Both worktrees modified it**:
- Backend: May have shimmed it
- UI: Added `/web` mount logic

**Resolution**: Keep monolithic + add `/web` mount if not already there

### `package.json` / `package-lock.json`
**Both worktrees may have changed root package files**

**Resolution**: Accept both changesets (typically auto-mergeable)

---

## Success Criteria for First Merge

**After merge to development**:

### Must Work:
- ✅ All existing endpoints still functional (old code)
- ✅ `/gui` still serves legacy UI
- ✅ `/web` serves new React Dashboard
- ✅ Docker containers all running
- ✅ New routers importable via `server.asgi`
- ✅ Dashboard shows live data from `/api/pipeline/summary`

### Tests:
- ✅ Backend: `pytest tests/test_*.py`
- ✅ UI mount: `curl http://localhost:8012/web`
- ✅ Docker: Container restart picks up changes

---

## Your First Actions (Suggested Sequence)

1. **Assess current state** (15 min)
   - Read the 6 must-read docs above
   - Check what's in both worktree commits
   - Verify Docker integration assumptions

2. **Make architectural decision** (5 min)
   - Choose merge strategy (A, B, or C)
   - Document decision briefly in `agent_docs/shared/ARCHITECTURE_DECISION.md`

3. **Execute merge** (30 min)
   - Fix backend worktree if needed
   - Merge both to development
   - Handle conflicts
   - Test integration

4. **Verify Docker** (10 min)
   - Restart containers
   - Test old and new code paths
   - Document any issues

5. **Update agent instructions** (10 min)
   - Concise updates in `agent_docs/backend/` and `agent_docs/ui/`
   - What to do next (Slice 2, 3, etc.)

---

## Communication Protocol

**With User (David)**:
- You're the POC - final decision maker
- Ask for approval before commits/pushes
- Report blockers immediately
- Keep updates concise (he's busy with iOS app)

**With Backend Agent**:
- Give clear, specific instructions
- Focus on Docker integration + path handling
- Small, testable increments
- Documents in `agent_docs/backend/`

**With Frontend Agent**:
- Coordinate API contract changes
- Ensure Docker `/web` mount works
- Playwright test requirements
- Documents in `agent_docs/ui/`

---

## Red Flags to Watch For

**Code Issues**:
- ❌ Absolute paths (`/Users/...` or `/app/...` hardcoded)
- ❌ Stubs or TODO comments
- ❌ Endpoints that don't actually work
- ❌ GUI elements not wired to backend

**Process Issues**:
- ❌ Merges without testing
- ❌ Commits without approval
- ❌ Direct pushes to `main`
- ❌ Pushing to staging without PR

**Docker Issues**:
- ❌ Code works locally but breaks in container
- ❌ Missing bind mounts for new directories
- ❌ Hardcoded container names instead of service discovery

---

## Quick Reference

### Key Directories:
```
/server/               Backend code
/web/                  NEW React UI
/gui/                  Legacy UI
/tests/                All tests (Playwright + pytest)
/.worktrees/           Feature branch worktrees
/agent_docs/           Documentation (use subdirs!)
/docker-compose.services.yml  Container orchestration
```

### Key Commands:
```bash
# Check current branch/worktree
pwd && git rev-parse --abbrev-ref HEAD

# Restart Docker after code changes
docker compose -f docker-compose.services.yml restart api

# Run backend tests
PYTHONPATH=. pytest tests/

# Test new modular code
python3 -c "from server.asgi import create_app; ..."

# Check Docker mounts
docker exec agro-api ls -la /app/
```

### Current Working State:
- Branch: `development` at `ed34bb9`
- Docker: All 9 containers running
- App: Monolithic `server/app.py` (working)
- Endpoints: All returning 200

---

## Your Mandate

**Coordinate this refactor to successful completion**:
1. Ensure strangler pattern executed correctly (old + new coexist)
2. Maintain Docker compatibility throughout
3. Keep production stable during migration
4. Guide both agents with clear architecture decisions
5. Verify all work before approving merges
6. Document key decisions concisely (not stream-of-consciousness)

**You have authority to**:
- Make architectural decisions
- Approve/reject merge strategies  
- Request changes from agents
- Define testing requirements

**You report to**: David (user) for final approval on commits/pushes

---

## Immediate Question for You

**What's your architectural decision on the merge strategy?**

- **Option A**: Keep both apps (monolithic + modular) in parallel?
- **Option B**: Add environment switch to app.py?
- **Option C**: Something else?

**After you decide**, I'll execute the merge with your chosen strategy and coordinate the agents going forward.

---

## Files Awaiting Your Review

**Critical**:
- `agent_docs/shared/MERGE_STRATEGY_CORRECTED.md`
- `agent_docs/shared/CRITICAL_DOCKER_WEB_MOUNT_FIX.md`
- `agent_docs/backend/UPDATED_INSTRUCTIONS_POST_INCIDENT.md`

**Reference**:
- Backend plan, UI plan, feature inventory (listed in Must-Read section above)

**Don't waste time on**: The 145+ other docs in agent_docs root (legacy cruft from past sessions)

---

**Welcome aboard! Looking forward to your architectural guidance.** 🏗️

