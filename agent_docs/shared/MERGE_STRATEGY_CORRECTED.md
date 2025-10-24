# CORRECTED Merge Strategy - Additive, Not Destructive

**CRITICAL LESSON LEARNED**: The refactor is ADDITIVE - old and new code must coexist until cutover!

---

## What Went Wrong (Just Now)

**Mistake**: I merged the backend worktree which had `server/app.py` reduced to a 4-line shim
**Impact**: Broke the running monolithic app.py (4165 lines → 4 lines)
**Result**: All existing endpoints returned 404

**Reverted**: `git reset --hard HEAD~2` to restore working state

---

## The CORRECT Strategy (Strangler Pattern)

### Phase 1: Add New Code Alongside Old (CURRENT)

**Backend**:
- ✅ Create `server/asgi.py` (app factory)
- ✅ Create `server/routers/*` (extracted endpoints)
- ✅ Create `server/services/*` (business logic)
- ❌ **DO NOT** replace `server/app.py` yet
- ✅ **ADD** tests that import from BOTH old and new

**Result**: Two versions coexist:
- `server.app:app` - monolithic (4165 lines) **[CURRENT PRODUCTION]**
- `server.asgi:create_app()` - modular (routers/services) **[NEW, PARALLEL]**

### Phase 2: Test New Code in Parallel

**Dockerfile changes**:
```dockerfile
# Add build arg to choose which app to run
ARG APP_MODULE=server.app:app

# CMD uses the arg
CMD ["sh", "-c", "uvicorn ${APP_MODULE} --host 0.0.0.0 --port 8012..."]
```

**OR** simpler: Add a separate service in docker-compose:
```yaml
services:
  api:  # OLD monolithic (production)
    command: uvicorn server.app:app ...
    
  api-modular:  # NEW modular (testing)
    command: uvicorn server.asgi:app ...
    ports:
      - "8013:8012"  # Different port
    profiles: ["modular"]
```

### Phase 3: Cutover When Ready

**After** new code is proven in production:
1. Change Dockerfile CMD to use `server.asgi:app`
2. OR replace `server.app.py` with shim
3. Keep monolithic version as `server/app_legacy.py` for one release

---

## What Should Have Happened

### Correct Merge Sequence:

**Step 1**: Merge backend (ADDITIVE)
```bash
cd .worktrees/feature-backend-modularization

# Commit NEW files only (don't change app.py)
git add server/asgi.py server/routers/ server/services/ tests/
git commit -m "feat: Add modular routers/services alongside monolithic app

- NEW: server/asgi.py app factory
- NEW: server/routers/* (9 routers)
- NEW: server/services/* (5 services)
- UNCHANGED: server/app.py (keep monolithic for now)
- Tests for both old and new code paths

Additive refactor - both versions coexist
"
```

**Step 2**: Merge UI (ADDITIVE)
```bash
cd .worktrees/feature-ui-migration

git add web/ tests/ server/app.py
# NOTE: server/app.py changes in UI worktree are just /web mount additions
git commit -m "feat: Add React Dashboard (parallel to legacy GUI)

- NEW: web/ directory with React app
- Mount /web in server/app.py (additive)
- Both /gui and /web coexist
"
```

**Step 3**: Test both versions
```bash
# Test old monolithic
curl http://localhost:8012/api/config  # Should work

# Test new modular (via TestClient)
python3 -c "from server.asgi import create_app; ..."  # Should work

# UI
curl http://localhost:8012/gui  # Legacy (works)
curl http://localhost:8012/web  # New (works)
```

**Step 4**: Optional cutover
- Change Dockerfile to use asgi OR
- Replace app.py with shim in a separate commit

---

## Current State (After My Mistake)

**Development branch**: Reset to before merges
**Worktrees**: Still have commits (fb41272, 72b7721)
**Docker**: Running old monolithic app (working)
**Web mount**: Added to docker-compose.services.yml ✅

---

## Recovery Plan

### Option A: Re-merge Correctly (Keep Monolithic app.py)

**Backend worktree - modify commit**:
```bash
cd .worktrees/feature-backend-modularization

# Revert app.py to monolithic
git show 8edf134:server/app.py > server/app.py

# Amend commit
git add server/app.py
git commit --amend --no-edit

# Force update branch
git push -f  # if pushed, otherwise just local
```

**Then merge again** to development (this time app.py stays monolithic)

### Option B: Keep Both Apps via Environment Switch

**Add to server/app.py** (at the END):
```python
# ... existing 4165 lines ...

# Optional: Allow switching to modular version via env
if os.getenv("USE_MODULAR_APP") == "1":
    from server.asgi import create_app as _create_modular_app
    app = _create_modular_app()
```

Merge as-is, test with `USE_MODULAR_APP=1`

### Option C: Separate Docker Service (Safest)

**Don't merge yet**. Instead:

Add to `docker-compose.services.yml`:
```yaml
services:
  api:  # Current monolithic (UNCHANGED)
    # ... existing config ...
  
  api-beta:  # New modular version
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agro-api-beta
    command: python -m uvicorn server.asgi:app --host 0.0.0.0 --port 8012
    ports:
      - "8013:8012"
    volumes:
      # Same mounts as api
    profiles: ["beta"]
```

Test with: `docker compose --profile beta up api-beta`

---

## Recommended Path Forward

**Option A** (cleanest): Fix the backend worktree commit to keep monolithic app.py, then re-merge.

**Time to fix**: 15 minutes

**Your call** - which option do you prefer?

---

I apologize for breaking the running app. The backend agent's strategy was correct (additive), but I misunderstood and made it destructive during merge. The app is restored now.
