# AGRO API Reference

**Base URL:** `http://127.0.0.1:8012`

**Interactive Docs:**
- Swagger UI: http://127.0.0.1:8012/docs
- ReDoc: http://127.0.0.1:8012/redoc

All endpoints return JSON unless otherwise specified. The API is designed for local-first use and binds to `127.0.0.1` by default.

---

## Table of Contents

- [RAG Operations](#rag-operations)
- [Configuration & Management](#configuration--management)
- [Indexing & Data](#indexing--data)
- [Cost & Performance](#cost--performance)
- [Evaluation](#evaluation)
- [Observability](#observability)
- [MCP Wrapper Endpoints](#mcp-wrapper-endpoints)

---

## RAG Operations

### GET `/answer`

Full RAG pipeline: retrieval → reranking → generation with citations.

**Query Parameters:**
- `q` (string, required) - The question to answer
- `repo` (string, optional) - Repository name (defaults to `REPO` env var)
- `top_k` (integer, optional) - Number of results to retrieve (default: 10)

**Response:**
```json
{
  "answer": "[repo: agro]\n\nOAuth tokens are validated in the `auth/middleware.py` file...",
  "citations": [
    "auth/middleware.py:45-67",
    "server/auth.py:120-145"
  ],
  "repo": "agro",
  "confidence": 0.78,
  "retrieval_count": 5
}
```

**Example:**
```bash
curl "http://127.0.0.1:8012/answer?q=Where%20is%20OAuth%20validated&repo=agro"
```

---

### GET `/search`

Retrieval only (no generation). Returns ranked code chunks with rerank scores.

**Query Parameters:**
- `q` (string, required) - Search query
- `repo` (string, optional) - Repository name
- `top_k` (integer, optional) - Number of results (default: 10)

**Response:**
```json
{
  "results": [
    {
      "file_path": "auth/middleware.py",
      "start_line": 45,
      "end_line": 67,
      "language": "python",
      "rerank_score": 0.85,
      "layer": "server",
      "repo": "agro",
      "code": "def validate_oauth_token(token: str):\n    ..."
    }
  ],
  "repo": "agro",
  "count": 5,
  "query": "Where is OAuth validated"
}
```

**Example:**
```bash
curl "http://127.0.0.1:8012/search?q=authentication&repo=agro&top_k=5"
```

---

### POST `/api/chat`

Multi-turn conversational chat with memory and context.

**Request Body:**
```json
{
  "message": "How does the indexer work?",
  "repo": "agro",
  "thread_id": "user-session-123",
  "stream": false
}
```

**Response:**
```json
{
  "answer": "The indexer in AGRO works by...",
  "citations": ["indexer/index_repo.py:45-120"],
  "thread_id": "user-session-123",
  "turn_count": 3
}
```

**Streaming Response (SSE):**

Set `"stream": true` to get Server-Sent Events:

```bash
curl -X POST http://127.0.0.1:8012/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain indexing","repo":"agro","stream":true}' \
  --no-buffer
```

---

## Configuration & Management

### GET `/api/config`

Get current environment configuration and repository settings.

**Response:**
```json
{
  "env": {
    "GEN_MODEL": "gpt-4o-mini",
    "EMBEDDING_TYPE": "openai",
    "RERANK_BACKEND": "cohere",
    "REPO": "agro",
    "MQ_REWRITES": 4
  },
  "repos": {
    "default_repo": "agro",
    "repos": [
      {
        "name": "agro",
        "path": ["/Users/user/agro"],
        "enabled": true,
        "keywords": ["rag", "retrieval", "hybrid"]
      }
    ]
  }
}
```

**Example:**
```bash
curl http://127.0.0.1:8012/api/config
```

---

### POST `/api/config`

Update configuration (writes to `.env` and `repos.json`).

**Request Body:**
```json
{
  "env": {
    "GEN_MODEL": "gpt-4o",
    "RERANK_BACKEND": "local",
    "MQ_REWRITES": 6
  },
  "repos": {
    "default_repo": "agro"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "updated": ["GEN_MODEL", "RERANK_BACKEND", "MQ_REWRITES"],
  "requires_restart": false,
  "requires_reindex": false
}
```

---

### GET `/api/profiles`

List all saved configuration profiles.

**Response:**
```json
{
  "profiles": [
    {
      "name": "fast-local",
      "description": "BM25-only, local models",
      "settings": {
        "GEN_MODEL": "qwen3-coder:14b",
        "EMBEDDING_TYPE": "local",
        "RERANK_BACKEND": "local"
      }
    },
    {
      "name": "high-quality",
      "description": "Full hybrid, OpenAI models",
      "settings": {
        "GEN_MODEL": "gpt-4o",
        "EMBEDDING_TYPE": "openai",
        "RERANK_BACKEND": "cohere"
      }
    }
  ]
}
```

---

### POST `/api/profiles/save`

Save current config as a named profile.

**Request Body:**
```json
{
  "name": "my-profile",
  "description": "Custom settings for X",
  "settings": {
    "GEN_MODEL": "gpt-4o-mini",
    "RERANK_BACKEND": "cohere"
  }
}
```

---

### POST `/api/profiles/apply`

Apply a saved profile (updates env vars).

**Request Body:**
```json
{
  "name": "high-quality"
}
```

**Response:**
```json
{
  "ok": true,
  "applied": "high-quality",
  "updated_keys": ["GEN_MODEL", "EMBEDDING_TYPE", "RERANK_BACKEND"]
}
```

---

## Indexing & Data

### POST `/api/index/start`

Start indexing a repository (async operation).

**Query Parameters:**
- `repo` (string, optional) - Repository name

**Response:**
```json
{
  "status": "started",
  "repo": "agro",
  "job_id": "idx-20251013-123456",
  "message": "Indexing started in background"
}
```

**Example:**
```bash
curl -X POST "http://127.0.0.1:8012/api/index/start?repo=agro"
```

---

### GET `/api/index/status`

Check indexing job status.

**Response:**
```json
{
  "status": "running",
  "repo": "agro",
  "progress": {
    "files_processed": 234,
    "files_total": 567,
    "chunks_created": 1234,
    "elapsed_seconds": 45
  },
  "message": "Processing files..."
}
```

---

### POST `/api/cards/build/start`

Build semantic cards (high-level summaries) for a repo.

**Query Parameters:**
- `repo` (string, optional) - Repository name
- `enrich` (integer, optional) - Enable enrichment with LLM (1=yes, 0=no, default: 1)

**Response:**
```json
{
  "job_id": "cards-abc123",
  "status": "started",
  "repo": "agro",
  "stream_url": "/api/cards/build/stream/cards-abc123"
}
```

---

### GET `/api/cards/build/stream/{job_id}`

Stream card building progress (SSE).

**Response (Server-Sent Events):**
```
event: progress
data: {"files_processed": 10, "total": 100, "message": "Processing auth/"}

event: card
data: {"file": "auth/oauth.py", "card": "OAuth token validation..."}

event: complete
data: {"total_cards": 45, "elapsed": 123}
```

**Example:**
```bash
curl -N http://127.0.0.1:8012/api/cards/build/stream/cards-abc123
```

---

### GET `/api/cards`

List all semantic cards for a repo.

**Query Parameters:**
- `repo` (string, optional) - Repository name

**Response:**
```json
{
  "repo": "agro",
  "cards": [
    {
      "file_path": "auth/oauth.py",
      "summary": "OAuth 2.0 token validation and refresh logic",
      "keywords": ["oauth", "token", "validation", "auth"]
    }
  ],
  "count": 45
}
```

---

## Cost & Performance

### POST `/api/cost/estimate`

Estimate costs for a given configuration.

**Request Body:**
```json
{
  "gen_provider": "openai",
  "gen_model": "gpt-4o-mini",
  "embed_provider": "openai",
  "embed_model": "text-embedding-3-large",
  "rerank_provider": "cohere",
  "rerank_model": "rerank-3.5",
  "tokens_in": 1000,
  "tokens_out": 500,
  "embeds": 100,
  "reranks": 50,
  "requests_per_day": 100
}
```

**Response:**
```json
{
  "daily_cost": 2.45,
  "monthly_cost": 73.50,
  "breakdown": {
    "generation": 1.20,
    "embeddings": 0.80,
    "reranking": 0.45
  },
  "per_request": 0.0245
}
```

---

### POST `/api/cost/estimate_pipeline`

Full pipeline cost estimate based on actual usage patterns.

**Request Body:**
```json
{
  "repo": "agro",
  "queries_per_day": 50,
  "avg_chunks_per_query": 10,
  "avg_output_tokens": 300
}
```

**Response:**
```json
{
  "daily": 5.67,
  "monthly": 170.10,
  "yearly": 2068.55,
  "breakdown": {
    "retrieval": 1.20,
    "reranking": 0.80,
    "generation": 3.67
  }
}
```

---

### GET `/api/prices`

Get model pricing database.

**Response:**
```json
{
  "models": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "unit": "1k_tokens",
      "input_cost": 0.000150,
      "output_cost": 0.000600
    },
    {
      "provider": "cohere",
      "model": "rerank-3.5",
      "unit": "1k_searches",
      "rerank_per_1k": 2.00
    }
  ]
}
```

---

### POST `/api/prices/upsert`

Add or update model pricing.

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "unit": "1k_tokens",
  "input_cost": 0.0025,
  "output_cost": 0.010
}
```

---

## Evaluation

### GET `/api/golden`

List all golden test questions.

**Response:**
```json
{
  "tests": [
    {
      "q": "Where is OAuth validated?",
      "repo": "agro",
      "expect_paths": ["auth", "oauth", "token"]
    }
  ],
  "count": 10
}
```

---

### POST `/api/golden`

Add a new golden test.

**Request Body:**
```json
{
  "q": "How does the reranker work?",
  "repo": "agro",
  "expect_paths": ["rerank", "retrieval"]
}
```

---

### PUT `/api/golden/{index}`

Update an existing golden test.

**Request Body:**
```json
{
  "q": "Where is OAuth token validated?",
  "repo": "agro",
  "expect_paths": ["auth", "oauth", "token", "validation"]
}
```

---

### DELETE `/api/golden/{index}`

Delete a golden test by index.

**Response:**
```json
{
  "ok": true,
  "deleted_index": 2,
  "remaining_count": 9
}
```

---

### POST `/api/golden/test`

Test a single question without adding to golden set.

**Request Body:**
```json
{
  "q": "How does indexing work?",
  "repo": "agro",
  "expect_paths": ["index", "chunk"]
}
```

**Response:**
```json
{
  "hit": true,
  "results": [
    {
      "file_path": "indexer/index_repo.py",
      "rerank_score": 0.85
    }
  ],
  "matched_paths": ["index"]
}
```

---

### POST `/api/eval/run`

Run full evaluation suite.

**Request Body (optional):**
```json
{
  "save_baseline": false,
  "compare_to_baseline": false
}
```

**Response:**
```json
{
  "total_questions": 10,
  "top1_accuracy": 0.70,
  "top5_accuracy": 0.90,
  "duration_seconds": 15.4,
  "results": [
    {
      "question": "Where is OAuth validated?",
      "hit_top1": true,
      "hit_top5": true,
      "top_result": "auth/oauth.py"
    }
  ]
}
```

---

### GET `/api/eval/results`

Get latest evaluation results.

**Response:**
```json
{
  "timestamp": "2025-10-13T12:34:56Z",
  "accuracy": {
    "top1": 0.70,
    "top5": 0.90
  },
  "duration": 15.4,
  "total": 10
}
```

---

### POST `/api/eval/baseline/save`

Save current eval results as baseline for regression tracking.

**Response:**
```json
{
  "ok": true,
  "saved_at": "2025-10-13T12:34:56Z",
  "baseline_file": "eval_baseline.json"
}
```

---

### GET `/api/eval/baseline/compare`

Compare current eval against saved baseline.

**Response:**
```json
{
  "baseline": {
    "top1": 0.70,
    "top5": 0.90
  },
  "current": {
    "top1": 0.65,
    "top5": 0.88
  },
  "diff": {
    "top1": -0.05,
    "top5": -0.02
  },
  "regressions": [
    {
      "question": "How does reranking work?",
      "was_hit": true,
      "now_hit": false
    }
  ]
}
```

---

## Observability

### GET `/health`

Service health check.

**Response:**
```json
{
  "status": "healthy",
  "graph_loaded": true,
  "ts": "2025-10-13T12:34:56Z"
}
```

---

### GET `/health/langsmith`

LangSmith integration status.

**Response:**
```json
{
  "enabled": true,
  "installed": true,
  "project": "agro-rag",
  "endpoint": "https://api.smith.langchain.com",
  "key_present": true,
  "can_connect": true,
  "identity": {
    "user_id": "abc123",
    "org_id": "org-xyz"
  }
}
```

---

### GET `/api/traces`

List recent retrieval traces.

**Query Parameters:**
- `repo` (string, optional) - Filter by repository
- `limit` (integer, optional) - Number of traces (default: 20)

**Response:**
```json
{
  "traces": [
    {
      "query": "Where is OAuth validated?",
      "repo": "agro",
      "timestamp": "2025-10-13T12:34:56Z",
      "retrieval_count": 5,
      "top_score": 0.85,
      "duration_ms": 234
    }
  ],
  "count": 10
}
```

---

### GET `/api/traces/latest`

Get the most recent trace.

**Response:**
```json
{
  "query": "How does indexing work?",
  "repo": "agro",
  "results": [
    {
      "file_path": "indexer/index_repo.py",
      "rerank_score": 0.85,
      "layer": "indexer"
    }
  ],
  "duration_ms": 234
}
```

---

### GET `/api/langsmith/latest`

Get latest LangSmith runs.

**Query Parameters:**
- `limit` (integer, optional) - Number of runs (default: 10)

**Response:**
```json
{
  "runs": [
    {
      "id": "run-abc123",
      "name": "rag_search",
      "status": "success",
      "start_time": "2025-10-13T12:34:56Z",
      "end_time": "2025-10-13T12:34:58Z",
      "duration_ms": 2000
    }
  ]
}
```

---

### GET `/api/langsmith/runs`

Query LangSmith runs with filters.

**Query Parameters:**
- `project` (string, optional) - Project name
- `status` (string, optional) - Filter by status (success, error)
- `limit` (integer, optional) - Number of results (default: 20)

---

## MCP Wrapper Endpoints

These endpoints provide HTTP access to MCP tools for remote agents.

### GET `/api/mcp/rag_search`

MCP `rag_search` tool via HTTP.

**Query Parameters:**
- `repo` (string, required) - Repository name
- `question` (string, required) - Search query
- `top_k` (integer, optional) - Number of results (default: 10)

**Response:**
```json
{
  "results": [
    {
      "file_path": "auth/oauth.py",
      "start_line": 45,
      "end_line": 67,
      "rerank_score": 0.85
    }
  ],
  "count": 5,
  "repo": "agro"
}
```

**Example:**
```bash
curl "http://127.0.0.1:8012/api/mcp/rag_search?repo=agro&question=OAuth%20validation&top_k=5"
```

---

## Additional Resources

- **Interactive API Docs:** http://127.0.0.1:8012/docs (Swagger UI)
- **Alternative Docs:** http://127.0.0.1:8012/redoc (ReDoc)
- **GUI Settings API:** [API_GUI.md](API_GUI.md)
- **MCP Integration:** [MCP_README.md](MCP_README.md)
- **Performance & Cost:** [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md)

---

## Authentication

By default, all endpoints are **unauthenticated** and bind to `127.0.0.1` (localhost only). 

For remote access or production deployment, consider:
- Reverse proxy with authentication (Caddy, Nginx)
- OAuth 2.0 integration (see GUI settings)
- VPN or SSH tunnel for secure access

---

## Rate Limiting

No built-in rate limiting. For production use:
- Add reverse proxy with rate limiting
- Use API gateway (Kong, Tyk)
- Monitor with observability tools

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Repository 'invalid-repo' not found",
  "error_code": "REPO_NOT_FOUND",
  "status_code": 404
}
```

**Common Error Codes:**
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (repo, profile, or resource missing)
- `500` - Internal Server Error (check logs)
- `503` - Service Unavailable (dependencies down)

---

**Version:** 2.1.0  
**Last Updated:** October 2025

