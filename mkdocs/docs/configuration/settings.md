# Settings

All configuration options.

## Configuration File

Settings live in `agro_config.json`. Use the GUI Settings tab or edit directly.

## Key Settings

### Retrieval

- `top_k` - Number of results to return
- `bm25_weight` - Weight for BM25 results (0-1)
- `dense_weight` - Weight for dense results (0-1)
- `rerank_top_n` - How many to rerank

### Models

- `gen_model` - Generation model name
- `embedding_type` - `openai`, `local`, `voyage`, `gemini`
- `rerank_backend` - `cohere`, `local`, `hf`

### Infrastructure

- `qdrant_url` - Qdrant connection string
- `redis_url` - Redis connection string

## Environment Variables

Secrets go in `.env`:

```bash
OPENAI_API_KEY=sk-...
COHERE_API_KEY=...
ANTHROPIC_API_KEY=...
```
