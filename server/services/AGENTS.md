---
paths: server/services/**/*.py
---

# Service Layer Conventions

Standards for business logic in `/server/services/`.

## Service Responsibility

Services own business logic. Routers are thin wrappers.

```python
# In router (thin)
@router.post("/api/action")
def action_endpoint(request: ActionRequest):
    return service.perform_action(request)

# In service (business logic)
def perform_action(request: ActionRequest) -> ActionResult:
    # Validation, transformation, orchestration
    # Database calls, external API calls
    # Return processed result
```

## Configuration Access

**Never use `os.getenv` for configuration.** Use the registry:

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()
value = registry.get_float('BM25_WEIGHT', 0.3)
```

## Module Reload Protocol

If your service caches configuration values, implement `reload_config()`:

```python
_cached_model = None

def reload_config():
    """Called when config changes via /api/env/reload."""
    global _cached_model
    _cached_model = None

def get_model():
    global _cached_model
    if _cached_model is None:
        path = get_config_registry().get_str('MODEL_PATH', 'default')
        _cached_model = load_model(path)
    return _cached_model
```

## Key Services

### config_registry.py
- Thread-safe singleton for config access
- Type-safe accessors: `get_int`, `get_float`, `get_bool`, `get_str`
- `update_agro_config()` for atomic writes

### config_store.py
- Higher-level config I/O
- Atomic writes with Docker-safe fallback
- repos.json management
- Secrets handling (boolean checks only)

### rag.py
- `do_search()` - Retrieval only
- `do_answer()` - Full RAG pipeline
- `do_chat()` - Streaming chat with overrides

## Error Handling

Raise appropriate exceptions that routers can convert to HTTP responses:

```python
class ConfigError(Exception):
    pass

def update_setting(key: str, value: Any):
    if not valid(value):
        raise ConfigError(f"Invalid value for {key}")
```
