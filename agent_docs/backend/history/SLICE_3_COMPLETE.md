# Backend Agent: Slice 3 - Cost & Profiles Extraction

**Assigned by**: Opus Architect via Sonnet  
**Priority**: HIGH  
**Estimated Time**: 3-4 hours  
**Status**: Ready to start

---

## Your Mission

Extract cost estimator and profiles endpoints from monolithic `server/app.py` into routers/services, following the same pattern you used for Slice 1 & 2.

**Critical**: DO NOT modify the monolithic `server/app.py` - only add NEW files.

---

## Target Endpoints

### From `server/app.py` (lines ~1635-1750):

**Cost Estimator**:
- `POST /api/cost/estimate`
- `POST /api/cost/estimate_pipeline`

**Profiles**:
- `GET /api/profiles`
- `GET /api/profiles/{name}`
- `POST /api/profiles/save`
- `POST /api/profiles/apply`
- `POST /api/profile/autoselect`

---

## Implementation Steps

### 1. Create Router: `server/routers/cost.py`

```python
import logging
from typing import Any, Dict
from fastapi import APIRouter
from server.services import cost as cost_svc

logger = logging.getLogger("agro.api")
router = APIRouter()

@router.post("/api/cost/estimate")
def estimate_cost(payload: Dict[str, Any]):
    return cost_svc.estimate_cost(payload)

@router.post("/api/cost/estimate_pipeline")
def estimate_pipeline(payload: Dict[str, Any]):
    return cost_svc.estimate_pipeline(payload)
```

### 2. Create Service: `server/services/cost.py`

Extract the cost calculation logic from `server/app.py`. Look for:
- Price lookups from model catalog
- Token estimation formulas
- Storage calculations

**Key**: Use `common.paths.data_dir()` for reading price JSON files (Docker: `/app/data/...`)

### 3. Create Router: `server/routers/profiles.py`

```python
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Path as PathParam
from server.services import profiles as profiles_svc

logger = logging.getLogger("agro.api")
router = APIRouter()

@router.get("/api/profiles")
def list_profiles():
    return profiles_svc.list_all()

@router.get("/api/profiles/{name}")
def get_profile(name: str = PathParam(...)):
    return profiles_svc.get_profile(name)

@router.post("/api/profiles/save")
def save_profile(payload: Dict[str, Any]):
    return profiles_svc.save_profile(payload)

@router.post("/api/profiles/apply")
def apply_profile(payload: Dict[str, Any]):
    return profiles_svc.apply_profile(payload)

@router.post("/api/profile/autoselect")
def autoselect_profile(payload: Dict[str, Any]):
    return profiles_svc.autoselect(payload)
```

### 4. Create Service: `server/services/profiles.py`

Extract profile management logic:
- Reading from `data/profiles/` directory
- Applying profile settings to env
- Auto-profile selection algorithm

**Key**: Use `common.paths.data_dir()` for profile storage

### 5. Wire Routers into `server/asgi.py`

```python
# Add imports
from server.routers.cost import router as cost_router
from server.routers.profiles import router as profiles_router

# In create_app():
app.include_router(cost_router)
app.include_router(profiles_router)
```

### 6. Add Tests

**File**: `tests/routers/test_cost_direct.py`
```python
from fastapi.testclient import TestClient
from server.asgi import create_app

def test_cost_estimate():
    app = create_app()
    client = TestClient(app)
    payload = {"model": "gpt-4o-mini", "input_tokens": 1000, "output_tokens": 500}
    r = client.post('/api/cost/estimate', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 'total_cost' in data or 'cost' in data
```

**File**: `tests/routers/test_profiles_direct.py`
```python
def test_profiles_list():
    app = create_app()
    client = TestClient(app)
    r = client.get('/api/profiles')
    assert r.status_code == 200
    # Should return list or dict of profiles
```

---

## Docker Compatibility Checklist

### ✅ DO:
- Use `common.paths.data_dir()` → `/app/data` in Docker
- Use `common.paths.repo_root()` → `/app` in Docker
- Use `Path(__file__).parent.parent` for relative paths
- Read from `data/profiles/`, `data/prices.json`, etc. via path helpers

### ❌ DON'T:
- Hardcode `/Users/davidmontgomery/...`
- Hardcode `/app/...` (use helpers)
- Assume files are in specific absolute locations

### Verify:
```bash
# After extraction, test in Docker
docker exec agro-api python3 -c "
from server.asgi import create_app
from fastapi.testclient import TestClient
app = create_app()
client = TestClient(app)
print(client.get('/api/profiles').json())
"
```

---

## Testing Requirements

### Locally (Development):
```bash
# Install if needed, then test
PYTHONPATH=. pytest -q tests/routers/test_cost_direct.py
PYTHONPATH=. pytest -q tests/routers/test_profiles_direct.py
```

### In Docker:
```bash
# After merge, verify endpoints work
docker exec agro-api python3 -c "from server.asgi import create_app; ..."
```

---

## Success Criteria

Before claiming "done":
- ✅ Routers created: `cost.py`, `profiles.py`
- ✅ Services created: `cost.py`, `profiles.py`
- ✅ Wired into `asgi.py`
- ✅ Tests added and passing
- ✅ **Monolithic app.py UNCHANGED** (still 4165 lines)
- ✅ Docker paths verified (no absolute paths)
- ✅ Tested via `from server.asgi import create_app`

---

## What to Report Back

1. ✅ Files created (list them)
2. ✅ Test results: `pytest tests/routers/test_*.py`
3. ✅ Docker verification: `docker exec agro-api ls /app/server/routers`
4. ⚠️ Any issues or deviations from plan

---

## Notes from Architect

- **Parallel architecture**: Your new code runs alongside old code (no replacement)
- **Integration tested**: Opus verified routers work via asgi.py
- **Next slice after this**: Reranker & Docker endpoints (Slice 4)

**Get started with cost/profiles extraction!** Follow the same pattern you used successfully for Slices 1 & 2.

