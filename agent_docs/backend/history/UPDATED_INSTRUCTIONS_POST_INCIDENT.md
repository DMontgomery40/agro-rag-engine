# Backend Agent: UPDATED Instructions (Post-Merge Incident)

**Context**: Attempted merge broke production. Reverted. Here's the corrected approach.

---

## What You Built Was CORRECT ✅

Your router/service extraction is solid:
- ✅ `server/asgi.py` app factory
- ✅ 9 routers extracted with services
- ✅ All tests green
- ✅ Docker-compatible paths (uses `common.paths.repo_root()`)

**The only issue**: `server/app.py` was reduced to a shim too early.

---

## Docker Integration Status ✅

**Your code IS Docker-compatible**:
- ✅ Uses `repo_root()`, `gui_dir()`, etc. (resolves to `/app` in container)
- ✅ No hardcoded `/Users/...` paths
- ✅ All file I/O uses relative paths or env vars

**Docker bind mounts** (in docker-compose.services.yml):
```yaml
volumes:
  - ./server:/app/server    # ✅ Your routers/services are here
  - ./web:/app/web          # ✅ UI agent's React app
  - ./gui:/app/gui          # ✅ Legacy GUI
  - ./data:/app/data        # ✅ Data directory
  - ./out:/app/out          # ✅ Output directory
```

**When merged**: Docker will see both:
- `/app/server/app.py` - monolithic (current)
- `/app/server/asgi.py` - modular (your new code)
- `/app/server/routers/` - your routers
- `/app/server/services/` - your services

---

## What Needs to Change in Your Worktree

**BEFORE re-merging**, amend your commit to keep monolithic `app.py`:

```bash
cd .worktrees/feature-backend-modularization

# Reset commit but keep changes staged
git reset --soft HEAD~1

# Restore monolithic app.py from base commit
git checkout 8edf134 -- server/app.py

# Verify app.py is back to ~4165 lines
wc -l server/app.py  # Should show ~4165

# Re-commit (routers/services/asgi added, app.py UNCHANGED)
git add server/asgi.py server/routers/ server/services/ tests/
git commit -m "feat: Add modular routers/services (parallel to monolithic app)

- NEW: server/asgi.py app factory with request ID middleware
- NEW: server/routers/* (9 routers: config, pipeline, repos, traces, editor, search, keywords, indexing)
- NEW: server/services/* (5 services: config_store, traces, editor, rag, keywords)
- KEEP: server/app.py UNCHANGED (monolithic version remains active)
- Tests verify both old (server.app) and new (server.asgi) code paths

Docker-compatible: all paths use common.paths helpers
Additive refactor - both versions coexist for safe parallel testing
Slice 1 + Slice 2 backend complete
"
```

---

## Cutover Strategy (Later, Separate PR)

**After new code is proven**, in a SEPARATE commit:

**Option 1**: Replace app.py with shim
```bash
# Backup monolithic version
mv server/app.py server/app_monolithic.py

# Create shim
echo 'from server.asgi import create_app\napp = create_app()' > server/app.py

# Commit
git commit -m "feat: Switch to modular app factory

Replaces monolithic server/app.py with shim to server.asgi
Monolithic version preserved as server/app_monolithic.py for rollback
"
```

**Option 2**: Dockerfile switch
```dockerfile
# Change CMD from:
CMD ["uvicorn", "server.app:app", ...]

# To:
CMD ["uvicorn", "server.asgi:app", ...]
```

---

## Tests to Add

**Verify both versions work**:

```python
# tests/test_dual_app_parity.py

from fastapi.testclient import TestClient

def test_monolithic_app_works():
    from server.app import app as monolithic_app
    client = TestClient(monolithic_app)
    r = client.get('/api/config')
    assert r.status_code == 200

def test_modular_app_works():
    from server.asgi import create_app
    modular_app = create_app()
    client = TestClient(modular_app)
    r = client.get('/api/pipeline/summary')
    assert r.status_code == 200
    r2 = client.get('/api/config-schema')
    assert r2.status_code == 200
```

---

## Docker Testing After Merge

**Verify routers/services work in container**:

```bash
# After merge to development
docker compose -f docker-compose.services.yml restart api
sleep 5

# Test old endpoints still work
curl http://localhost:8012/health
curl http://localhost:8012/api/config

# Test new routers via Python in container
docker exec agro-api python3 -c "
from server.asgi import create_app
from fastapi.testclient import TestClient
app = create_app()
client = TestClient(app)
r = client.get('/api/pipeline/summary')
print('Status:', r.status_code)
print('Data:', r.json())
"
```

---

## Summary

**Your backend extraction is PERFECT**. The only fix needed:
1. Amend commit to restore monolithic `app.py`
2. Re-merge to development (now additive)
3. Both old and new code coexist
4. Cutover later in separate PR

**Docker integration**: Already correct - all paths are Docker-compatible.

**Time to fix**: 15 minutes

Ready to proceed with the fix?

