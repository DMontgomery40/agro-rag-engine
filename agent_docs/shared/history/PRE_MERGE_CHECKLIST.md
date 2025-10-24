# Pre-Merge Checklist for Worktrees

**CRITICAL**: Complete ALL items before merging to development

---

## ✅ Fixed Issues

### Docker Web Mount
- ✅ Added `- ./web:/app/web` to `docker-compose.services.yml`
- ✅ Container recreated with new mount
- ⏳ Directory will populate after UI worktree merges

---

## 📋 Merge Sequence (IMPORTANT - Order Matters!)

### Step 1: Commit Backend Worktree
```bash
cd /Users/davidmontgomery/agro-rag-engine/.worktrees/feature-backend-modularization

git add server/asgi.py server/routers/ server/services/ tests/
git commit -m "feat: Extract routers and services with app factory

- Add server/asgi.py app factory with request ID middleware  
- Extract routers: config, pipeline, repos, traces, editor, search, keywords, indexing
- Extract services: config_store, traces, editor, rag, keywords
- Add direct-import tests for all routers
- Implement logging standard with X-Request-ID on all responses
- JSON error handling for 500s

Backend uses common.paths helpers (Docker-compatible)
Slice 1 (config/pipeline) + Slice 2 (search/RAG) complete
"
```

### Step 2: Commit UI Worktree
```bash
cd /Users/davidmontgomery/agro-rag-engine/.worktrees/feature-ui-migration

git add web/ tests/dashboard.spec.ts tests/test_web_mount_direct.py server/app.py package*.json
git commit -m "feat: Add React Dashboard with Vite/TS/Tailwind

- Scaffold complete Vite/React/TypeScript/Tailwind app in web/
- Add Dashboard component fetching /api/pipeline/summary
- Wire Tailwind to existing CSS tokens
- Build app to dist/ (ready for production)
- Add Playwright smoke test for Dashboard
- Mount /web in server/app.py with GUI_CUTOVER support

Slice 1 UI complete
"
```

### Step 3: Commit Docker Fix (development branch)
```bash
cd /Users/davidmontgomery/agro-rag-engine

git add docker-compose.services.yml
git commit -m "fix: Add web directory mount for Docker containers

Required for new React UI to work in containerized deployments
"
```

### Step 4: Merge Backend → Development
```bash
cd /Users/davidmontgomery/agro-rag-engine
git checkout development
git merge --no-ff feature/backend-modularization
# Resolve conflicts if any
```

### Step 5: Merge UI → Development  
```bash
git merge --no-ff feature/ui-migration
# Resolve conflicts if any (likely in server/app.py)
```

###Step 6: Test Integration on Development
```bash
# Restart Docker with merged code
docker compose -f docker-compose.services.yml down
docker compose -f docker-compose.services.yml up -d --force-recreate api

# Wait for startup
sleep 5

# Test endpoints
curl http://localhost:8012/health
curl http://localhost:8012/api/pipeline/summary
curl -I http://localhost:8012/web  # Should return 200

# Check web directory in Docker
docker exec agro-api ls -la /app/web/dist
```

---

## 🔍 Integration Test Checklist

After merge to development:

### Backend Tests
- [ ] `PYTHONPATH=. pytest tests/test_pipeline_summary_direct.py`
- [ ] `PYTHONPATH=. pytest tests/test_config_schema_direct.py`
- [ ] `PYTHONPATH=. pytest tests/routers/test_*_direct.py`
- [ ] Request IDs present: `curl -I http://localhost:8012/health | grep X-Request-ID`

### UI Tests
- [ ] `/web` route loads: `curl -I http://localhost:8012/web`
- [ ] Dashboard renders: Open browser to `http://localhost:8012/web`
- [ ] API integration: Dashboard shows live pipeline data
- [ ] GUI_CUTOVER: `export GUI_CUTOVER=1` redirects `/` → `/web`

### Docker Tests
- [ ] `/app/web/dist` exists in container
- [ ] `/api/pipeline/summary` returns 200
- [ ] `/api/config-schema` returns 200  
- [ ] Static files serve from `/web`
- [ ] All 9 containers still running

---

## 🚨 Known Merge Conflicts

### `server/app.py`
**Conflict**: Both worktrees modified this file
- Backend: Shimmed to use `asgi.py`
- UI: Added `/web` mount logic

**Resolution Strategy**:
1. Backend version creates `app = create_app()`
2. UI version has inline mount logic
3. **Keep**: Backend shim + move UI mount logic into `asgi.py`

**After merge**, `server/app.py` should be:
```python
from server.asgi import create_app
app = create_app()
```

And `server/asgi.py` should have the `/web` mount (already does in backend worktree).

---

## 📝 Post-Merge Updates

### Documentation
- [ ] Update `agent_docs/shared/PROGRESS_UI_BACKEND_MIGRATION.md` with merge completion
- [ ] Add deployment notes about Docker web mount requirement
- [ ] Update README if UI instructions changed

### Cleanup
- [ ] Remove duplicate code from conflicts
- [ ] Run linters: `ruff check server/` (if applicable)
- [ ] Check for leftover debug code

---

## 🎯 Success Criteria

Merge is complete when:
- ✅ Both worktree branches merged to development
- ✅ Docker container serves `/web` successfully
- ✅ Dashboard displays live pipeline summary  
- ✅ Backend routers/services all functional
- ✅ All tests green
- ✅ No absolute paths in code
- ✅ Request IDs on all responses
- ✅ 9 Docker containers still running

---

## 📋 Next Steps (After Merge)

1. PR development → staging
2. Full regression test suite on staging
3. Performance testing (if needed)
4. PR staging → main (after approval)

---

## ⚠️ Rollback Plan

If integration fails after merge:
```bash
git checkout development
git reset --hard HEAD~2  # Undo both merges
git push -f origin development  # ONLY if not pushed to remote yet
```

If already pushed to remote:
```bash
git revert <merge-commit-1> <merge-commit-2>
git push origin development
```

---

**CRITICAL**: Docker web mount is now fixed. Safe to proceed with merge sequence.

