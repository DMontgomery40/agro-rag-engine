---
paths: server/**/*.py
---

# Pydantic Configuration Flow

All backend configuration MUST flow through the Pydantic config system.

## Core Principle
**Never use `os.getenv()` for configuration.** Use `config_registry.get_*()` instead.

## Configuration Stack

```
agro_config.json (source of truth)
    ↓
AgroConfigRoot (Pydantic validation)
    ↓
ConfigRegistry (runtime access)
    ↓
Your code: config_registry.get_int('KEY', default)
```

## Adding a New Setting

1. **Add to Pydantic model** (`server/models/agro_config_model.py`):
   ```python
   class RetrievalConfig(BaseModel):
       my_new_setting: int = Field(default=10, ge=1, le=100)
   ```

2. **Add to agro_config.json**:
   ```json
   { "retrieval": { "my_new_setting": 10 } }
   ```

3. **Access in code**:
   ```python
   from server.services.config_registry import get_config_registry

   registry = get_config_registry()
   value = registry.get_int('MY_NEW_SETTING', 10)
   ```

## Type-Safe Accessors

```python
registry.get_int('RRF_K_DIV', 60)
registry.get_float('BM25_WEIGHT', 0.3)
registry.get_bool('ENABLE_CACHE', True)
registry.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
```

## Updating Config at Runtime

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()
registry.update_agro_config({
    'rrf_k_div': 80,
    'bm25_weight': 0.4
})
# Writes atomically to agro_config.json
# Triggers reload across all cached modules
```

## Module Reload Protocol

If your module caches config values, implement `reload_config()`:

```python
_cached_value = None

def reload_config():
    global _cached_value
    _cached_value = None  # Force re-read on next access

def get_value():
    global _cached_value
    if _cached_value is None:
        _cached_value = get_config_registry().get_int('KEY', 10)
    return _cached_value
```

## Key Files

- `server/models/agro_config_model.py` - Pydantic schema (19 nested models)
- `server/services/config_registry.py` - Runtime access layer
- `server/services/config_store.py` - Persistence and atomic writes
- `agro_config.json` - Source of truth

## Common Mistakes

- Using `os.getenv()` for config values
- Hardcoding fallback values instead of Pydantic defaults
- Forgetting to add new settings to agro_config.json
- Not implementing `reload_config()` for cached values
