# Running the Indexer

## Quick Start

### Option 1: Use the helper script (easiest)
```bash
./index.sh
```

### Option 2: Set PYTHONPATH manually
```bash
PYTHONPATH=. python indexer/index_repo.py
```

### Option 3: Use python -m (if indexer is a proper module)
```bash
python -m indexer.index_repo
```

## Common Issues

### "No module named 'common'" Error

**Problem**: Running the indexer from the wrong directory
```bash
# ❌ WRONG - Running from indexer directory
cd indexer
python index_repo.py  # Error!
```

**Solution**: Run from project root with PYTHONPATH
```bash
# ✅ CORRECT - Run from project root
cd /Users/davidmontgomery/agro-rag-engine
PYTHONPATH=. python indexer/index_repo.py
```

## Environment Variables

The indexer respects these environment variables:

- `SKIP_DENSE=1` - Skip dense embeddings and Qdrant upsert (BM25 only)
- `SKIP_BM25=1` - Skip BM25 indexing (dense embeddings only)
- `QDRANT_URL` - Qdrant server URL (default: http://127.0.0.1:6333)
- `OPENAI_API_KEY` - Required for OpenAI embeddings
- `EMBEDDING_TYPE` - Embedding provider: `openai`, `voyage`, `local` (default: openai)

## Examples

### Full indexing (BM25 + embeddings + Qdrant) - DEFAULT
```bash
./index.sh
```

This will:
1. Build BM25 sparse index
2. Generate dense embeddings via OpenAI (or your configured provider)
3. Upload vectors to Qdrant
4. Create searchable index for hybrid search

### BM25 only (faster, no Qdrant/embeddings needed)
```bash
SKIP_DENSE=1 ./index.sh
```

Use this for:
- Quick testing of BM25 keyword search
- When Qdrant is not running
- To save on API costs (no embedding calls)

### Verbose output
```bash
PYTHONPATH=. python -u indexer/index_repo.py
```
