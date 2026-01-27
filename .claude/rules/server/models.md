---
paths: server/models/**/*.py
---

# Pydantic Model Conventions

Standards for data models in `/server/models/`.

## Model Organization

All Pydantic models live in `/server/models/`:
- `agro_config_model.py` - Configuration schema (19 nested models)
- `repo_model.py` - Repository configuration
- `chat_models.py` - Request/response schemas

## Configuration Model Structure

`AgroConfigRoot` contains nested domain-specific models:

```python
class AgroConfigRoot(BaseModel):
    retrieval: RetrievalConfig
    embedding: EmbeddingConfig
    reranking: RerankingConfig
    generation: GenerationConfig
    # ... 15 more domain configs
```

## Field Definitions

Use `Field()` with constraints and descriptions:

```python
class RetrievalConfig(BaseModel):
    rrf_k_div: int = Field(
        default=60,
        ge=1,
        le=200,
        description="RRF k divisor for score fusion"
    )
    bm25_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight for BM25 sparse scores"
    )
```

## Validators

Use validators for complex rules:

```python
from pydantic import field_validator, model_validator

class ScoringConfig(BaseModel):
    exact_boost: float = 1.5
    partial_boost: float = 1.2

    @model_validator(mode='after')
    def exact_greater_than_partial(self):
        if self.exact_boost <= self.partial_boost:
            raise ValueError("exact_boost must be > partial_boost")
        return self
```

## JSON Conversion

Implement for flat/nested conversion:

```python
class AgroConfigRoot(BaseModel):
    def to_flat_dict(self) -> Dict[str, Any]:
        """Convert nested config to flat key-value dict."""
        ...

    @classmethod
    def from_flat_dict(cls, data: Dict[str, Any]) -> "AgroConfigRoot":
        """Parse flat dict into nested config."""
        ...
```

## Backwards Compatibility

Support legacy key names via aliases or normalization:

```python
@model_validator(mode='before')
def normalize_legacy_keys(cls, data):
    if 'MQ_REWRITES' in data:
        data['max_query_rewrites'] = data.pop('MQ_REWRITES')
    return data
```

## Key File

`server/models/agro_config_model.py` (2,364 lines) - The source of truth for all configuration.
