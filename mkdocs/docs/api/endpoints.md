# HTTP API

AGRO exposes a small HTTP API for search, RAG answers, chat, configuration, and indexing. Everything is FastAPI under the hood, so you get OpenAPI docs at `/docs` if you’re running the server.

This page focuses on the public endpoints you’re most likely to use directly or from tools like :material-code-tags-check: Claude Code / MCP.

---

## Overview

### High‑level endpoints

| Area          | Method | Path                         | Description                                   |
|---------------|--------|------------------------------|-----------------------------------------------|
| Retrieval     | GET    | `/search`                    | Retrieval‑only search (legacy, no `/api`)     |
| Retrieval     | GET    | `/api/search`                | Retrieval‑only search (preferred)             |
| RAG Answer    | GET    | `/answer`                    | RAG answer (deprecated, non‑streaming)        |
| Chat / RAG    | POST   | `/api/chat`                  | Unified chat + RAG, optional streaming        |
| MCP bridge    | GET    | `/api/mcp/rag_search`        | RAG search optimized for MCP tools            |
| Chat config   | GET    | `/api/chat/config`           | Load saved chat configuration                 |
| Chat config   | POST   | `/api/chat/config`           | Save chat configuration                       |
| Chat templates| POST   | `/api/chat/templates`        | Append prompt templates                       |
| Config schema | GET    | `/api/config-schema`         | JSON schema of config (for UI / tooling)      |
| Env reload    | POST   | `/api/env/reload`            | Reload env + propagate into modules           |
| Env save      | POST   | `/api/env/save`              | Save env vars (raw)                           |
| Config get    | GET    | `/api/config`                | Get current config                            |
| Config set    | POST   | `/api/config`                | Set config + auto‑reload on critical changes  |
| Prices        | GET    | `/api/models`                | Get stored model price info                   |
| Prices        | POST   | `/api/models/upsert`         | Upsert a price entry                          |
| Integrations  | POST   | `/api/integrations/save`     | Save integrations (LangSmith, Grafana, etc.)  |
| MCP key       | POST   | `/api/config/mcp_key`        | Save MCP API key                              |
| Runtime mode  | GET    | `/api/config/runtime_mode`   | Get runtime mode                              |
| Runtime mode  | PATCH  | `/api/config/runtime_mode`   | Update runtime mode                           |
| Indexing      | POST   | `/api/index/start`           | Kick off indexing job                         |
| Indexing      | GET    | `/api/index/stats`           | High‑level index stats                        |
| Indexing      | POST   | `/api/index/run`             | Run (re)index for a repo                      |
| Indexing      | GET    | `/api/index/status`          | Current indexing status                       |

---

## Legacy app entrypoint

The legacy entrypoint exists primarily for old scripts:

```python linenums="1" hl_lines="1 7"
from server.asgi import create_app
...
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012)
```

!!! note "Legacy entrypoint"
    `server/app.py` is **deprecated**. New deployments should import `create_app` from `server.asgi` or just run via your preferred ASGI runner.

---

## Retrieval‑only search

Two endpoints expose pure retrieval (no generation):

- `GET /search` – legacy
- `GET /api/search` – preferred, same behavior, consistent `/api` prefix

Both call the same internal `rag_svc.do_search`.

### `GET /api/search`

**Query parameters**

| Name   | Type   | Required | Description                                                                 |
|--------|--------|----------|-----------------------------------------------------------------------------|
| `q`    | string | yes      | Search query / natural language question                                   |
| `repo` | string | no       | Repository identifier. If omitted, uses the configured default `REPO`.     |
| `top_k`| int    | no       | Number of results to return (1–200, default `10`).                         |

The `repo` mapping is handled by AGRO’s config; for multi‑repo setups, this is how you choose which index to hit.

??? example "Basic retrieval example"
    ```bash
    curl -X GET "http://localhost:8012/api/search" \
      --get \
      --data-urlencode "q=How do we build the Qdrant index?" \
      --data-urlencode "repo=agro" \
      --data-urlencode "top_k=5"
    ```

**Response**

`rag_svc.do_search` returns a JSON object. The exact shape depends on your configuration, but typically you’ll get something like:

```json linenums="1"
{
  "query": "How do we build the Qdrant index?",
  "repo": "agro",
  "top_k": 5,
  "results": [
    {
      "file_path": "retrieval/index_qdrant.py",
      "start_line": 10,
      "end_line": 80,
      "score": 0.92,
      "language": "python",
      "snippet": "...",
      "repo": "agro",
      "metadata": {
        "chunk_id": "index_qdrant.py:10-80"
      }
    }
  ],
  "trace": {
    "search_backends": ["bm25", "dense"],
    "reranker": "colbert-v2",
    "latency_ms": 123
  }
}
```

!!! tip "When to use retrieval‑only"
    For tools like editors or MCP clients that want to **own the prompting and generation**, use `/api/search` (or `/api/mcp/rag_search`, see below) and feed the snippets into your own model.

### `GET /search` (legacy)

Same semantics as `/api/search`, just older path and slightly different docs:

```bash
curl -X GET "http://localhost:8012/search" \
  --get \
  --data-urlencode "q=Where is the config registry implemented?" \
  --data-urlencode "repo=agro"
```

Prefer `/api/search` for new integrations.

---

## RAG answers (legacy `/answer`)

### `GET /answer` (deprecated)

This is the old “ask a question, get an answer” endpoint. It still works, but it’s missing most of the newer features:

> - No event ID for feedback correlation  
> - No detailed trace info  
> - No provider metadata  
> - **No streaming**  

**Query parameters**

| Name   | Type   | Required | Description                                         |
|--------|--------|----------|-----------------------------------------------------|
| `q`    | string | yes      | Question / natural language query                   |
| `repo` | string | no       | Repository identifier (defaults to configured REPO) |

```bash
curl -X GET "http://localhost:8012/answer" \
  --get \
  --data-urlencode "q=How do I trigger env reloads programmatically?" \
  --data-urlencode "repo=agro"
```

**Response**

`rag_svc.do_answer` returns a RAG answer with citations. The exact shape is defined by `SearchResponse` / `ChatResponse`, but looks roughly like:

```json linenums="1"
{
  "question": "How do I trigger env reloads programmatically?",
  "answer": "Use the /api/env/reload endpoint, which reloads the config registry ...",
  "citations": [
    {
      "file_path": "server/routers/config.py",
      "start_line": 18,
      "end_line": 69,
      "repo": "agro"
    }
  ],
  "meta": {
    "model": "gpt-4o-mini",
    "repo": "agro"
  }
}
```

!!! warning "Use `/api/chat` instead"
    For anything new, use `POST /api/chat`. You get streaming, trace, event IDs, and better control over models and temperature.

---

## Unified chat & RAG: `POST /api/chat`

This is the main endpoint for “ask AGRO a question about this codebase” and for more general chat if you configure it that way.

It accepts:

- A structured `ChatRequest` (JSON object)
- Or a legacy “loose dict” payload (also JSON), to keep older UIs working

Internally it manually parses the raw body so either format works.

### Request body (ChatRequest)

Key fields (there are more in the Pydantic model, but these are the important ones):

| Field              | Type    | Required | Default | Description                                                                                                      |
|--------------------|---------|----------|---------|------------------------------------------------------------------------------------------------------------------|
| `question`         | string  | yes      | —       | User question                                                                                                    |
| `repo`             | string  | no       | env `REPO` | Repository to search                                                                                           |
| `model`            | string  | no       | config  | Override generation model (any local or cloud model you have configured)                                        |
| `temperature`      | float   | no       | `0.0`   | Generation temperature                                                                                           |
| `max_tokens`       | int     | no       | `2048`  | Max tokens for the response                                                                                      |
| `final_k`          | int     | no       | `10`    | Number of top documents used in the final prompt                                                                 |
| `stream`           | bool    | no       | `false` | If `true`, returns an SSE stream instead of a single JSON response                                              |
| `include_reasoning`| bool    | no       | `false` | When streaming, include “thinking” chunks (model reasoning) if the model supports it                             |
| `fast_mode`        | bool    | no       | `false` | If `true`, skip expensive reranking steps (useful for quick iterative queries on small repos)                   |

!!! note "Models are not a fixed list"
    `model` is just a string. As long as you’ve wired it up in AGRO’s config (local or cloud), you can use it here; everything flows through Pydantic and shows up automatically.

### Non‑streaming usage

=== "curl"

    ```bash
    curl -X POST "http://localhost:8012/api/chat" \
      -H "Content-Type: application/json" \
      -d '{
        "question": "Walk me through how env reload works in AGRO.",
        "repo": "agro",
        "temperature": 0.1,
        "max_tokens": 1024,
        "final_k": 8,
        "fast_mode": false
      }'
    ```

=== "Minimal payload"

    ```bash
    curl -X POST "http://localhost:8012/api/chat" \
      -H "Content-Type: application/json" \
      -d '{
        "question": "Where is the hybrid search implemented?"
      }'
    ```

**Response (non‑streaming)**

`rag_svc.do_chat` returns a `ChatResponse` JSON with (roughly):

```json linenums="1"
{
  "question": "Walk me through how env reload works in AGRO.",
  "answer": "The /api/env/reload endpoint calls cfg.env_reload() and then reloads a set of modules ...",
  "citations": [
    {
      "file_path": "server/routers/config.py",
      "start_line": 20,
      "end_line": 72,
      "repo": "agro"
    },
    {
      "file_path": "server/services/config_store.py",
      "start_line": 1,
      "end_line": 120,
      "repo": "agro"
    }
  ],
  "trace": {
    "event_id": "abc123",
    "retrieval": {
      "top_k": 12,
      "final_k": 8,
      "backends": ["bm25", "dense"],
      "reranker": "learning-reranker"
    },
    "generation": {
      "model": "gpt-4o-mini",
      "temperature": 0.1,
      "max_tokens": 1024
    }
  },
  "meta": {
    "provider": "openai",
    "runtime_mode": "development",
    "repo": "agro"
  }
}
```

### Streaming usage (SSE)

If you set `"stream": true`, the endpoint returns a `text/event-stream` `StreamingResponse`. Internally it calls `rag_svc.do_chat_stream`.

Headers:

```http
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
Content-Type: text/event-stream
```

The stream includes chunks of different types: `thinking`, `content`, `citations`, `trace`, `meta`, `done`.

=== "curl (raw SSE)"

    ```bash
    curl -N -X POST "http://localhost:8012/api/chat" \
      -H "Content-Type: application/json" \
      -d '{
        "question": "Explain how the MCP RAG search bridge works.",
        "repo": "agro",
        "stream": true,
        "include_reasoning": true
      }'
    ```

=== "Example SSE events"

    ```text linenums="1"
    event: thinking
    data: {"delta": "Checking how MCPServerClass is resolved..."}

    event: content
    data: {"delta": "AGRO exposes /api/mcp/rag_search, which calls MCPServer.handle_rag_search when available..."}

    event: citations
    data: {"citations":[{"file_path":"server/routers/search.py","start_line":70,"end_line":115}]}

    event: trace
    data: {"event_id":"abc123","retrieval":{"top_k":10,"final_k":10}}

    event: meta
    data: {"model":"gpt-4o-mini","repo":"agro"}

    event: done
    data: {}
    ```

!!! tip "When to enable streaming"
    Use streaming when you’re building an interactive UI or editor integration and want **partial responses** and optional **reasoning traces**. For simple scripts, non‑streaming JSON is usually easier.

---

## MCP‑optimized RAG search: `GET /api/mcp/rag_search`

This is a small HTTP wrapper around the internal MCP server’s `rag_search` tool, designed to match what tools like Claude Code expect.

It does two things:

1. If `MCPServer` is available, it delegates to `MCPServer.handle_rag_search`.
2. If not (or if `force_local=true`), it falls back to calling the local hybrid retrieval (`search_routed_multi`).

**Query parameters**

| Name         | Type   | Required | Default              | Description                                                                                 |
|--------------|--------|----------|----------------------|---------------------------------------------------------------------------------------------|
| `q`          | string | yes      | —                    | Question / search query                                                                     |
| `repo`       | string | no       | env `REPO` or `agro` | Repository override                                                                         |
| `top_k`      | int    | no       | `10`                 | Number of results to return                                                                 |
| `force_local`| bool   | no       | `false`              | If `true`, bypasses MCP server and calls local retrieval directly                           |

=== "curl"

    ```bash
    curl -X GET "http://localhost:8012/api/mcp/rag_search" \
      --get \
      --data-urlencode "q=Show me where hybrid_search is implemented" \
      --data-urlencode "repo=agro" \
      --data-urlencode "top_k=5"
    ```

**Response (local fallback shape)**

When falling back to local retrieval, the router normalizes the response to:

```json linenums="1"
{
  "results": [
    {
      "file_path": "retrieval/hybrid_search.py",
      "start_line": 1,
      "end_line": 200,
      "language": "python",
      "rerank_score": 0.97,
      "repo": "agro"
    }
  ],
  "repo": "agro",
  "count": 1
}
```

When using `MCPServer.handle_rag_search`, the shape is whatever the MCP tool returns (AGRO’s own MCP server matches this shape by default).

!!! tip "Why this matters for MCP tools"
    Instead of sending the **entire repository** as context to a model, MCP clients can call this endpoint (or the MCP tool directly) and only send the **small set of relevant chunks** to the model. Less context, better focus.

---

## Chat configuration & templates

These endpoints store small bits of UI state on disk under `repo_root()/out/`.

### `GET /api/chat/config`

Returns persisted chat configuration, or `{}` if nothing saved. The UI merges this with its own default config.

```bash
curl -X GET "http://localhost:8012/api/chat/config"
```

Response example:

```json linenums="1"
{
  "default_model": "gpt-4o-mini",
  "temperature": 0.1,
  "max_tokens": 2048
}
```

### `POST /api/chat/config`

Persists arbitrary key/value pairs to `out/chat_config.json`. The server doesn’t validate the shape; the UI is responsible for that.

```bash
curl -X POST "http://localhost:8012/api/chat/config" \
  -H "Content-Type: application/json" \
  -d '{
    "default_model": "gpt-4o-mini",
    "temperature": 0.2
  }'
```

Response:

```json
{"ok": true}
```

!!! warning "Payload must be JSON‑serializable"
    The server checks `json.dumps(payload)` and will return `400` if it fails.

### `POST /api/chat/templates`

Append a named prompt template to `out/chat_templates.json`.

**Payload**

| Field    | Type   | Required | Description           |
|----------|--------|----------|-----------------------|
| `name`   | string | yes      | Template name         |
| `prompt` | string | yes      | Template text/prompt  |

```bash
curl -X POST "http://localhost:8012/api/chat/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deep code review",
    "prompt": "You are a meticulous code reviewer. For the following changes..."
  }'
```

Response:

```json
{"ok": true}
```

Internally each entry gets a `created_at` timestamp added.

---

## Config schema: `GET /api/config-schema`

Returns the full configuration schema used by AGRO’s config UI. This is generated from Pydantic models and includes fields, types, defaults, and descriptions.

```bash
curl -X GET "http://localhost:8012/api/config-schema"
```

Response (truncated):

```json linenums="1"
{
  "env": {
    "REPO": {
      "type": "string",
      "default": "agro",
      "description": "Default repository to query"
    },
    "GEN_MODEL": {
      "type": "string",
      "default": "gpt-4o-mini",
      "description": "Default generation model"
    }
  },
  "integrations": {
    "langsmith": { "...": "..." }
  }
}
```

This is what powers the UI’s tooltips and docs links; you can also consume it directly if you’re building your own front‑end.

---

## Environment reload: `POST /api/env/reload`

Reloads environment and propagates config changes into all modules that cache configuration values.

Internally this:

1. Calls `cfg.env_reload()` to reload the config registry.
2. Dynamically imports a list of modules (e.g. `retrieval.hybrid_search`, `server.env_model`, `server.metrics`, …).
3. Calls `reload_config()` on each module that exposes it.
4. Returns a summary of what was reloaded and any warnings.

```bash
curl -X POST "http://localhost:8012/api/env/reload"
```

Example response:

```json linenums="1"
{
  "status": "ok",
  "reloaded_modules": [
    "hybrid_search",
    "rerank",
    "langgraph_app",
    "env_model",
    "tracing",
    "metrics",
    "keywords",
    "cards_builder",
    "learning_reranker",
    "metadata"
  ],
  "reload_warnings": []
}
```

!!! tip "Use this after manual `.env` edits"
    If you edit `.env` or other config files outside the UI, hit `/api/env/reload` so AGRO picks up the changes immediately.

---

## Config APIs: `/api/config` and friends

These endpoints talk to the central config store (`server.services.config_store`).

### `GET /api/config`

Returns the current configuration (env + integrations + prices, etc.).

**Query parameters**

| Name     | Type | Default | Description                                                           |
|----------|------|---------|-----------------------------------------------------------------------|
| `unmask` | bool | `false` | If `true`, include unmasked secrets. Typically keep this `false`.     |

```bash
curl -X GET "http://localhost:8012/api/config?unmask=false"
```

Response example (truncated):

```json linenums="1"
{
  "status": "ok",
  "env": {
    "REPO": "agro",
    "GEN_MODEL": "gpt-4o-mini",
    "EMBEDDING_TYPE": "qdrant",
    "EMBEDDING_MODEL": "text-embedding-3-small"
  },
  "integrations": {
    "langsmith": { "enabled": false }
  }
}
```

### `POST /api/config`

Sets configuration and **auto‑reloads** if critical settings changed.

Critical keys that trigger auto‑reload:

- `REPO`
- `RERANKER_BACKEND`
- `GEN_MODEL`
- `EMBEDDING_TYPE`
- `EMBEDDING_MODEL`

Payload is passed straight into `cfg.set_config(payload)`; the typical shape is:

```json linenums="1"
{
  "env": {
    "REPO": "agro",
    "GEN_MODEL": "gpt-4o-mini",
    "EMBEDDING_TYPE": "qdrant",
    "EMBEDDING_MODEL": "text-embedding-3-small"
  },
  "integrations": {
    "langsmith": { "enabled": true, "api_key": "..." }
  }
}
```

=== "curl"

    ```bash
    curl -X POST "http://localhost:8012/api/config" \
      -H "Content-Type: application/json" \
      -d '{
        "env": {
          "REPO": "agro",
          "GEN_MODEL": "gpt-4o-mini",
          "EM