# Hybrid Search

How AGRO's retrieval system works.

## Overview

AGRO uses a 7-stage hybrid search pipeline:

1. **Query Expansion** - Generate search variants
2. **BM25 Search** - Sparse keyword matching
3. **Dense Search** - Semantic vector similarity
4. **Result Fusion** - Reciprocal Rank Fusion
5. **Cross-Encoder Reranking** - Fine-grained scoring
6. **Bonus Scoring** - Path, language, layer bonuses
7. **Top-K Selection** - Return best results

## Performance

| Method | Top-1 Accuracy | MRR |
|--------|----------------|-----|
| Hybrid (AGRO) | 82% | 0.88 |
| Dense only | 68% | 0.74 |
| BM25 only | 61% | 0.69 |

## Configuration

See [Settings](../configuration/settings.md) for tuning retrieval parameters.
