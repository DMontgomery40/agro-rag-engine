# Profiles

Save different configurations for different tasks.

## Overview

Profiles let you quickly switch between configurations - different models, search parameters, or repos.

## Usage

### GUI

Settings → Profiles → New Profile

### API

```bash
curl -X POST http://127.0.0.1:8012/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "fast", "gen_model": "gpt-4o-mini", "top_k": 5}'
```

### Apply

```bash
curl -X POST http://127.0.0.1:8012/api/profiles/fast/apply
```

## Profile Fields

- `gen_model` - Generation model
- `embedding_type` - Embedding provider
- `rerank_backend` - Reranker
- `top_k` - Number of results
- `bm25_weight` / `dense_weight` - Fusion weights
