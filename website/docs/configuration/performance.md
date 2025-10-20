---
sidebar_position: 2
---

# Performance & Cost Analysis

AGRO dramatically reduces token consumption compared to using AI assistants without RAG. This document shows real-world performance data and cost savings.

## Executive Summary

**Bottom line**: RAG saves 91% tokens. That means 11x more queries before hitting your rate limits.

![Performance Metrics](/img/screenshots/grafana-metrics.png)

## Real-World Comparison

**Test Details**:
- **Date**: 2025-10-08
- **Query**: "Where is OAuth processed in this repo, and which plugins must validate with it?"
- **Model**: Claude Sonnet 4.5 on $200/mo Pro
- **Tester**: @dmontgomery40

| Approach | Tokens/Query | Queries Before Rate Limit | Latency | Quality |
|----------|--------------|--------------------------|---------|---------|
| **Claude Code Alone** | 12,700 | 100 | 5-10s | Excellent |
| **Claude Code + RAG** | 1,141 | **1,110** | 2.9s | Excellent |
| **DIFFERENCE** | **-11,559 (-91%)** | **+1,010 (+1,010%)** | **-5s** | Same |

## Impact on Rate Limits

Rate limits are the real bottleneck when using AI assistants, not cost. Even with a paid plan, you hit weekly token caps quickly.

### Example Rate Limits (Illustrative)

> Note: These are simplified examples for comparison purposes. Check your actual plan limits.

**Without RAG**:
- Sonnet: 1.27M tokens/week ÷ 12,700 tokens/query = **100 queries/week**
- Opus: 300K tokens/week ÷ 12,700 tokens/query = **23 queries/week**

**With RAG**:
- Sonnet: 1.27M tokens/week ÷ 1,141 tokens/query = **1,110 queries/week**
- Opus: 300K tokens/week ÷ 1,141 tokens/query = **263 queries/week**

**Key Insight**: On Opus without RAG, you can hit your weekly limit in a single intensive coding day. With RAG, you can code all week without worry.

## Speed Comparison

Claude Code alone: 5-10 seconds (reading 10+ full files)
Claude Code + RAG: 2-15 seconds (metadata only)

**Verdict**: RAG is generally 2-3x faster, but can occasionally be slower depending on:
- Query complexity
- Index freshness
- Reranking model used
- Number of retrieved chunks

Speed is roughly a wash - the real benefit is token savings.

## Quality Comparison

Both approaches give excellent answers, but for different reasons:

**Claude Code Alone**:
- Reads full files for complete context
- Strong reasoning over entire codebase
- Can miss relevant code in large repos

**Claude Code + RAG**:
- Semantic search finds relevant code chunks
- Works with cheaper models (4o-mini) due to focused context
- Quality depends on index freshness and query specificity

### When RAG Works Better

1. **Large codebases** (>1000 files) - Full file reading becomes impractical
2. **Specific questions** - "Where is OAuth validated?" vs "Tell me about auth"
3. **Cross-file references** - RAG semantic search finds connections

### Using RAG Results Effectively

**Two strategies**:

1. **Feed answers to Claude**: Use `rag_answer` to get context, then ask Claude to implement based on that
2. **Direct code retrieval**: Use `rag_search` to get relevant code chunks without generation - semantic `grep` that understands context

## Contributing Benchmarks

We need your help testing with different Claude models and tiers!

**Contribution Guide**: [CONTRIBUTING.md](https://github.com/DMontgomery40/agro-rag-engine/blob/main/docs/CONTRIBUTING.md)

Help us test:
- Different Claude models (Haiku, Sonnet, Opus)
- Different plan tiers (Free, Pro, API)
- Different query types (navigation, implementation, architecture)
- Different codebase sizes

Scripts to autorun these tests are available in `/scripts`.

## Cost Analysis

### Cloud API Costs

For typical usage (1M tokens/month embedding, 500K tokens/month generation):

| Configuration | Monthly Cost | Use Case |
|--------------|-------------|----------|
| **Budget** (Gemini free + Flash) | $1-3 | Prototypes, personal projects |
| **Balanced** (OpenAI embeddings + 4o-mini) | $5-15 | Small teams, moderate usage |
| **Premium** (OpenAI + Cohere rerank) | $20-50 | Production, high quality required |
| **High-volume** (OpenAI + 4o + Cohere) | $100+ | Enterprise, heavy usage |

### Self-Hosted Savings

**Hardware costs**:
- Mac M4 Max (32GB): ~$3,000 one-time
- NVIDIA RTX 4090 (24GB): ~$1,600 one-time
- Cloud GPU (A100): ~$1-3/hour

**Break-even analysis**:
- At $50/month API costs: Hardware pays for itself in 5-6 years
- At $200/month API costs: Hardware pays for itself in ~1.5 years
- At $500/month API costs: Hardware pays for itself in ~6 months

### Hidden Costs

**Self-hosted considerations**:
- Electricity (~$10-30/month for 24/7 GPU operation)
- Maintenance and updates
- Learning curve for model management
- Limited to what fits in VRAM/RAM

**Cloud API considerations**:
- Rate limits can be hit unexpectedly
- Pricing changes (usually downward, but not guaranteed)
- Vendor lock-in
- Data leaves your infrastructure

## Optimization Strategies

### 1. Use BM25-Only for Development

During active development, skip expensive embeddings:

```bash
export EMBEDDING_TYPE=local
export SKIP_DENSE=1
REPO=agro python index_repo.py
```

**Savings**: ~90% reduction in indexing cost
**Trade-off**: Slightly lower quality semantic search

### 2. Cache Aggressively

AGRO caches by default:
- Only re-embeds changed files
- Stores BM25 indices for instant retrieval
- Persists conversation context in Redis

### 3. Right-Size Your Models

Don't use GPT-4o if 4o-mini works:

```bash
# Test with mini first
export GEN_MODEL=gpt-4o-mini

# Upgrade if quality insufficient
export GEN_MODEL=gpt-4o
```

### 4. Batch Operations

Indexing multiple repos? Do it once:

```bash
for repo in repo1 repo2 repo3; do
  REPO=$repo python index_repo.py &
done
wait
```

### 5. Monitor with Prometheus

Track costs in real-time:
- Visit http://localhost:9090
- Query: `rate(agro_cost_usd_total[1h]) * 24` for daily cost projection
- Set up alerts (see [Alerting](alerting.md))

## Performance Tuning

### Retrieval Performance

**Default settings** (balanced):
```bash
BM25_K=20              # Initial BM25 retrieval
DENSE_K=20             # Initial dense retrieval
RERANK_TOP_N=10        # Final results after reranking
MQ_REWRITES=4          # Multi-query expansions
```

**Fast mode** (lower quality):
```bash
BM25_K=10
DENSE_K=0              # Skip dense
RERANK_TOP_N=5
MQ_REWRITES=0          # Skip multi-query
```

**High quality** (slower, more expensive):
```bash
BM25_K=50
DENSE_K=50
RERANK_TOP_N=20
MQ_REWRITES=6
RERANK_BACKEND=cohere  # Use Cohere rerank-3.5
```

### Generation Performance

**Models ranked by speed** (fastest to slowest):
1. Local Qwen3-Coder 7B (~100 tok/s on M4 Max)
2. GPT-4o-mini (~50-80 tok/s)
3. Gemini 2.5 Flash (~40-60 tok/s)
4. GPT-4o (~30-40 tok/s)
5. Claude Sonnet 4.5 (~25-35 tok/s)

**Models ranked by quality** (highest to lowest):
1. Claude Sonnet 4.5
2. GPT-4o
3. Claude Haiku 3.5 / GPT-4o-mini (tie)
4. Gemini 2.5 Flash
5. Local Qwen3-Coder 30B

## Monitoring & Alerts

### Key Metrics to Track

**Cost metrics**:
- `agro_cost_usd_total` - Total spend
- `rate(agro_cost_usd_total[1h])` - Hourly burn rate
- `rate(agro_tokens_total[1m])` - Token consumption rate

**Performance metrics**:
- `agro_retrieval_latency_seconds` - Retrieval time
- `agro_generation_latency_seconds` - Generation time
- `agro_rerank_score` - Quality indicator

**Quality metrics**:
- Eval accuracy (top-1, top-5)
- Rerank score distribution
- User feedback scores

### Setting Up Alerts

See [Alerting Configuration](alerting.md) for:
- Cost burn alerts ($0.10/hour spike)
- Token consumption alerts (2000+ tokens/min)
- Quality degradation alerts (MRR < 0.6)

## Benchmarking Tools

### Run Your Own Tests

```bash
# Compare with and without RAG
cd /path/to/agro-rag-engine/scripts

# Test RAG performance
./benchmark_rag.sh

# Test without RAG (full file reading)
./benchmark_no_rag.sh
```

### Eval Loop

Track quality over time:

```bash
# Baseline
python -m eval.eval_loop --baseline

# After changes
python -m eval.eval_loop --compare
```

## Real-World Case Study

### Orphaned Loop Incident

**What happened**:
- A background process got stuck calling `/api/chat` every 2 seconds
- Each call reranked 100-200 documents
- Each document ~175 tokens → 3,500 tokens/call
- Loop ran for 2+ days

**Cost impact**:
- Without monitoring: ~$200-300 wasted
- With alerting: Would have fired within 15 minutes

**Lesson**: Always set up alerts (see [Alerting](alerting.md))

## Additional Resources

- **Model Recommendations**: [Model Configuration](models.md)
- **Alerting Setup**: [Alerting](alerting.md)
- **Cost Estimation API**: [API Reference](../api/reference.md#cost--performance)
- **Prometheus Dashboard**: http://localhost:9090

**Last Updated**: October 8, 2025
**Benchmarks**: Subject to change as models evolve
