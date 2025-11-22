# Pydantic Configuration - Quick Reference

**Full Audit:** `/agent_docs/audit/pydantic_config_complete_audit.md` (1,017 lines)

## Quick Facts

- **Total Configurable Parameters:** 158 fields across 15 categories
- **Main Model:** `/server/models/agro_config_model.py` (1,538 lines)
- **Configuration File:** `/agro_config.json` (nested JSON structure)
- **Registry:** `/server/services/config_registry.py` (thread-safe singleton)
- **All Files:** Present and fully implemented - NO STUBS

## Config Precedence (Highest to Lowest)

1. `.env` file (environment variables - secrets & overrides)
2. `agro_config.json` (tunable RAG parameters)
3. Pydantic defaults (hardcoded fallback values)

## The 15 Configuration Categories

| # | Category | Fields | Purpose |
|---|----------|--------|---------|
| 1 | RetrievalConfig | 21 | Search, ranking, multi-query |
| 2 | ScoringConfig | 5 | Result scoring, boosting |
| 3 | LayerBonusConfig | 5 | Layer-specific adjustments |
| 4 | EmbeddingConfig | 10 | Embedding model, caching |
| 5 | ChunkingConfig | 8 | Code chunking strategy |
| 6 | IndexingConfig | 12 | Vector DB configuration |
| 7 | RerankingConfig | 13 | Reranker selection, tuning |
| 8 | GenerationConfig | 12 | LLM model, temperature |
| 9 | EnrichmentConfig | 6 | Card generation |
| 10 | KeywordsConfig | 5 | Discriminative keywords |
| 11 | TracingConfig | 12 | Observability, metrics |
| 12 | TrainingConfig | 10 | Reranker training |
| 13 | UIConfig | 17 | Chat, editor, Grafana |
| 14 | HydrationConfig | 2 | Context hydration |
| 15 | EvaluationConfig | 3 | Evaluation datasets |

## How to Add a New Config Parameter

**5 Files to Update:**

1. **Add to Pydantic model class** (e.g., RetrievalConfig)
   - File: `/server/models/agro_config_model.py`
   - Use `Field(default=X, ge/le=Y, description="...")`
   - Include validation (ge, le, pattern, field_validator)

2. **Add to AGRO_CONFIG_KEYS set**
   - File: `/server/models/agro_config_model.py` (lines 1381-1538)
   - Use UPPERCASE_SNAKE_CASE

3. **Add to to_flat_dict() method**
   - File: `/server/models/agro_config_model.py` (lines 1026-1196)
   - Maps nested field to uppercase key

4. **Add to from_flat_dict() class method**
   - File: `/server/models/agro_config_model.py` (lines 1199-1374)
   - Reverse mapping with defaults

5. **Add to agro_config.json**
   - File: `/agro_config.json` (at repo root)
   - Use lowercase_snake_case (matching Python field name)

## Critical Rules

- **ALWAYS use lowercase_snake_case** for Pydantic field names
- **ALWAYS use UPPERCASE_SNAKE_CASE** for env var names
- **ALWAYS use relative paths**, never `/Users/...` hardcoded paths
- **ALWAYS use 0/1** for boolean values in JSON/env, never true/false
- **ALWAYS add Pydantic validation** (ge, le, pattern, or field_validator)
- **NEVER add stubs or placeholders** - full implementation required
- **NEVER skip GUI wiring** for user-facing settings (ADA requirement)

## Key Classes

### ConfigRegistry (`/server/services/config_registry.py`)

```python
registry = get_config_registry()  # Thread-safe singleton
registry.load()                   # Load from files
registry.get('KEY')               # Get any value
registry.get_int('KEY', default)  # Get integer
registry.get_float('KEY', default) # Get float
registry.get_str('KEY', default)  # Get string
registry.get_bool('KEY', default) # Get boolean (1/0, true/false, yes/no)
registry.update_agro_config({...})# Update and validate
registry.get_source('KEY')        # Which file (agro_config.json or .env)
```

### API Endpoints (`/server/routers/config.py`)

- `GET /api/config` - Get current config with sources
- `POST /api/config` - Update config (auto-split env vs agro_config)
- `GET /api/config-schema` - JSON schema for UI
- `POST /api/env/reload` - Reload from disk
- `POST /api/secrets/ingest` - Upload secrets file

## Validation Examples

```python
# Range validation
my_param: int = Field(default=50, ge=1, le=100)

# Enum validation
backend: str = Field(default="local", pattern="^(local|cohere|voyage)$")

# Cross-field validation
@model_validator(mode='after')
def validate_weights(self):
    total = self.bm25_weight + self.vector_weight
    if not (0.99 <= total <= 1.01):
        raise ValueError('Weights must sum to 1.0')
    return self
```

## Common Pitfalls

❌ **DON'T:**
- Hardcode absolute paths: `/Users/davidmontgomery/...`
- Use True/false in JSON: `"enabled": true` (use 0/1 instead)
- Skip GUI wiring for settings (violates ADA requirement)
- Add TODO comments without explicit approval
- Update only 1-2 files (must update all 5)

✅ **DO:**
- Use relative paths: `./out`, `data/logs/queries.jsonl`
- Use 0/1 for booleans: `"enabled": 1`
- Wire all settings to frontend with help text
- Test with smoke test before committing
- Update all 5 locations consistently

## Testing

```bash
# Test Pydantic loading
python -c "from server.models.agro_config_model import AgroConfigRoot; AgroConfigRoot()"

# Test registry loading
python -c "from server.services.config_registry import get_config_registry; r = get_config_registry(); r.load()"

# Test API
curl http://localhost:8012/api/config | jq '.env'

# Test update
curl -X POST http://localhost:8012/api/config \
  -H "Content-Type: application/json" \
  -d '{"env": {"MY_KEY": "value"}}'
```

## Secret Fields (Env-Only)

These go in `.env` ONLY, never in agro_config.json:

- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY
- COHERE_API_KEY
- VOYAGE_API_KEY
- LANGSMITH_API_KEY
- LANGCHAIN_API_KEY
- LANGTRACE_API_KEY
- NETLIFY_API_KEY
- OAUTH_TOKEN
- GRAFANA_API_KEY

## Monitoring Config Issues

Check config sources in `/api/config` response:

```json
{
  "hints": {
    "config_sources": {
      "RRF_K_DIV": "agro_config.json",
      "OPENAI_API_KEY": ".env",
      "CUSTOM_PARAM": "agro_config.json"
    }
  }
}
```

This shows which file each config value came from - useful for debugging.

---

**Full details:** See `/agent_docs/audit/pydantic_config_complete_audit.md`
