---
paths: server/routers/**/*.py
---

# FastAPI Router Conventions

Standards for API endpoint handlers in `/server/routers/`.

## Router Pattern

Routers are thin handlers—business logic belongs in services.

```python
from fastapi import APIRouter, HTTPException, Query
from server.services import config_store as cfg

router = APIRouter()

@router.get("/api/endpoint")
def handler(param: str = Query(..., description="Parameter description")) -> Dict[str, Any]:
    """Full description of endpoint behavior."""
    result = cfg.function(param)
    if not result:
        raise HTTPException(status_code=404, detail="Resource not found")
    return result
```

## Route Naming

- All routes prefixed with `/api/` (except legacy `/search`, `/answer`)
- Use descriptive names: `/api/repos/{name}/status`
- Plural nouns for collections: `/api/repos`, `/api/keywords`

## Request Handling

- Use `Query()` with descriptions for query parameters
- Use Pydantic models for request bodies
- Inject `Request` object for context (tracing, logging)

## Response Format

- Return type: `Dict[str, Any]` or specific Pydantic model
- Use `JSONResponse` for custom status codes
- Include relevant metadata in responses

## Error Handling

```python
from fastapi import HTTPException

if not found:
    raise HTTPException(status_code=404, detail="Item not found")

if invalid:
    raise HTTPException(status_code=400, detail="Invalid parameter")
```

## Configuration Access

Always use the config registry, never `os.getenv`:

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()
value = registry.get_int('SETTING_NAME', default_value)
```

## Key Files

- `server/routers/config.py` - Config management endpoints
- `server/routers/search.py` - Search and chat endpoints
- `server/routers/repos.py` - Repository management
- `server/routers/indexing.py` - Indexing operations

## 30 Routers Total

Core RAG, operational, infrastructure, monitoring, and feature-specific routers.
See `server/asgi.py` for full router registration.
