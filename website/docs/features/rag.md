---
sidebar_position: 1
---

# RAG System

AGRO's hybrid search architecture combines three retrieval methods, applies learned reranking, and uses confidence gating to prevent hallucination. This isn't "just throw it at a vector database" - it's a production-grade pipeline built for code retrieval.

## Architecture Overview

```
Query Input
  ↓
Multi-Query Expansion (4 variants)
  ↓
Parallel Retrieval:
  ├─ BM25 Sparse Search (keyword matching)
  ├─ Dense Vector Search (semantic similarity via Qdrant)
  └─ Semantic Cards (high-level file summaries)
  ↓
Reciprocal Rank Fusion (RRF)
  ↓
Cross-Encoder Reranking (learned model)
  ↓
Scoring Bonuses (path, layer, language, card hits)
  ↓
Confidence Gating & Local Hydration
  ↓
Top-K Results with Citations
```

## Hybrid Search Components

### 1. Multi-Query Expansion

AGRO rewrites your query into multiple search-friendly variants to improve recall:

```python
# Original query
"How are fax jobs created?"

# Expanded variants (generated via LLM)
[
  "How are fax jobs created?",
  "fax job creation workflow",
  "fax job initialization and dispatch",
  "create new fax job API"
]
```

Each variant searches independently, then results are fused via RRF.

**Configuration:**
- `expand_queries(query, m=4)` in `retrieval/hybrid_search.py`
- Controlled by `m` parameter (default: 4 variants)
- Disable: set `m=1`

### 2. BM25 Sparse Retrieval

BM25S indexes use **stemmed tokens** with stopword removal for precise keyword matching:

```python
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer

tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
tokens = tokenizer.tokenize([query])
ids, scores = retriever.retrieve(tokens, k=75)
```

**Why BM25 matters for code:**
- Exact matches for function names, class names, API endpoints
- Handles acronyms, camelCase, snake_case better than embeddings
- Language-agnostic (works on any text)

**Index location:** `data/{repo}/bm25_index/`

**Tuning:**
- `TOPK_SPARSE=75` (default, set in `.env`)
- Higher = more recall, slower reranking

### 3. Dense Vector Search (Qdrant)

Semantic embeddings capture meaning beyond keywords:

```python
# Get query embedding
embedding = _get_embedding(query, kind="query")

# Search Qdrant collection
results = qc.query_points(
    collection_name=f'code_chunks_{repo}',
    query=embedding,
    using='dense',
    limit=75
)
```

**Embedding providers:**
- **OpenAI**: `text-embedding-3-large` (1536-dim, $0.00013/1k tokens)
- **Voyage AI**: `voyage-code-3` (512-dim, $0.00012/1k tokens, code-optimized)
- **Local**: Sentence Transformers (`BAAI/bge-small-en-v1.5`, free)

**Configuration:**
- `EMBEDDING_TYPE=openai|voyage|local` (`.env`)
- `TOPK_DENSE=75` (`.env`)

**Collection structure:**
```python
{
  "id": "agro_chunk_1234",
  "vector": [0.123, -0.456, ...],  # 1536-dim for OpenAI
  "payload": {
    "file_path": "server/app.py",
    "start_line": 100,
    "end_line": 120,
    "language": "python",
    "layer": "server",
    "repo": "agro",
    "hash": "abc123..."
  }
}
```

### 4. Semantic Cards Retrieval

AGRO generates **high-level summaries** (cards) for each chunk, then indexes those with BM25. This captures conceptual matches even when code uses different terminology:

**Example:**
```python
# Chunk: server/app.py:100-120 (FastAPI endpoint)
# Card summary:
"REST API endpoint for answering questions using LangGraph pipeline.
Accepts question and repo parameters, returns answer with citations."
```

When you search "how does the answer API work", the card summary matches even if the code doesn't mention those exact terms.

**Implementation:**
- Cards stored in `data/{repo}/cards.jsonl`
- BM25 index at `data/{repo}/bm25_cards/`
- Chunks from matching cards get **+0.08 score bonus**

**Build cards:**
```bash
curl -X POST http://127.0.0.1:8012/api/cards/build/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro"}'
```

## Reciprocal Rank Fusion (RRF)

RRF combines BM25 and dense results **without needing score normalization**:

```python
def rrf(dense: list, sparse: list, k: int = 10, kdiv: int = 60):
    score = defaultdict(float)
    for rank, chunk_id in enumerate(dense, start=1):
        score[chunk_id] += 1.0 / (kdiv + rank)
    for rank, chunk_id in enumerate(sparse, start=1):
        score[chunk_id] += 1.0 / (kdiv + rank)
    return sorted(score.items(), key=lambda x: x[1], reverse=True)[:k]
```

**Why RRF?**
- No score calibration needed (BM25 scores ≠ cosine similarity scores)
- Robust to outliers (one method can't dominate)
- Simple, fast, battle-tested

**Tuning:**
- `kdiv=60` (default, controls rank smoothing)
- Higher `kdiv` = less weight on top results

## Cross-Encoder Reranking

After RRF, AGRO applies a **learned cross-encoder** that scores query-document pairs:

```python
from retrieval.rerank import rerank_results

docs = rerank_results(query, candidates, top_k=10)
```

**Reranker backends:**

### Local Cross-Encoder (Default)
```python
# Uses sentence-transformers cross-encoder
model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
scores = model.predict([(query, doc['code']) for doc in docs])
```

**Pros:** Free, private, customizable (train on your code)
**Cons:** Slower than API rerankers

### Cohere Rerank API
```python
# Set RERANK_BACKEND=cohere in .env
# Uses rerank-3.5 model
```

**Pros:** Fast, state-of-the-art accuracy
**Cons:** $2/1k searches (~$0.002/query)

### Custom Trained Reranker

AGRO includes a **self-learning pipeline** that trains a custom reranker on YOUR codebase:

```bash
# 1. Collect feedback (happens automatically via GUI clicks)
# 2. Mine triplets from logs
curl -X POST http://127.0.0.1:8012/api/reranker/mine

# 3. Train model
curl -X POST http://127.0.0.1:8012/api/reranker/train \
  -H 'Content-Type: application/json' \
  -d '{"epochs": 3, "batch_size": 16}'

# 4. Evaluate
curl -X POST http://127.0.0.1:8012/api/reranker/evaluate

# 5. Deploy (hot-reload, no server restart)
# Happens automatically if training beats baseline
```

See [Learning Reranker](learning-reranker.md) for details.

## Scoring Bonuses

After reranking, AGRO applies **contextual bonuses** to boost relevant results:

### Query Intent Classification

```python
def _classify_query(q: str) -> str:
    """Classify query intent for layer bonuses."""
    if 'gui' in q or 'dashboard' in q: return 'gui'
    if 'search' in q or 'bm25' in q: return 'retrieval'
    if 'index' in q or 'chunk' in q: return 'indexer'
    if 'eval' in q or 'test' in q: return 'eval'
    if 'docker' in q or 'grafana' in q: return 'infra'
    return 'server'
```

### Layer Bonuses (Configurable via GUI)

Boost results from directories matching the query intent:

```python
# Example: "How does hybrid search work?" → intent='retrieval'
layer_bonuses = {
    'retrieval': {'retrieval': +0.15, 'server': +0.05},
    'gui': {'gui': +0.15, 'server': +0.05},
    'indexer': {'indexer': +0.15, 'retrieval': +0.08},
}
```

Configured per-repo in `repos.json` or GUI Settings → Profiles.

### Path Bonuses

Boost specific directories:

```python
# Configured via repos.json or GUI
path_boosts = ['server/', 'api/', 'retrieval/']  # +0.06 each
```

### Language Bonuses (Code vs Docs)

For queries like "where is the implementation", heavily boost code files:

```python
if wants_code:
    if lang in ('python', 'javascript', 'typescript', 'go', 'rust'):
        score += 0.50  # Massive boost
    elif lang in ('markdown', 'md', 'rst', 'txt'):
        score -= 0.50  # Massive penalty
```

### Card Hit Bonus

If a chunk was retrieved via semantic card matching:

```python
if chunk_id in card_chunk_ids:
    score += 0.08
```

## Confidence Gating

AGRO tracks **retrieval confidence** to prevent hallucination:

```python
# In LangGraph pipeline
if state["confidence"] < 0.3:
    return {"generation": "I don't have enough context to answer that."}
```

**Confidence sources:**
1. **Top rerank score** (primary signal)
2. **Score gap** between #1 and #2 result
3. **Number of high-confidence results** (score > 0.5)

**Configuration:**
- Threshold tunable in GUI Settings → Performance
- Default: 0.3 (conservative)

## Local Hydration

To save memory, Qdrant payloads **don't include full code**. AGRO hydrates chunks lazily:

```python
def _hydrate_docs_inplace(repo: str, docs: list[dict]):
    """Load full code from chunks.jsonl for top-k results only."""
    needed_ids = {d['id'] for d in docs if not d.get('code')}

    # Stream chunks.jsonl, load only needed chunks
    with open(f'data/{repo}/chunks.jsonl') as f:
        for line in f:
            chunk = json.loads(line)
            if chunk['id'] in needed_ids:
                # Truncate to max_chars (default: 2000)
                docs[i]['code'] = chunk['code'][:2000]
```

**Modes:**
- `HYDRATION_MODE=lazy` (default): Load code after retrieval
- `HYDRATION_MODE=eager`: Store code in Qdrant (higher memory)
- `HYDRATION_MODE=none`: Never load code (metadata only)

**Tuning:**
- `HYDRATION_MAX_CHARS=2000` (default, per chunk)

## Performance Tuning

### Recall vs Latency

```bash
# High recall (slower, more candidates for reranking)
TOPK_SPARSE=100
TOPK_DENSE=100

# Fast (fewer candidates, risk missing relevant chunks)
TOPK_SPARSE=50
TOPK_DENSE=50
```

### Multi-Query Expansion

```bash
# More variants = better recall, higher cost
# Each variant runs full retrieval pipeline
export QUERY_EXPANSION_COUNT=4  # default

# Disable for speed
export QUERY_EXPANSION_COUNT=1
```

### Reranker Selection

| Backend | Latency | Cost | Accuracy |
|---------|---------|------|----------|
| Local (MiniLM) | ~200ms | $0 | Good |
| Custom trained | ~150ms | $0 | Excellent (on your code) |
| Cohere rerank-3.5 | ~50ms | $0.002/query | Excellent (general) |

## Observability

### LangTrace Spans

AGRO instruments the full pipeline with OpenTelemetry:

```
agro.vector_search (50ms)
agro.bm25_search (30ms)
agro.rrf_fusion (5ms)
agro.cross_encoder_rerank (200ms)
```

View in LangSmith or any OTEL-compatible backend.

### Prometheus Metrics

```
agro_request_duration_seconds{stage="retrieve"}
agro_request_duration_seconds{stage="rerank"}
agro_retrieval_hits{topk="10"}
agro_rr_mrr
```

Grafana dashboards included (see [Monitoring](../operations/monitoring.md)).

## Troubleshooting

### "No results found"

1. **Check index exists:**
   ```bash
   ls data/agro/bm25_index/
   ls data/agro/  # Should have chunks.jsonl
   ```

2. **Check Qdrant collection:**
   ```bash
   curl http://127.0.0.1:6333/collections/code_chunks_agro
   ```

3. **Test BM25 directly:**
   ```python
   from retrieval.hybrid_search import search
   docs = search("test", repo="agro", final_k=10)
   print(len(docs))
   ```

### "Results are wrong"

1. **Check discriminative keywords** (may be boosting wrong files):
   ```bash
   cat discriminative_keywords.json
   # If boosting test files, regenerate with exclude patterns
   ```

2. **Adjust layer bonuses** in GUI Settings → Profiles

3. **Train custom reranker** on your golden questions:
   ```bash
   # Add golden questions in GUI Evals tab
   # Train reranker on them
   ```

### "Embeddings failing"

```bash
# Check API key
echo $OPENAI_API_KEY

# Test embedding directly
curl http://127.0.0.1:8012/health

# Switch to local embeddings
export EMBEDDING_TYPE=local
```

## Configuration Reference

**Environment variables:**

```bash
# Retrieval
TOPK_SPARSE=75
TOPK_DENSE=75
QUERY_EXPANSION_COUNT=4

# Embeddings
EMBEDDING_TYPE=openai  # openai|voyage|local
OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=...

# Reranking
RERANK_BACKEND=local  # local|cohere
COHERE_API_KEY=...

# Hydration
HYDRATION_MODE=lazy  # lazy|eager|none
HYDRATION_MAX_CHARS=2000

# Confidence
CONFIDENCE_THRESHOLD=0.3

# Vector database
QDRANT_URL=http://127.0.0.1:6333
COLLECTION_NAME=code_chunks_agro
```

**Per-repo settings** (via GUI or `repos.json`):

```json
{
  "agro": {
    "layer_bonuses": {
      "retrieval": {"retrieval": 0.15, "server": 0.05}
    },
    "path_boosts": ["server/", "retrieval/", "api/"],
    "exclude_patterns": ["tests/", "*.md"]
  }
}
```

## Next Steps

- **[API Endpoints](../api/endpoints.md)** - Use hybrid search via REST API
- **[Learning Reranker](learning-reranker.md)** - Train a custom model on your code
- **[Configuration](../configuration/filtering.md)** - Tune filtering and exclusions
- **[Monitoring](../operations/monitoring.md)** - Track retrieval quality with Grafana
