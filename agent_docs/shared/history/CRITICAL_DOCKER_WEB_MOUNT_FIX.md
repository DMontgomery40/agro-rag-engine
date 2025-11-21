# CRITICAL: Docker Web Mount Missing

**STATUS**: 🚨 **BLOCKER FOR MERGE**

**Issue**: The `web/` directory is not mounted in Docker containers, so the UI won't work in containerized deployments.

---

## Problem

### Current Docker Setup
```yaml
# docker-compose.services.yml - api service volumes:
volumes:
  - ./.env:/app/.env
  - ./repos.json:/app/repos.json
  - ./out:/app/out
  - ./data:/app/data
  - ./gui:/app/gui          ✅ Legacy GUI mounted
  - ./server:/app/server    ✅ Backend code mounted
  - ./scripts:/app/scripts
  - ./reranker:/app/reranker
  # NO ./web MOUNT!          ❌ New React app NOT mounted
```

### What Happens:
1. UI worktree builds React app to `web/dist/`
2. Code merges to development
3. Docker container restarts
4. `/web` route tries to serve from `/app/web/dist/`
5. **FAILS** - directory doesn't exist in container!

---

## Impact

- ✅ **Local development** (outside Docker): Works fine
- ❌ **Docker development**: `/web` returns 404
- ❌ **Production deployment**: UI completely broken

---

## Fix Required BEFORE Merge

### Option A: Add Bind Mount (Development/Hot-Reload)

**File**: `docker-compose.services.yml`

```yaml
services:
  api:
    # ... existing config ...
    volumes:
      - ./.env:/app/.env
      - ./repos.json:/app/repos.json
      - ./out:/app/out
      - ./data:/app/data
      - ./gui:/app/gui
      - ./web:/app/web          # <-- ADD THIS LINE
      - ./server:/app/server
      - ./scripts:/app/scripts
      - ./reranker:/app/reranker
      - /var/run/docker.sock:/var/run/docker.sock
```

**When to use**: Development, allows hot-reload of UI changes

---

### Option B: Copy in Dockerfile (Production Build)

**File**: `Dockerfile`

```dockerfile
# After line 35 (COPY . .)
COPY . .

# Build the React app during Docker build
RUN if [ -d "web" ]; then \
      cd web && \
      npm install && \
      npm run build; \
    fi

CMD ["uvicorn", "server.app:app", ...
```

**When to use**: Production, bakes UI into image

---

### Option C: Both (Recommended)

Use **Option A** for development (bind mount for hot-reload)  
Use **Option B** for production (baked into image)

Add build arg to Dockerfile:
```dockerfile
ARG BUILD_WEB=true
RUN if [ "$BUILD_WEB" = "true" ] && [ -d "web" ]; then \
      cd web && npm install && npm run build; \
    fi
```

Development: `docker compose up` (uses bind mount, skips build)  
Production: `docker build --build-arg BUILD_WEB=true` (bakes in)

---

## Immediate Action Required

**BEFORE merging feature-ui-migration → development**:

1. Add `- ./web:/app/web` to `docker-compose.services.yml`
2. Test with Docker:
   ```bash
   docker compose -f docker-compose.services.yml down
   docker compose -f docker-compose.services.yml up -d --force-recreate api
   curl http://localhost:8012/web  # Should return React app
   ```
3. Update Dockerfile for production builds
4. Document in deployment docs

---

## Current Workaround

The extracted backend routers/services use `common.paths.repo_root()` which:
- ✅ Returns `/app` in Docker (correct)
- ✅ Returns project root locally (correct)
- ✅ Supports `REPO_ROOT` env var override

**BUT** - `server/asgi.py` needs to check if `web/dist` exists:

```python
# In asgi.py create_app():
WEB_DIST = ROOT / "web" / "dist"
if WEB_DIST.exists():  # <-- This will be False in Docker without mount!
    app.mount("/web", StaticFiles(directory=str(WEB_DIST), html=True), name="web")
```

---

## Why This Wasn't Caught

1. Both agents worked in worktrees (local filesystem)
2. Tests ran locally (not in Docker)
3. Docker compose only tested with legacy `/gui`
4. No integration test for Docker + new UI

---

## Prevention for Future

**Checklist before merging UI changes**:
- [ ] Test in Docker container
- [ ] Verify new directories in bind mounts
- [ ] Check Dockerfile COPY statements
- [ ] Run smoke test: `docker exec agro-api ls /app/web`

---

## Status

- ❌ **NOT fixed yet**
- 🚨 **Blocker for merge**
- ⏱️ **Fix time**: 5 minutes
- 🧪 **Test time**: 2 minutes

**DO NOT MERGE until `docker-compose.services.yml` updated and tested!**

