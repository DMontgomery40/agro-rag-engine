---
sidebar_position: 3
---

# Architecture

AGRO is a production-grade RAG system with a modular architecture designed for code retrieval. This page explains the system components, data flow, and key design decisions.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGRO Architecture                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Claude Code  │      │   Web GUI    │      │  CLI Chat    │
│   (STDIO)    │      │   (HTTP)     │      │   (Local)    │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                ┌────────────▼────────────┐
                │    FastAPI Server       │
                │    (port 8012)          │
                └────────────┬────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐    ┌─────────▼────────┐   ┌──────▼──────┐
   │ LangGraph│    │  Hybrid Search   │   │  Indexer    │
   │ Pipeline │    │  (BM25 + Vector) │   │  (AST)      │
   └────┬─────┘    └─────────┬────────┘   └──────┬──────┘
        │                    │                    │
        │         ┌──────────┼──────────┐        │
        │         │          │          │        │
   ┌────▼────┐ ┌──▼───┐ ┌────▼────┐ ┌───▼────┐  │
   │  Redis  │ │BM25S │ │ Qdrant  │ │Cohere  │  │
   │Checkpts │ │Index │ │ Vectors │ │Rerank  │  │
   └─────────┘ └──────┘ └─────────┘ └────────┘  │
                                                  │
        ┌─────────────────────────────────────────┘
        │
   ┌────▼────────────────────────────────────┐
   │  Observability Stack                    │
   │  ┌──────────┐  ┌──────────┐  ┌────────┐│
   │  │Prometheus│  │ Grafana  │  │LangSmth││
   │  └──────────┘  └──────────┘  └────────┘│
   └─────────────────────────────────────────┘
```

## Core Components

### 1. FastAPI Server (`server/app.py`)

**Role:** HTTP API gateway for all AGRO operations

**Key endpoints:**
- `/answer` - LangGraph RAG pipeline (retrieval + generation + citations)
- `/search` - Hybrid search only (no LLM generation)
- `/api/chat` - Stateful conversation with Redis checkpoints
- `/api/index/*` - Indexing operations
- `/api/golden/*` - Golden test management
- `/api/reranker/*` - Reranker training pipeline
- `/api/docker/*` - Infrastructure management
- `/metrics` - Prometheus metrics

**Technology:**
- FastAPI 0.115+ (async, Pydantic validation)
- Uvicorn ASGI server
- Prometheus client for metrics
- LangTrace for OpenTelemetry tracing

**File location:** `/Users/davidmontgomery/agro-rag-engine/server/app.py`

---

### 2. LangGraph Pipeline (`server/langgraph_app.py`)

**Role:** Stateful RAG workflow with conditional routing

**State machine:**
```python
class RAGState(TypedDict):
    question: str
    documents: Annotated[List[Dict], operator.add]
    generation: str
    iteration: int
    confidence: float
    repo: str
```

**Flow:**
```
Entry → retrieve_node
         ↓
     route_after_retrieval (confidence gating)
         ↓
    ┌────┴────┬─────────────┐
    │         │             │
generate   rewrite    fallback
    │      query          │
    ↓         ↓           ↓
   END    retrieve      END
            (retry)
```

**Confidence gating thresholds:**
- `CONF_TOP1`: 0.62 (top result rerank score)
- `CONF_AVG5`: 0.55 (average of top 5)
- `CONF_ANY`: 0.55 (overall confidence)

If confidence is too low after 3 iterations, fallback message returned.

**Redis checkpoints:**
```python
checkpointer = RedisSaver(redis_url="redis://127.0.0.1:6379/0")
graph = builder.compile(checkpointer=checkpointer)
```

Enables stateful conversation with memory per `thread_id`.

**File location:** `/Users/davidmontgomery/agro-rag-engine/server/langgraph_app.py`

---

### 3. Hybrid Search Engine (`retrieval/hybrid_search.py`)

**Role:** Multi-stage retrieval combining BM25, dense vectors, and semantic cards

**Pipeline stages:**

#### Stage 1: Multi-Query Expansion
```python
def expand_queries(query: str, m: int = 4) -> List[str]:
    """Generate m search-optimized query variants via LLM."""
    # Original query + (m-1) LLM-rewritten variants
    # Expands CamelCase, includes API nouns, removes stop words
```

#### Stage 2: Parallel Retrieval
```python
# BM25 sparse search
bm25_retriever = Retrieve.load("data/agro/bm25_index")
sparse_results = bm25_retriever.retrieve(tokens, k=75)

# Dense vector search (Qdrant)
qclient.query_points(
    collection_name="code_chunks_agro",
    query=embedding,
    limit=75
)

# Semantic cards (conceptual matches)
card_bm25.retrieve(query_tokens, k=20)
```

#### Stage 3: Reciprocal Rank Fusion (RRF)
```python
def rrf(dense: list, sparse: list, k: int = 10, kdiv: int = 60):
    score = defaultdict(float)
    for rank, chunk_id in enumerate(dense, start=1):
        score[chunk_id] += 1.0 / (kdiv + rank)
    for rank, chunk_id in enumerate(sparse, start=1):
        score[chunk_id] += 1.0 / (kdiv + rank)
    return sorted(score.items(), key=lambda x: x[1], reverse=True)[:k]
```

No score normalization needed—rank-based fusion is robust.

#### Stage 4: Cross-Encoder Reranking
```python
# Local reranker (default)
model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
scores = model.predict([(query, doc['code']) for doc in docs])

# Or Cohere Rerank API
cohere.rerank(query=query, documents=[d['code'] for d in docs])
```

#### Stage 5: Contextual Bonuses
```python
# Path boost (+0.06 for prioritized directories)
if any(doc['file_path'].startswith(p) for p in path_boosts):
    doc['score'] += 0.06

# Layer bonus (intent-based, e.g., "gui" query → gui/ files +0.15)
if query_intent == 'gui' and 'gui/' in doc['file_path']:
    doc['score'] += 0.15

# Card hit bonus (+0.08 if matched via semantic card)
if doc['id'] in card_chunk_ids:
    doc['score'] += 0.08

# Language bonus (code vs docs)
if wants_code and doc['language'] in ('python', 'javascript'):
    doc['score'] += 0.50
```

#### Stage 6: Local Hydration
```python
def _hydrate_docs_inplace(repo: str, docs: list[dict]):
    """Load full code from chunks.jsonl (lazy loading)."""
    with open(f'data/{repo}/chunks.jsonl') as f:
        for line in f:
            chunk = json.loads(line)
            if chunk['id'] in needed_ids:
                docs[i]['code'] = chunk['code'][:2000]
```

Qdrant payloads don't include full code (saves memory). Hydration happens after reranking for top-K only.

**File location:** `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py`

---

### 4. AST-Aware Indexer (`retrieval/ast_chunker.py`)

**Role:** Parse code into semantically meaningful chunks

**Supported languages:**
- Python, JavaScript, TypeScript, Go, Java, Rust, C, C++, Bash

**Chunking strategy:**

```python
def chunk_code(src: str, fpath: str, lang: str, target: int = 900) -> List[Dict]:
    """
    AST-aware chunking with overlap.

    - Uses tree-sitter to parse AST
    - Extracts functions, classes, methods
    - Adds imports to each chunk (context)
    - Falls back to greedy chunking if AST fails
    """
```

**Example chunk:**
```json
{
  "id": "abc123",
  "file_path": "server/app.py",
  "start_line": 100,
  "end_line": 120,
  "language": "python",
  "type": "function",
  "name": "health",
  "imports": ["from fastapi import FastAPI", ...],
  "code": "def health():\n    ..."
}
```

**Overlap:** 20 lines between chunks to preserve context.

**File location:** `/Users/davidmontgomery/agro-rag-engine/retrieval/ast_chunker.py`

---

### 5. Vector Database (Qdrant)

**Role:** Store and search dense embeddings

**Docker service:**
```yaml
qdrant:
  image: qdrant/qdrant:v1.15.5
  ports:
    - "6333:6333"  # HTTP API
    - "6334:6334"  # gRPC
  volumes:
    - ../data/qdrant:/qdrant/storage
```

**Collection structure:**
```python
{
  "vectors": {
    "size": 1536,  # OpenAI text-embedding-3-large
    "distance": "Cosine"
  },
  "payload_schema": {
    "file_path": "keyword",
    "language": "keyword",
    "layer": "keyword",
    "repo": "keyword",
    "start_line": "integer",
    "end_line": "integer"
  }
}
```

**Why not store code in payload?**
- Keeps memory usage low (only metadata + vector)
- Code loaded lazily from `chunks.jsonl` after reranking
- Enables larger indexes with same RAM

**File location:** `/Users/davidmontgomery/agro-rag-engine/infra/docker-compose.yml`

---

### 6. BM25 Sparse Index (`bm25s`)

**Role:** Keyword-based retrieval with stemming

**Index creation:**
```python
from bm25s import BM25, Tokenizer
from Stemmer import Stemmer

tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
corpus_tokens = tokenizer.tokenize(corpus)

retriever = BM25()
retriever.index(corpus_tokens)
retriever.save("data/agro/bm25_index")
```

**Search:**
```python
query_tokens = tokenizer.tokenize([query])
ids, scores = retriever.retrieve(query_tokens, k=75)
```

**Why BM25 matters for code:**
- Exact matches for function names, class names, API endpoints
- Handles acronyms, camelCase, snake_case better than embeddings
- Language-agnostic (no training needed)

**File location:** BM25 logic in `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py`

---

### 7. Self-Learning Reranker

**Role:** Train custom cross-encoder on your codebase

**Pipeline:**

```
User Feedback → Triplet Mining → Model Training → Eval → Auto-Promotion
```

**1. Feedback collection:**
```python
# Click tracking (implicit)
POST /api/reranker/click {"query_id": "...", "doc_id": "...", "rank": 3}

# Star ratings (explicit)
POST /api/feedback {"event_id": "...", "signal": "star5"}
```

**2. Triplet mining:**
```python
# From query logs (queries.jsonl)
# Positive: clicked/high-rated docs
# Negative: docs ranked below positive
triplets = [
    ("query", "positive_doc", "negative_doc"),
    ...
]
```

**3. Training:**
```python
from sentence_transformers import CrossEncoder, InputExample
from sentence_transformers.cross_encoder.evaluation import CERerankingEvaluator

model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
train_samples = [
    InputExample(texts=[q, pos], label=1.0),
    InputExample(texts=[q, neg], label=0.0)
]
model.fit(
    train_dataloader=DataLoader(train_samples, batch_size=16),
    epochs=3,
    warmup_steps=100
)
model.save("models/cross-encoder-agro")
```

**4. Evaluation:**
```python
# Run on golden questions
mrr_baseline = 0.72  # Baseline MRR
mrr_reranker = 0.88  # Custom reranker MRR

if mrr_reranker > mrr_baseline * 1.05:
    # Auto-promote (hot-reload, no server restart)
    promote_reranker()
```

**File locations:**
- Training logic: `/Users/davidmontgomery/agro-rag-engine/server/app.py` (`/api/reranker/train`)
- Triplet mining: `/api/reranker/mine`
- Model storage: `/Users/davidmontgomery/agro-rag-engine/models/cross-encoder-agro/`

---

### 8. Semantic Cards

**Role:** High-level summaries for conceptual matches

**Generation:**
```python
# For each chunk, generate summary card via LLM
card = generate_text(
    user_input=f"Summarize this code in one sentence:\n\n{chunk['code']}",
    system_instructions="You summarize code at a high level."
)

# Store in cards.jsonl
{"chunk_id": "abc123", "card": "REST API endpoint for answering questions..."}
```

**Indexing:**
```python
# Build separate BM25 index for cards
card_corpus = [card['card'] for card in cards]
card_bm25 = BM25()
card_bm25.index(tokenizer.tokenize(card_corpus))
card_bm25.save("data/agro/bm25_cards")
```

**Retrieval:**
```python
# Search card index
card_hits = card_bm25.retrieve(query_tokens, k=20)

# Get chunk IDs from matching cards
card_chunk_ids = [cards[hit_id]['chunk_id'] for hit_id in card_hits]

# Boost these chunks in final ranking (+0.08)
```

**Why cards?**
- Capture intent even when code uses different terminology
- Enable "fuzzy" conceptual matches
- Improve recall for high-level queries

**File location:** Card builder in `/Users/davidmontgomery/agro-rag-engine/server/cards_builder.py`

---

### 9. MCP Servers

**Role:** Multi-transport access to RAG (STDIO, HTTP, SSE, WebSocket)

**STDIO (for Claude Code/Codex):**
```json
{
  "mcpServers": {
    "agro": {
      "command": "python",
      "args": ["/path/to/agro/mcp/stdio_server.py"],
      "env": {
        "REPO": "agro"
      }
    }
  }
}
```

**HTTP (for remote agents):**
```bash
# Start server
python mcp/http_server.py --port 8013

# Call from agent
curl -X POST http://127.0.0.1:8013/tools/rag_search \
  -H 'Content-Type: application/json' \
  -d '{"query": "How does indexing work?", "repo": "agro"}'
```

**Tools exposed:**
- `rag_answer`: Full RAG pipeline (retrieval + generation + citations)
- `rag_search`: Retrieval only (no LLM)
- `netlify_deploy`: Deploy docs to Netlify
- `web_get`: Fetch web content

**Per-transport config:**
```python
# STDIO uses local model (free)
STDIO_GENERATION_MODEL=qwen3-coder:30b

# HTTP uses cloud model (cheap)
HTTP_GENERATION_MODEL=gpt-4o-mini
```

**File locations:**
- STDIO: `/Users/davidmontgomery/agro-rag-engine/mcp/stdio_server.py`
- HTTP: `/Users/davidmontgomery/agro-rag-engine/mcp/http_server.py`

---

### 10. Observability Stack

**Prometheus metrics:**
```prometheus
# Request counts
agro_requests_total{route="/answer", model="gpt-4o", success="true"}

# Latency histograms
agro_request_duration_seconds{stage="retrieve"}
agro_request_duration_seconds{stage="rerank"}

# Token usage
agro_tokens_total{role="prompt", provider="openai", model="gpt-4o"}

# Retrieval quality
agro_rr_mrr  # Mean reciprocal rank
agro_retrieval_hits{topk="10"}
```

**Grafana dashboards:**
- Request rates and latency (P50, P95, P99)
- Error rates and alert status
- Token usage and cost estimation
- Retrieval quality (MRR, Hit@K)

**LangSmith tracing:**
```python
# Automatic tracing (via LangTrace)
# View at https://smith.langchain.com/public/{trace_id}

# Embedded in GUI
GET /api/langsmith/latest → share URL
```

**Docker services:**
```yaml
prometheus:
  image: prom/prometheus:latest
  ports: ["9090:9090"]
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:latest
  ports: ["3000:3000"]
  environment:
    - GF_SECURITY_ALLOW_EMBEDDING=true  # For GUI iframe
```

**File location:** `/Users/davidmontgomery/agro-rag-engine/infra/docker-compose.yml`

---

## Data Flow

### Indexing Pipeline

```
Source Code (Python, JS, TS, Go, etc.)
  ↓
AST Chunker (tree-sitter parsing)
  ↓
Chunks (functions, classes with imports)
  ↓
Parallel Processing:
  ├─ BM25 Index (stemmed tokens)
  ├─ Dense Vectors (OpenAI/Voyage/Local embeddings)
  └─ Semantic Cards (LLM-generated summaries)
  ↓
Storage:
  ├─ data/{repo}/chunks.jsonl (full code)
  ├─ data/{repo}/bm25_index/ (BM25S)
  ├─ data/{repo}/bm25_cards/ (Card BM25)
  └─ Qdrant collection (vectors + metadata)
```

**Time:** 10-20 minutes for ~5000 chunks (depends on embedding provider).

**Cost:** $1-5 for embeddings + card generation (cloud models).

---

### Query Pipeline

```
User Query ("How does hybrid search work?")
  ↓
Multi-Query Expansion (LLM)
  ├─ "How does hybrid search work?"
  ├─ "hybrid search implementation"
  ├─ "BM25 and vector fusion algorithm"
  └─ "retrieval pipeline code"
  ↓
Parallel Retrieval (for each variant):
  ├─ BM25 Search (top 75)
  ├─ Dense Vector Search (top 75)
  └─ Semantic Card Search (top 20)
  ↓
Reciprocal Rank Fusion (RRF)
  ↓
Cross-Encoder Reranking (top 100 → scored)
  ↓
Contextual Bonuses (path, layer, language, cards)
  ↓
Local Hydration (load full code for top K)
  ↓
LangGraph Confidence Gating
  ├─ High confidence (≥0.62) → Generate answer
  ├─ Low confidence (<0.55) → Rewrite query and retry
  └─ Still low after 3 retries → Fallback message
  ↓
LLM Generation (with citations)
  ↓
Answer + Documents + Confidence Score
```

**Latency:** 1-3 seconds (local reranker), 500ms-1s (Cohere rerank).

**Tokens:** ~1,141 per query (91% reduction vs file reading).

---

## Key Design Decisions

### 1. Why Hybrid Search (BM25 + Vectors)?

**Problem:** Pure vector search misses exact matches. Pure BM25 misses semantic similarity.

**Solution:** RRF combines both without score normalization headaches.

**Evidence:**
- Top-1 accuracy: 82% (hybrid) vs 68% (dense only) vs 61% (BM25 only)
- MRR: 0.88 (hybrid) vs 0.74 (dense) vs 0.69 (BM25)

---

### 2. Why Lazy Hydration (Load Code After Reranking)?

**Problem:** Storing full code in Qdrant payloads uses 10x more memory.

**Solution:** Store metadata only. Load code from `chunks.jsonl` for top-K after reranking.

**Trade-off:** Extra I/O latency (~50ms) vs 10x memory savings.

---

### 3. Why AST-Aware Chunking?

**Problem:** Naive line-based chunking splits functions mid-way, losing context.

**Solution:** Use tree-sitter to extract functions/classes. Add imports to each chunk.

**Result:** Better retrieval because chunks are semantically complete.

---

### 4. Why Self-Learning Reranker?

**Problem:** Generic rerankers (MS MARCO) aren't optimized for YOUR codebase.

**Solution:** Train a custom cross-encoder on your query logs + golden questions.

**Evidence:** MRR improves from 0.72 (baseline) to 0.88 (custom) on AGRO codebase.

---

### 5. Why Redis for LangGraph Checkpoints?

**Problem:** Stateless chat loses conversation history.

**Solution:** Redis-backed checkpoints enable multi-turn conversation with memory.

**Trade-off:** Requires Redis (but already used for caching).

---

### 6. Why Confidence Gating?

**Problem:** LLMs hallucinate when retrieval quality is poor.

**Solution:** Check rerank scores. If too low, rewrite query or return fallback.

**Result:** Zero hallucinated answers on golden test suite.

---

## Storage Layout

```
agro-rag-engine/
├── data/
│   ├── {repo}/
│   │   ├── chunks.jsonl              # Full code chunks (source of truth)
│   │   ├── cards.jsonl               # Semantic card summaries
│   │   ├── bm25_index/               # BM25S sparse index
│   │   ├── bm25_cards/               # Card BM25 index
│   │   ├── queries.jsonl             # Query logs (for reranker training)
│   │   └── golden.json               # Golden test questions
│   ├── qdrant/                       # Qdrant vector storage (Docker volume)
│   ├── redis/                        # Redis persistence (optional)
│   └── exclude_globs.txt             # Indexing exclusions
├── models/
│   └── cross-encoder-agro/           # Custom reranker model
│       ├── config.json
│       ├── model.safetensors
│       └── tokenizer/
├── gui/
│   ├── index.html                    # GUI entry point
│   ├── js/                           # Vanilla JS modules
│   └── profiles/                     # Saved performance profiles
├── server/
│   ├── app.py                        # FastAPI endpoints
│   └── langgraph_app.py              # LangGraph pipeline
├── retrieval/
│   ├── hybrid_search.py              # Multi-stage retrieval
│   ├── ast_chunker.py                # AST-aware chunking
│   └── rerank.py                     # Cross-encoder reranking
├── mcp/
│   ├── stdio_server.py               # MCP STDIO transport
│   └── http_server.py                # MCP HTTP transport
└── infra/
    ├── docker-compose.yml            # Infrastructure services
    ├── prometheus.yml                # Prometheus config
    ├── grafana/provisioning/         # Pre-configured dashboards
    └── prometheus-alert-rules.yml    # Alerting rules
```

---

## Next Steps

- **[RAG System](../features/rag.md)** - Deep dive into hybrid search
- **[API Endpoints](../api/endpoints.md)** - HTTP API reference
- **[Deployment](../operations/deployment.md)** - Production setup
- **[Troubleshooting](../operations/troubleshooting.md)** - Common issues
