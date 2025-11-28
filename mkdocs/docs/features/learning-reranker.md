# Learning Reranker

Self-improving cross-encoder that trains on your usage.

## How It Works

1. **Feedback Collection** - Clicks, thumbs up/down, query-result pairs
2. **Triplet Mining** - Create (query, positive, negative) training samples
3. **Training** - Fine-tune cross-encoder on your data
4. **Evaluation** - Compare against baseline
5. **Promotion** - Auto-deploy if metrics improve

## Training

```bash
python scripts/train_reranker.py
```

## Metrics

After training on a few hundred interactions, MRR typically improves 0.10-0.15.
