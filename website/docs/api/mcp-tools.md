---
sidebar_position: 3
---

# MCP Tools

AGRO exposes a **Model Context Protocol (MCP)** server that AI agents like Claude Code and Codex can use to query your codebase. Instead of reading entire files (burning tokens), agents call RAG tools that return only the relevant chunks with citations.

## Why MCP?

**The Problem:** Claude Code reads full files to answer questions. For complex queries, this can mean:
- Reading 10-15 files
- Sending 20,000+ tokens per query
- Hitting rate limits fast (Claude Pro: 1.27M tokens/week = ~60 complex queries)

**The Solution:** MCP tools let Claude call `rag_answer(repo, question)` instead:
- Returns only relevant chunks (5-10)
- Sends ~1,141 tokens total (91% reduction)
- Same answer quality, 11x more queries per week

## Architecture

```
┌────────────────────────────────────────┐
│  Claude Code / Codex                   │
│  - MCP client built-in                 │
└──────────────┬─────────────────────────┘
               │ MCP protocol (JSON-RPC)
               ↓
┌────────────────────────────────────────┐
│  AGRO MCP Server                       │
│  - STDIO transport (local)             │
│  - HTTP transport (remote)             │
│  - SSE transport (streaming)           │
│  - WebSocket transport (bidirectional) │
└──────────────┬─────────────────────────┘
               │ calls
               ↓
┌────────────────────────────────────────┐
│  AGRO RAG Engine                       │
│  - Hybrid search                       │
│  - LangGraph pipeline                  │
│  - Cross-encoder reranking             │
└────────────────────────────────────────┘
```

## Transport Modes

AGRO supports **four MCP transports** with different capabilities:

### STDIO (Local Agents)

**Best for:** Claude Code, Codex CLI, local development

**Tools available:**
- `rag_answer` - Full LangGraph pipeline with citations
- `rag_search` - Retrieval-only (debugging)
- `rag_feedback` - Submit ratings to train reranker
- `netlify_deploy` - Trigger Netlify builds
- `web_get` - HTTP GET for allowlisted domains

**Setup:**
```bash
# Start MCP server
bash scripts/up.sh  # Starts infra + MCP

# Register with Claude Code or Codex
# (see Installation section below)
```

**Configuration:**
```json
{
  "mcpServers": {
    "agro": {
      "command": "/path/to/agro/.venv/bin/python",
      "args": ["/path/to/agro/server/mcp/server.py"],
      "env": {
        "REPO": "agro",
        "EMBEDDING_TYPE": "local",
        "GEN_MODEL": "qwen3-coder:30b"
      }
    }
  }
}
```

---

### HTTP (Remote Agents)

**Best for:** Web platforms, remote agents, API integrations

**Tools available:**
- `rag_answer` - Full pipeline (same as STDIO)
- `rag_search` - Retrieval-only

**Endpoint:** `http://127.0.0.1:8013` (default)

**Start server:**
```bash
# Via GUI: Infrastructure tab → MCP HTTP Server → Start
# Or via API:
curl -X POST http://127.0.0.1:8012/api/mcp/http/start \
  -H 'Content-Type: application/json' \
  -d '{"port": 8013}'
```

**Example request:**
```bash
curl -X POST http://127.0.0.1:8013/tools/call \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "rag_answer",
      "arguments": {
        "repo": "agro",
        "question": "How does hybrid search work?"
      }
    }
  }'
```

---

### SSE (Streaming)

**Best for:** Real-time updates, streaming answers

**Status:** Planned (not yet implemented)

**Use case:** Stream LLM generation token-by-token to the client for real-time feedback.

---

### WebSocket (Bidirectional)

**Best for:** Interactive sessions, bidirectional communication

**Status:** Planned (not yet implemented)

**Use case:** Persistent connections for chat-like interfaces with state management.

---

## Available Tools

### rag_answer

Generate a full answer using the LangGraph pipeline (retrieval + generation + citations).

**Input Schema:**
```json
{
  "repo": "string (required)",
  "question": "string (required)"
}
```

**Example:**
```python
# From Claude Code
result = rag_answer(
    repo="agro",
    question="How does the reranker training pipeline work?"
)
```

**Response:**
```json
{
  "answer": "The reranker training pipeline consists of four stages:\n\n1. **Triplet Mining**: Extracts (query, positive, negative) triplets from query logs and golden questions using `server/reranker/miner.py`...",
  "citations": [
    "server/reranker/trainer.py:45-120",
    "server/reranker/miner.py:89-156",
    "eval/eval_loop.py:203-245"
  ],
  "repo": "agro",
  "confidence": 0.87,
  "event_id": "evt_1737234567890"
}
```

**Fields:**
- `answer` (string): Synthesized answer from the LLM
- `citations` (array): File paths with line ranges (5-10 chunks)
- `repo` (string): Repository name
- `confidence` (float): Retrieval confidence (0.0-1.0)
- `event_id` (string): Use with `rag_feedback` to rate quality

---

### rag_search

Retrieval-only search (no LLM generation). Returns raw chunks with metadata.

**Input Schema:**
```json
{
  "repo": "string (required)",
  "question": "string (required)",
  "top_k": "integer (optional, default: 10)"
}
```

**Example:**
```python
result = rag_search(
    repo="agro",
    question="hybrid search implementation",
    top_k=5
)
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
      "rerank_score": 0.91,
      "repo": "agro"
    },
    {
      "file_path": "server/app.py",
      "start_line": 245,
      "end_line": 289,
      "language": "python",
      "rerank_score": 0.78,
      "repo": "agro"
    }
  ],
  "repo": "agro",
  "count": 5
}
```

**Use case:** Debugging retrieval quality, testing reranker performance, building custom UIs.

---

### rag_feedback

Submit feedback ratings (1-5 stars) for a previous query to train the learning reranker.

**Input Schema:**
```json
{
  "event_id": "string (required)",
  "rating": "integer (required, 1-5)",
  "note": "string (optional)"
}
```

**Example:**
```python
# After calling rag_answer and getting event_id
result = rag_feedback(
    event_id="evt_1737234567890",
    rating=5,
    note="Perfect answer, exactly what I needed"
)
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted: 5/5 stars"
}
```

**Impact:** Feedback is logged and used to:
1. Mine triplets for reranker training
2. Track query quality metrics
3. Identify edge cases for golden test expansion

---

### netlify_deploy

Trigger a Netlify build for your static sites (requires `NETLIFY_API_KEY`).

**Input Schema:**
```json
{
  "domain": "string (enum: 'project.net', 'project.dev', 'both')"
}
```

**Example:**
```python
result = netlify_deploy(domain="both")
```

**Response:**
```json
{
  "results": [
    {
      "domain": "project.net",
      "status": "triggered",
      "site_id": "abc123...",
      "build_id": "def456..."
    },
    {
      "domain": "project.dev",
      "status": "triggered",
      "site_id": "xyz789...",
      "build_id": "uvw012..."
    }
  ]
}
```

**Setup:**
```bash
export NETLIFY_API_KEY=your-api-key
```

---

### web_get

HTTP GET for allowlisted domains (OpenAI, GitHub, etc.).

**Input Schema:**
```json
{
  "url": "string (required)",
  "max_bytes": "integer (optional, default: 20000)"
}
```

**Allowlisted hosts:**
- `openai.com`
- `platform.openai.com`
- `github.com`
- `openai.github.io`

**Example:**
```python
result = web_get(
    url="https://platform.openai.com/docs/api-reference",
    max_bytes=10000
)
```

**Response:**
```json
{
  "url": "https://platform.openai.com/docs/api-reference",
  "status": 200,
  "length": 12345,
  "clipped": true,
  "content_preview": "<!DOCTYPE html>..."
}
```

---

## Installation

### Claude Code Setup

1. **Start AGRO infrastructure:**
   ```bash
   cd /path/to/agro-rag-engine
   make up  # Starts Qdrant, Redis, Prometheus, Grafana, MCP
   ```

2. **Find your Python path:**
   ```bash
   which python  # If using virtualenv: /path/to/agro/.venv/bin/python
   ```

3. **Configure Claude Code:**

   Edit `~/.config/claude/mcp.json` (macOS/Linux) or `%APPDATA%\Claude\mcp.json` (Windows):

   ```json
   {
     "mcpServers": {
       "agro": {
         "command": "/path/to/agro/.venv/bin/python",
         "args": ["/path/to/agro/server/mcp/server.py"],
         "env": {
           "REPO": "agro",
           "EMBEDDING_TYPE": "local",
           "GEN_MODEL": "qwen3-coder:30b",
           "RERANK_BACKEND": "local"
         }
       }
     }
   }
   ```

4. **Restart Claude Code** and verify tools appear in the MCP section.

---

### Codex CLI Setup

1. **Install Codex:**
   ```bash
   brew install openai/tap/codex
   # or
   npm install -g @openai/codex
   ```

2. **Register MCP server:**
   ```bash
   codex mcp add agro -- \
     /path/to/agro/.venv/bin/python \
     /path/to/agro/server/mcp/server.py
   ```

3. **Verify registration:**
   ```bash
   codex mcp list
   # Should show: agro
   ```

4. **Test in Codex:**
   ```bash
   codex chat
   # In chat: "Use rag_answer to find where hybrid search is implemented in agro"
   ```

---

## Per-Transport Configuration

AGRO lets you configure **different models for different transports**:

```yaml
# STDIO (local agents) - Use free local models
stdio:
  gen_model: qwen3-coder:30b  # Ollama
  embedding: local            # Sentence Transformers
  rerank: local               # Cross-encoder

# HTTP (remote agents) - Use fast API models
http:
  gen_model: gpt-4o-mini      # OpenAI
  embedding: text-embedding-3-small
  rerank: cohere              # Cohere rerank-3.5
```

**Configure via GUI:** Infrastructure tab → MCP Configuration → Select Transport → Set Models

**Why?** Local agents (STDIO) can use powerful local models with zero API cost. Remote agents (HTTP) need fast responses, so use cheap API models.

---

## Agent Rules for Claude Code/Codex

To maximize effectiveness, configure your agent with these rules (add to `~/.config/claude/rules.md` or Codex settings):

### 1. Always Call RAG First

```markdown
Before reading any file, ALWAYS call `rag_answer` or `rag_search` first.
RAG results are authoritative - trust file paths and line numbers.
```

### 2. Never Hallucinate Paths

```markdown
NEVER assume a file exists without RAG confirmation.
If RAG returns no results, tell the user honestly - don't guess.
```

### 3. Respect Repository Boundaries

```markdown
Repositories are isolated. Never mix code from different repos.
Always specify repo parameter in MCP calls.
```

### 4. Use Citations

```markdown
When answering from RAG results, cite file paths and line ranges:
"Based on retrieval/hybrid_search.py:389-632, the search pipeline..."
```

### 5. Submit Feedback

```markdown
After getting a good answer from rag_answer, submit feedback:
rag_feedback(event_id=<event_id>, rating=5)
This trains the reranker to improve future searches.
```

---

## Testing & Debugging

### Test MCP Server Directly

```bash
cd /path/to/agro-rag-engine
. .venv/bin/activate

# Test tools/list
python -c "
import json
from server.mcp.server import MCPServer
req = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list', 'params': {}}
server = MCPServer()
print(json.dumps(server.handle_request(req), indent=2))
"

# Test rag_answer
python -c "
import json
from server.mcp.server import MCPServer
req = {
  'jsonrpc': '2.0',
  'id': 2,
  'method': 'tools/call',
  'params': {
    'name': 'rag_answer',
    'arguments': {'repo': 'agro', 'question': 'How does hybrid search work?'}
  }
}
server = MCPServer()
print(json.dumps(server.handle_request(req), indent=2))
"
```

---

### Debug MCP in Claude Code

1. **Check MCP configuration:**
   ```bash
   cat ~/.config/claude/mcp.json
   ```

2. **Verify server is running:**
   ```bash
   curl http://127.0.0.1:8012/health
   # Should return: {"status": "healthy"}
   ```

3. **Check Claude Code logs:**
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`
   - Linux: `~/.config/Claude/logs/`

4. **Test tool manually:**
   ```bash
   # In Claude Code, type:
   "List available MCP tools"
   # Should show: rag_answer, rag_search, rag_feedback, netlify_deploy, web_get
   ```

---

## Performance & Cost

### Token Comparison

| Approach | Tokens/Query | Queries/Week (Claude Pro) | Cost |
|----------|--------------|---------------------------|------|
| **Claude Code alone** | ~12,700 | ~100 | $0/query (included) |
| **Claude Code + RAG** | ~1,141 | ~1,110 | $0/query (local models) |
| **Savings** | 91% reduction | 11x more queries | Same or lower |

### Latency

| Component | Time | Notes |
|-----------|------|-------|
| Hybrid search | ~200ms | BM25 + Qdrant + RRF |
| Reranking | ~150ms | Local cross-encoder |
| LLM generation | ~2-5s | Ollama Qwen3 30B (local) |
| **Total** | ~2.5-5.5s | Same as Claude reading 10 files |

### Cost Breakdown (API Models)

```
# Cost per rag_answer call (gpt-4o-mini generation)
Input tokens:  ~500 (context) @ $0.15/1M  = $0.000075
Output tokens: ~150 (answer)  @ $0.60/1M  = $0.000090
Total: ~$0.000165 per query

# vs Claude Code alone
Claude reading 10 files = 20,000 tokens (no extra cost, but burns rate limit)
```

---

## Troubleshooting

### "MCP server not responding"

1. **Check server is running:**
   ```bash
   ps aux | grep mcp_server.py
   ```

2. **Start if needed:**
   ```bash
   bash scripts/up.sh
   ```

3. **Check logs:**
   ```bash
   tail -f /tmp/mcp_server.log  # If logging enabled
   ```

---

### "Tools not appearing in Claude Code"

1. **Verify mcp.json syntax:**
   ```bash
   python -m json.tool ~/.config/claude/mcp.json
   ```

2. **Check command path is absolute:**
   ```json
   {
     "command": "/Users/you/agro/.venv/bin/python",  // ✅ Absolute
     "args": ["/Users/you/agro/server/mcp/server.py"]  // ✅ Absolute
   }
   ```

3. **Restart Claude Code completely** (not just reload window).

---

### "Invalid repo error"

```json
{"error": "invalid repo 'xyz', allowed=['agro']"}
```

**Solution:** Add repo to `repos.json`:

```bash
# Via GUI: Repositories tab → Add Repository
# Or manually edit repos.json:
{
  "xyz": {
    "path": "/path/to/xyz",
    "indexed": true
  }
}
```

Then reindex:
```bash
REPO=xyz python indexer/index_repo.py
```

---

### "Graph not initialized"

**Cause:** LangGraph failed to build (missing dependencies, Redis down, etc.)

**Solution:**
```bash
# Check health endpoint
curl http://127.0.0.1:8012/health
# Should show: "graph_loaded": true

# If false, check Redis:
docker ps | grep redis
# Should show: rag-redis running

# Restart infra:
make down && make up
```

---

## HTTP Transport Details

### Start HTTP MCP Server

```bash
# Via API
curl -X POST http://127.0.0.1:8012/api/mcp/http/start \
  -H 'Content-Type: application/json' \
  -d '{"port": 8013}'

# Via GUI
# Infrastructure tab → MCP HTTP Server → Start
```

### Check Status

```bash
curl http://127.0.0.1:8012/api/mcp/status
```

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
  }
}
```

### Stop HTTP Server

```bash
curl -X POST http://127.0.0.1:8012/api/mcp/http/stop
```

---

## Security Considerations

### STDIO Transport

- **Trusted by default**: Runs as local process with same permissions as Claude Code
- **No network exposure**: Communication via stdin/stdout only
- **Inherits env**: Uses your `.env` variables and API keys

### HTTP Transport

- **Local network only**: Binds to `127.0.0.1` by default (not `0.0.0.0`)
- **No authentication**: Assumes trusted local network
- **Production use**: Add API key auth and TLS/HTTPS

**For production HTTP:**
```python
# Add authentication middleware in server/mcp/http.py
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("MCP_API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid API key")
```

---

## Next Steps

- **[HTTP Endpoints](endpoints.md)** - Direct REST API access (no MCP)
- **[RAG System](../features/rag.md)** - Understand how hybrid search works
- **[Learning Reranker](../features/learning-reranker.md)** - Train custom model on your code
- **[Troubleshooting](../operations/troubleshooting.md)** - Debug common issues
