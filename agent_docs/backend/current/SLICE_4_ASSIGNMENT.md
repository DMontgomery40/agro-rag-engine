# Backend Agent: Slice 4 - Docker & MCP Endpoints

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours  
**Status**: Ready to start after Slice 3 merges

---

## Mission

Extract Docker infrastructure endpoints and MCP (Model Context Protocol) HTTP bridge endpoints from monolithic `server/app.py` into routers/services.

**Same pattern as Slices 1-3**: Create routers + services, wire into `asgi.py`, add tests, DON'T touch monolithic `app.py`.

---

## Target Endpoints

### Docker Infrastructure (`/api/docker/*`)

From `server/app.py` (lines ~1900-2100):
- `GET /api/docker/status`
- `GET /api/docker/containers`
- `GET /api/docker/containers/{name}`
- `POST /api/docker/containers/{name}/restart`
- `POST /api/docker/containers/{name}/stop`
- `POST /api/docker/containers/{name}/start`
- `GET /api/docker/infra/redis/ping`

### MCP HTTP Bridge (`/api/mcp/*`)

From `server/app.py` (lines ~2200-2400):
- `GET /api/mcp/status`
- `GET /api/mcp/http/status`
- `POST /api/mcp/http/start`
- `POST /api/mcp/http/stop`
- `GET /api/mcp/rag_search` (wrapper around MCP rag.search tool)

---

## Implementation Guide

### 1. Create `server/routers/docker.py`

```python
import logging
from typing import Any, Dict
from fastapi import APIRouter, Path as PathParam
from server.services import docker as docker_svc

logger = logging.getLogger("agro.api")
router = APIRouter()

@router.get("/api/docker/status")
def docker_status():
    return docker_svc.get_status()

@router.get("/api/docker/containers")
def list_containers():
    return docker_svc.list_containers()

@router.get("/api/docker/containers/{name}")
def get_container(name: str = PathParam(...)):
    return docker_svc.get_container(name)

@router.post("/api/docker/containers/{name}/restart")
def restart_container(name: str = PathParam(...)):
    return docker_svc.restart_container(name)

# ... etc for stop, start

@router.get("/api/docker/infra/redis/ping")
def redis_ping():
    return docker_svc.redis_ping()
```

### 2. Create `server/services/docker.py`

Extract Docker SDK/CLI logic:
- Container status checking
- Container lifecycle operations (start/stop/restart)
- Redis connection testing

**Important**: Docker socket is mounted at `/var/run/docker.sock` in API container (see docker-compose.services.yml line 31)

**Use Docker SDK**:
```python
import docker
from typing import Dict, Any

def get_client():
    """Get Docker client (works in container via socket mount)."""
    try:
        return docker.from_env()
    except Exception as e:
        logger.warning("Docker client unavailable: %s", e)
        return None

def get_status() -> Dict[str, Any]:
    client = get_client()
    if not client:
        return {"ok": False, "error": "Docker not available"}
    # ... check Docker daemon
```

### 3. Create `server/routers/mcp.py`

```python
import logging
from typing import Any, Dict
from fastapi import APIRouter
from server.services import mcp_http as mcp_svc

logger = logging.getLogger("agro.api")
router = APIRouter()

@router.get("/api/mcp/status")
def mcp_status():
    return mcp_svc.get_status()

@router.get("/api/mcp/http/status")
def mcp_http_status():
    return mcp_svc.http_status()

@router.post("/api/mcp/http/start")
def start_mcp_http():
    return mcp_svc.start_http_bridge()

@router.post("/api/mcp/http/stop")
def stop_mcp_http():
    return mcp_svc.stop_http_bridge()

@router.get("/api/mcp/rag_search")
def rag_search_mcp(q: str, repo: str = "agro", top_k: int = 10):
    return mcp_svc.rag_search_wrapper(q, repo, top_k)
```

### 4. Create `server/services/mcp_http.py`

Extract MCP HTTP bridge logic:
- Status checking for MCP HTTP service
- Start/stop orchestration
- Wrapper around `server.mcp.server.MCPServer` for `rag.search` tool

**Note**: MCP module already exists at `server/mcp/` - just wrap it

---

## Docker Compatibility

### Critical Paths:

**Docker socket**: Mounted at `/var/run/docker.sock` in API container
```yaml
# docker-compose.services.yml line 31
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

**This allows**: API container to control other Docker containers

**Your code should**:
- Use `docker.from_env()` (works via socket mount)
- Not hardcode container names - use docker-compose service names
- Handle "Docker unavailable" gracefully (returns JSON error, not crash)

### Redis Connection:

**From container**:
```python
# Redis URL in container network
REDIS_URL = os.getenv("REDIS_URL") or "redis://redis:6379/0"
# Note: 'redis' hostname works via Docker internal DNS
```

**Test ping**:
```python
import redis
r = redis.from_url(REDIS_URL)
r.ping()  # Throws if unavailable
```

---

## Testing

### Test Files:

**`tests/routers/test_docker_direct.py`**:
```python
from fastapi.testclient import TestClient
from server.asgi import create_app

def test_docker_status():
    app = create_app()
    client = TestClient(app)
    r = client.get('/api/docker/status')
    assert r.status_code == 200
    # May return ok=False if Docker unavailable (acceptable)
    assert 'ok' in r.json()

def test_redis_ping():
    app = create_app()
    client = TestClient(app)
    r = client.get('/api/docker/infra/redis/ping')
    assert r.status_code == 200
    # May fail if Redis down (test should pass with error response)
```

**`tests/routers/test_mcp_direct.py`**:
```python
def test_mcp_status():
    app = create_app()
    client = TestClient(app)
    r = client.get('/api/mcp/status')
    assert r.status_code == 200
    # Returns status of MCP server/bridge
```

### Docker Verification:

```bash
# After merge
docker exec agro-api python3 -c "
from server.asgi import create_app
from fastapi.testclient import TestClient
app = create_app()
client = TestClient(app)
print('Docker status:', client.get('/api/docker/status').json())
print('Redis ping:', client.get('/api/docker/infra/redis/ping').json())
"
```

---

## Wire into asgi.py

```python
# Add imports
from server.routers.docker import router as docker_router
from server.routers.mcp import router as mcp_router

# In create_app():
app.include_router(docker_router)
app.include_router(mcp_router)
```

---

## Success Criteria

Before reporting done:
- ✅ Routers created: `docker.py`, `mcp.py`
- ✅ Services created: `docker.py`, `mcp_http.py`
- ✅ Wired into `asgi.py`
- ✅ Tests added and passing
- ✅ Docker socket access works (via docker.from_env())
- ✅ Redis ping works (via redis.from_url())
- ✅ Monolithic `app.py` UNCHANGED
- ✅ All paths use `common.paths` helpers

---

## Report Back

1. ✅ Files created (routers, services, tests)
2. ✅ Test results: `pytest tests/routers/test_docker_direct.py test_mcp_direct.py`
3. ✅ Docker verification command output
4. ⚠️ Any issues (Docker SDK permissions, MCP module imports, etc.)

---

**After Slice 4**: Only remaining major extractions are Reranker Admin, Cards/Semantic Boosts, and Onboarding. Getting close to complete modularization!

