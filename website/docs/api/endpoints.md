---
sidebar_position: 2
---

# HTTP Endpoints

AGRO exposes a comprehensive REST API for retrieval, generation, indexing, evaluation, and system management. All endpoints run on the FastAPI server at `http://127.0.0.1:8012`.

## Core RAG Endpoints

### GET /search

Retrieve relevant code chunks without generating an answer.

**Query Parameters:**
- `q` (string, required): Search query
- `repo` (string, optional): Repository override (default: from env `REPO`)
- `top_k` (integer, optional): Number of results (default: 10)

**Example:**
```bash
curl -s 'http://127.0.0.1:8012/search?q=how+does+hybrid+search+work&repo=agro&top_k=5'
```

**Response:**
```json
{
  "results": [
    {
      "file_path": "retrieval/hybrid_search.py",
      "start_line": 389,
      "end_line": 632,
      "language": "python",
      "rerank_score": 0.87,
      "code": "def search(query: str, repo: str...)...",
      "repo": "agro",
      "card_hit": false
    }
  ],
  "repo": "agro",
  "query": "how does hybrid search work"
}
```

**Use case:** Debugging retrieval, testing reranker performance, building custom UIs.

---

### GET /answer

Generate a full answer using the LangGraph pipeline (retrieval + generation + citations).

**Query Parameters:**
- `q` (string, required): Question
- `repo` (string, optional): Repository override

**Example:**
```bash
curl -s 'http://127.0.0.1:8012/answer?q=how+does+hybrid+search+work&repo=agro'
```

**Response:**
```json
{
  "answer": "AGRO's hybrid search combines BM25 sparse retrieval, dense vector search via Qdrant, and semantic card matching. Results are fused using Reciprocal Rank Fusion (RRF), then reranked by a cross-encoder model...",
  "event_id": "evt_1234567890abcdef"
}
```

**Feedback:** Use the `event_id` with `/api/feedback` to rate answer quality (1-5 stars).

---

### POST /api/chat

Conversational interface with memory (stateful via Redis checkpointing).

**Request Body:**
```json
{
  "question": "How does the reranker work?",
  "repo": "agro"
}
```

**Response:**
```json
{
  "answer": "The reranker uses a cross-encoder model...",
  "documents": [
    {
      "file_path": "retrieval/rerank.py",
      "start_line": 10,
      "end_line": 50,
      "rerank_score": 0.92
    }
  ],
  "repo": "agro",
  "confidence": 0.85,
  "event_id": "evt_..."
}
```

**Difference from /answer:**
- Returns **documents** array (full retrieval results)
- Maintains **conversation state** (Redis-backed LangGraph checkpoints)
- Includes **confidence score**

---

## Feedback & Training

### POST /api/feedback

Submit feedback for an answer to train the learning reranker.

**Request Body:**
```json
{
  "event_id": "evt_1234567890abcdef",
  "signal": "star5",
  "note": "Perfect answer, exactly what I needed"
}
```

**Signals:**
- `star1` through `star5`: Rating (1-5 stars)
- `thumbs_up`, `thumbs_down`: Binary feedback
- `clicked_{doc_id}`: Implicit feedback (click tracking)

**Response:**
```json
{
  "status": "ok",
  "message": "Feedback recorded"
}
```

**Use case:** Build training data for the custom reranker pipeline.

---

## Indexing & Cards

### POST /api/index/start

Start indexing a repository (AST-aware chunking + embeddings + BM25).

**Request Body:**
```json
{
  "repo": "agro",
  "source_dir": "/Users/you/agro-rag-engine",
  "force": false
}
```

**Response:**
```json
{
  "status": "started",
  "job_id": "idx_20250119_123456",
  "estimated_duration_minutes": 15
}
```

**Monitor progress:**
```bash
curl http://127.0.0.1:8012/api/index/status
```

---

### POST /api/cards/build/start

Generate semantic cards (high-level summaries) for all chunks.

**Request Body:**
```json
{
  "repo": "agro"
}
```

**Response:**
```json
{
  "job_id": "card_20250119_123456",
  "status": "queued"
}
```

**Stream logs:**
```bash
curl http://127.0.0.1:8012/api/cards/build/stream/card_20250119_123456
```

**Why cards matter:** They enable retrieval based on high-level concepts even when code doesn't use those exact terms.

---

### GET /api/index/stats

Get indexing statistics for all repositories.

**Response:**
```json
{
  "agro": {
    "chunk_count": 3420,
    "file_count": 287,
    "embedding_dims": 1536,
    "bm25_index_size_mb": 12.4,
    "qdrant_collection": "code_chunks_agro",
    "last_indexed": "2025-01-19T12:34:56Z"
  }
}
```

---

## Evaluation & Golden Tests

### GET /api/golden

List all golden test questions for a repository.

**Query Parameters:**
- `repo` (string, optional): Repository name (default: env `REPO`)

**Response:**
```json
{
  "questions": [
    {
      "question": "How does hybrid search work?",
      "expect_paths": ["retrieval/hybrid_search.py"],
      "top_k": 10
    }
  ]
}
```

---

### POST /api/golden

Add a new golden test question.

**Request Body:**
```json
{
  "question": "How are semantic cards built?",
  "expect_paths": ["server/cards_builder.py"],
  "top_k": 10,
  "repo": "agro"
}
```

---

### POST /api/eval/run

Run evaluation against all golden questions.

**Request Body:**
```json
{
  "repo": "agro",
  "save_baseline": false
}
```

**Response:**
```json
{
  "job_id": "eval_20250119_123456",
  "status": "started"
}
```

**Check results:**
```bash
curl http://127.0.0.1:8012/api/eval/results
```

**Returns:**
```json
{
  "accuracy_top1": 0.82,
  "accuracy_top5": 0.95,
  "mrr": 0.88,
  "failed_questions": ["How does reranker training work?"],
  "total_questions": 25
}
```

---

## Reranker Training

### POST /api/reranker/mine

Mine training triplets from query logs and golden questions.

**Request Body:**
```json
{
  "repo": "agro",
  "min_score_diff": 0.1
}
```

**Response:**
```json
{
  "triplets_mined": 842,
  "saved_to": "/Users/you/agro-rag-engine/data/agro/triplets.json"
}
```

---

### POST /api/reranker/train

Train a custom cross-encoder on mined triplets.

**Request Body:**
```json
{
  "repo": "agro",
  "epochs": 3,
  "batch_size": 16,
  "learning_rate": 2e-5
}
```

**Response:**
```json
{
  "status": "started",
  "job_id": "train_20250119_123456",
  "estimated_duration_minutes": 20
}
```

**Monitor:**
```bash
curl http://127.0.0.1:8012/api/reranker/status
```

---

### POST /api/reranker/evaluate

Evaluate trained reranker against baseline.

**Response:**
```json
{
  "baseline_mrr": 0.72,
  "reranker_mrr": 0.88,
  "improvement": 0.16,
  "promoted": true
}
```

**Auto-promotion:** If reranker beats baseline by >5%, it's automatically deployed (hot-reload, no server restart).

---

## Configuration & Profiles

### GET /api/config

Get current environment configuration.

**Response:**
```json
{
  "REPO": "agro",
  "EMBEDDING_TYPE": "openai",
  "RERANK_BACKEND": "local",
  "TOPK_SPARSE": "75",
  "TOPK_DENSE": "75",
  "QDRANT_URL": "http://127.0.0.1:6333"
}
```

---

### POST /api/config

Update environment variables (persisted to `.env`).

**Request Body:**
```json
{
  "TOPK_SPARSE": "100",
  "TOPK_DENSE": "100",
  "RERANK_BACKEND": "cohere"
}
```

**Response:**
```json
{
  "status": "ok",
  "updated": ["TOPK_SPARSE", "TOPK_DENSE", "RERANK_BACKEND"]
}
```

---

### GET /api/profiles

List all saved performance profiles (e.g., "fast", "accurate", "balanced").

**Response:**
```json
{
  "profiles": [
    {
      "name": "fast",
      "TOPK_SPARSE": "50",
      "TOPK_DENSE": "50",
      "RERANK_BACKEND": "cohere"
    },
    {
      "name": "accurate",
      "TOPK_SPARSE": "100",
      "TOPK_DENSE": "100",
      "RERANK_BACKEND": "local"
    }
  ]
}
```

---

### POST /api/profiles/apply

Apply a saved profile.

**Request Body:**
```json
{
  "name": "fast"
}
```

**Response:**
```json
{
  "status": "applied",
  "profile": "fast"
}
```

---

## Docker & Infrastructure

### GET /api/docker/status

Check Docker daemon status.

**Response:**
```json
{
  "docker_running": true,
  "version": "24.0.7",
  "containers_running": 5
}
```

---

### GET /api/docker/containers

List all AGRO infrastructure containers.

**Response:**
```json
{
  "containers": [
    {
      "id": "abc123",
      "name": "qdrant",
      "status": "running",
      "ports": ["6333:6333", "6334:6334"]
    },
    {
      "id": "def456",
      "name": "agro-grafana",
      "status": "running",
      "ports": ["3000:3000"]
    }
  ]
}
```

---

### POST /api/docker/infra/up

Start all infrastructure containers (Qdrant, Redis, Prometheus, Grafana).

**Response:**
```json
{
  "status": "started",
  "containers": ["qdrant", "rag-redis", "agro-prometheus", "agro-grafana"]
}
```

---

### POST /api/docker/infra/down

Stop all infrastructure containers.

**Response:**
```json
{
  "status": "stopped"
}
```

---

## Monitoring & Metrics

### GET /metrics

Prometheus metrics endpoint (scraped by Prometheus container).

**Response (text/plain):**
```
# HELP agro_requests_total Total requests processed by AGRO
# TYPE agro_requests_total counter
agro_requests_total{route="/answer",provider="openai",model="gpt-4o",success="true"} 142

# HELP agro_request_duration_seconds Request/stage durations in seconds
# TYPE agro_request_duration_seconds histogram
agro_request_duration_seconds_bucket{stage="retrieve",le="0.5"} 120
agro_request_duration_seconds_bucket{stage="rerank",le="0.5"} 85

# HELP agro_tokens_total Token counts by role/provider/model
# TYPE agro_tokens_total counter
agro_tokens_total{role="prompt",provider="openai",model="gpt-4o"} 45678
agro_tokens_total{role="completion",provider="openai",model="gpt-4o"} 12345
```

**Grafana dashboards:** Pre-configured to visualize these metrics at `http://127.0.0.1:3000`.

---

### GET /api/monitoring/alerts

List active Prometheus alerts.

**Response:**
```json
{
  "alerts": [
    {
      "name": "HighErrorRate",
      "severity": "warning",
      "status": "firing",
      "value": 0.12,
      "threshold": 0.10,
      "description": "Error rate above 10% for 5 minutes"
    }
  ]
}
```

---

## LangSmith Tracing

### GET /health/langsmith

Check LangSmith connection status.

**Response:**
```json
{
  "enabled": true,
  "installed": true,
  "project": "agro-dev",
  "endpoint": "https://api.smith.langchain.com",
  "key_present": true,
  "can_connect": true,
  "identity": {
    "user_id": "user_abc123",
    "tenant_id": "tenant_xyz789"
  }
}
```

---

### GET /api/langsmith/latest

Get the latest LangSmith trace URL for embedding in the GUI.

**Query Parameters:**
- `project` (string, optional): LangSmith project name
- `share` (boolean, optional): Generate public share URL (default: true)

**Response:**
```json
{
  "project": "agro-dev",
  "url": "https://smith.langchain.com/public/abc123/r/def456",
  "source": "remote"
}
```

**Use case:** Embed LangSmith traces in the GUI for debugging LLM calls.

---

## MCP Server Management

### GET /api/mcp/status

Check MCP server status (all transports).

**Response:**
```json
{
  "stdio": {
    "enabled": true,
    "config_path": "/Users/you/.config/claude/mcp.json"
  },
  "http": {
    "enabled": true,
    "url": "http://127.0.0.1:8013",
    "status": "running"
  },
  "sse": {
    "enabled": false
  },
  "websocket": {
    "enabled": false
  }
}
```

---

### POST /api/mcp/http/start

Start the HTTP MCP server on port 8013.

**Request Body:**
```json
{
  "port": 8013
}
```

**Response:**
```json
{
  "status": "started",
  "url": "http://127.0.0.1:8013"
}
```

---

### POST /api/mcp/http/stop

Stop the HTTP MCP server.

**Response:**
```json
{
  "status": "stopped"
}
```

---

## Cost Estimation

### POST /api/cost/estimate

Estimate indexing cost for a repository.

**Request Body:**
```json
{
  "source_dir": "/Users/you/my-repo",
  "embedding_model": "text-embedding-3-large",
  "generation_model": "gpt-4o"
}
```

**Response:**
```json
{
  "estimated_chunks": 4200,
  "estimated_files": 320,
  "embedding_cost_usd": 1.42,
  "card_generation_cost_usd": 8.75,
  "total_cost_usd": 10.17,
  "duration_estimate_minutes": 18
}
```

---

### POST /api/cost/estimate_pipeline

Estimate cost for full RAG pipeline (index + query + cards).

**Response:**
```json
{
  "indexing_cost_usd": 10.17,
  "query_cost_per_100_usd": 0.42,
  "monthly_estimate_500_queries_usd": 12.27
}
```

---

## Editor & Onboarding

### GET /editor

Serve the embedded VS Code editor (if enabled).

**URL:** `http://127.0.0.1:8012/editor`

**Requirements:**
- VS Code Server installed locally
- `CODE_SERVER_PORT=8444` in `.env`

---

### GET /api/onboarding/state

Check if onboarding wizard has been completed.

**Response:**
```json
{
  "completed": false,
  "steps": {
    "add_repo": false,
    "run_index": false,
    "test_retrieval": false,
    "configure_mcp": false
  }
}
```

---

### POST /api/onboarding/complete

Mark onboarding as complete (hides wizard).

**Response:**
```json
{
  "status": "ok"
}
```

---

## Health & Diagnostics

### GET /health

Comprehensive health check for all AGRO components.

**Response:**
```json
{
  "status": "healthy",
  "graph_loaded": true,
  "ts": "2025-01-19T12:34:56.789Z",
  "checks": {
    "qdrant": "healthy",
    "redis": "healthy",
    "prometheus": "healthy",
    "grafana": "healthy"
  }
}
```

---

### GET /api/frequency/stats

Get API request frequency statistics (anomaly detection).

**Response:**
```json
{
  "requests_per_minute": 3.2,
  "anomaly_detected": false,
  "top_routes": [
    {"/search": 120},
    {"/answer": 85},
    {"/api/config": 12}
  ]
}
```

**Use case:** Detect orphaned loops, bots, or runaway scripts.

---

## Authentication & Security

**Note:** AGRO is designed for **local development** and assumes a trusted network. Production deployments should add:

- **API key authentication** (use FastAPI middleware)
- **Rate limiting** (per-IP throttling)
- **TLS/HTTPS** (reverse proxy with Nginx/Caddy)

**Environment variables for security:**
```bash
# Optional: Require API key for all endpoints
AGRO_API_KEY=your-secret-key

# Optional: Enable CORS for specific origins
AGRO_CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Collection 'code_chunks_agro' not found. Run indexing first.",
  "error_type": "IndexNotFoundError",
  "status_code": 404
}
```

**Common errors:**
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Collection/repo doesn't exist
- `500 Internal Server Error`: Server-side failure (check logs)
- `503 Service Unavailable`: Qdrant/Redis down

---

## Rate Limits

**Default limits (configurable):**
- `/search`: 60 requests/minute
- `/answer`: 30 requests/minute
- `/api/reranker/train`: 1 request/hour

**Override in `.env`:**
```bash
RATE_LIMIT_SEARCH=100
RATE_LIMIT_ANSWER=50
```

---

## Next Steps

- **[MCP Tools](mcp-tools.md)** - Use AGRO from Claude Code/Codex
- **[RAG System](../features/rag.md)** - Understand hybrid search internals
- **[Deployment](../operations/deployment.md)** - Deploy AGRO to production
- **[Monitoring](../operations/monitoring.md)** - Set up Grafana dashboards
