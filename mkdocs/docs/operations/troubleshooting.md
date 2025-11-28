# Troubleshooting

Common problems and solutions.

## Connection Issues

### "Connection refused" to Qdrant

```bash
docker restart qdrant
docker logs qdrant
```

### Redis won't connect

```bash
docker restart rag-redis
docker exec rag-redis redis-cli ping  # Should say PONG
```

## Indexing Problems

### Indexing is slow

If using OpenAI embeddings, you may be hitting rate limits:

- Wait (the indexer handles rate limiting automatically)
- Switch to local embeddings: `EMBEDDING_TYPE=local`
- Use Gemini's free tier: `EMBEDDING_TYPE=gemini`

### Python import errors

```bash
pip install -r requirements-rag.txt --force-reinstall
```

## Search Quality

### Bad results

1. Run evaluation: `python eval/eval_loop.py`
2. Check if reranker is working
3. Try adjusting `bm25_weight` and `dense_weight`

### Missing files

Check exclusion patterns in `data/exclude_globs.txt`

## Logs

```bash
docker logs rag-service-api
docker logs qdrant
docker logs rag-redis
```
