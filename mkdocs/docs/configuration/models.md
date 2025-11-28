# Models

Configure generation, embedding, and reranking models.

## Generation Model

Creates the final answer.

**Cloud:**

- `gpt-4o` - Best quality, expensive
- `gpt-4o-mini` - Good balance
- `claude-3-5-sonnet` - Anthropic's best
- `gemini-2.5-flash` - Cheap and fast

**Local:**

- `qwen3-coder:30b` - Best local code model (needs 32GB+ RAM)
- `qwen2.5-coder:7b` - Smaller, still good (needs 8GB+ RAM)

Set via GUI or:

```bash
GEN_MODEL=qwen3-coder:30b
```

## Embedding Model

Creates vectors for semantic search.

**Cloud:**

- `text-embedding-3-large` (OpenAI)
- `voyage-3-large` (Voyage AI)

**Local:**

- `nomic-embed-text`
- `BAAI/bge-small-en-v1.5`

!!! warning
    Changing embedding models requires re-indexing.

## Reranker

Cross-encoder that scores results.

- `cohere` - Best quality, costs money
- `local` - Free, slightly worse
- `hf` - HuggingFace cross-encoder
