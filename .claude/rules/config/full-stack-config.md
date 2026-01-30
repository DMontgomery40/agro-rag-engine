# Full-Stack Configuration Flow

End-to-end configuration architecture from UI to persistence.

## The Complete Flow

```
[React UI]
    ↓ useConfig().set('KEY', value)
[useConfigStore]
    ↓ debounced saveConfig()
[API Client]
    ↓ POST /api/env/save
[FastAPI Router]
    ↓ config_store.set_config()
[ConfigRegistry]
    ↓ update_agro_config()
[Pydantic Validation]
    ↓ AgroConfigRoot.from_flat_dict()
[Atomic Write]
    ↓ temp file + os.replace()
[agro_config.json]
    ↓ registry.reload()
[Module Reload]
    ↓ calls reload_config() on cached modules
[Response]
    ↓ { reloaded_modules: [...] }
[Frontend]
    ↓ updates store with confirmed values
```

## Adding a New Setting (Checklist)

### Backend
1. [ ] Add field to Pydantic model in `server/models/agro_config_model.py`
2. [ ] Add default value to `agro_config.json`
3. [ ] Access via `config_registry.get_*(KEY, default)`

### Frontend
4. [ ] Add UI control in appropriate Settings component
5. [ ] Use `useConfig()` or `useConfigField()` hook
6. [ ] Add tooltip via `useTooltips` hook

### Validation
7. [ ] Run config contract test:
   ```bash
   pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
   ```

## Config Contract Test

After ANY config-related change, run:

```bash
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
```

This validates:
- No `os.getenv` for config keys (use registry)
- JSON/Pydantic/Registry parity
- No hardcoded fallbacks

## Environment Variables vs Configuration

| Type | Location | Frontend Access |
|------|----------|-----------------|
| Configuration | `agro_config.json` | Full read/write via store |
| Secrets (API keys) | `.env` | Boolean check only via `/api/secrets/check` |
| Infrastructure | `.env` (QDRANT_URL, etc.) | Never exposed |

## API Key Pattern (Gold Standard)

See `RerankerConfigSubtab.tsx` for the reference implementation.

**API keys NEVER leave the backend:**
1. Keys stored in `.env` only
2. Frontend checks via `/api/secrets/check?keys=KEY_NAME` → returns `{KEY_NAME: true/false}`
3. UI shows "Configured" / "Not configured" status
4. User edits `.env` directly to add keys

## Key Invariants

1. **Single source of truth**: `agro_config.json` for config, `.env` for secrets
2. **Type safety**: Pydantic validates all config changes
3. **Atomic writes**: No partial config corruption
4. **Reload protocol**: Cached modules stay in sync
5. **Secrets isolation**: API keys never exposed to frontend
