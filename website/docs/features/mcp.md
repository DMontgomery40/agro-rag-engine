---
sidebar_position: 3
---

# MCP Integration

The Model Context Protocol (MCP) integration allows AI agents like Codex and Claude Code to directly query AGRO's RAG system through a standardized interface.

## Overview

AGRO provides two MCP modes:

- **stdio mode** (`mcp_server.py`) - Full tool access for local agents
- **HTTP mode** (`mcp_server_http.py`) - RAG-only for remote platforms

### Available Tools

#### stdio Mode (4 tools)

1. **rag_answer(repo, question)** - Full LangGraph pipeline with answer + citations
2. **rag_search(repo, question, top_k=10)** - Retrieval-only for debugging
3. **netlify_deploy(domain)** - Trigger Netlify builds (requires `NETLIFY_API_KEY`)
4. **web_get(url, max_bytes=20000)** - HTTP GET for allowlisted hosts only

#### HTTP Mode (2 tools)

1. **answer** - RAG answer generation
2. **search** - RAG retrieval only

**When to use each:**

- **stdio**: Local agents (Codex CLI, Claude Code) needing full tool access
- **HTTP**: Remote agents/platforms requiring only RAG capabilities

## Quick Start

### Prerequisites

```bash
# 1. Start infrastructure and MCP
bash scripts/up.sh

# 2. Activate virtualenv
. .venv/bin/activate

# 3. Index your repository
REPO=agro python index_repo.py

# 4. Install Codex CLI (if not already installed)
brew install openai/tap/codex
# or
npm install -g @openai/codex
```

### Shared Index Setup (Recommended)

MCP often runs in a different process than your shell. To avoid "no results" errors from mismatched paths, use a shared index:

```bash
. .venv/bin/activate

# Create shared index
REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 \
  python index_repo.py

# Set environment for shared index
source scripts/select_index.sh shared

# Start services with shared profile
bash scripts/up.sh && bash scripts/status.sh
```

You can also persist these settings via the GUI:
- Infrastructure tab → set `Out Dir Base=./out.noindex-shared`
- Click "Apply All Changes"

### Register with Codex

```bash
codex mcp add agro-rag -- \
  /absolute/path/to/agro-rag-engine/.venv/bin/python \
  /absolute/path/to/agro-rag-engine/mcp_server.py
```

Verify registration:

```bash
codex mcp list
# Should show: agro-rag
```

### Test MCP Server

Test the protocol directly:

```bash
. .venv/bin/activate

# Test tools/list
python -c "
import json
from server.mcp.server import MCPServer
req = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list', 'params': {}}
server = MCPServer()
print(json.dumps(server.handle_request(req), indent=2))
"
```

## Usage Examples

### Example 1: Ask a Question

In a Codex chat session:

```
User: Use rag_answer to find where OAuth tokens are validated in agro

Codex calls: rag_answer(repo="agro", question="Where is OAuth token validated?")

Returns:
{
  "answer": "[repo: agro]\nOAuth tokens are validated in...",
  "citations": [
    "identity/auth/oauth.py:42-67",
    "identity/middleware/token.py:89-120"
  ],
  "repo": "agro",
  "confidence": 0.78
}
```

### Example 2: Debug Retrieval

```
User: Use rag_search to see what code comes up for "indexing" in agro

Codex calls: rag_search(repo="agro", question="How does indexing work?", top_k=5)

Returns:
{
  "results": [
    {
      "file_path": "indexer/index_repo.py",
      "start_line": 45,
      "end_line": 89,
      "language": "python",
      "rerank_score": 0.82,
      "repo": "agro"
    },
    ...
  ],
  "repo": "agro",
  "count": 5
}
```

### Example 3: Trigger Netlify Deploy

```
User: Use netlify_deploy to rebuild example.net

Returns:
{
  "results": [
    {
      "domain": "example.net",
      "status": "triggered",
      "site_id": "abc123",
      "build_id": "def456"
    }
  ]
}
```

### Example 4: Fetch Allowlisted Docs

```
User: Use web_get to fetch https://github.com/openai/codex

Returns: {
  "url": "https://github.com/openai/codex",
  "status": 200,
  "length": 12345,
  "clipped": true,
  "content_preview": "..."
}
```

## Configuration

### Default Behavior

- **Generation**: Defaults to local Qwen 3 (Ollama). Configure via `GEN_MODEL` and `OLLAMA_URL`, or switch to OpenAI by setting `OPENAI_API_KEY` and `GEN_MODEL`.
- **Reranking**: Defaults to local cross-encoder. Set `RERANK_BACKEND=cohere` + `COHERE_API_KEY` for Cohere rerank-3.5.
- **LangGraph**: Compiles without Redis if unavailable; uses Redis checkpointing when present.

### Environment Variables

```bash
# Required
REPO=agro

# Optional - Generation
GEN_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://127.0.0.1:11434/api

# Optional - Reranking
RERANK_BACKEND=cohere
COHERE_API_KEY=...

# Optional - Infrastructure
REDIS_URL=redis://127.0.0.1:6379/0
QDRANT_URL=http://127.0.0.1:6333
```

## Agent Rules

These rules ensure AI agents use RAG tools effectively:

1. **Never assume the user is wrong** about file paths, function names, or code locations
2. **Always call RAG tools first** before claiming something doesn't exist
3. **Never hallucinate file paths** - use retrieval results as ground truth
4. **Respect repo boundaries** - separate repos must never be fused
5. **Trust RAG citations** - file paths and line ranges from retrieval are authoritative

See [AGENTS.md](https://github.com/DMontgomery40/agro-rag-engine/blob/main/AGENTS.md) for complete guidelines.

## Evaluation Loop

Run continuous evaluation to track retrieval quality:

```bash
. .venv/bin/activate

# Run eval once
python -m eval.eval_loop

# Save baseline
python -m eval.eval_loop --baseline

# Compare against baseline
python -m eval.eval_loop --compare

# Watch mode (re-run on changes)
python -m eval.eval_loop --watch

# JSON output
python -m eval.eval_loop --json
```

### Adding Golden Test Cases

Edit `golden.json`:

```json
[
  {
    "q": "Where is ProviderSetupWizard rendered?",
    "repo": "agro",
    "expect_paths": ["ProviderSetupWizard", "admin_ui", "components"]
  },
  {
    "q": "How do we queue outbound jobs?",
    "repo": "agro",
    "expect_paths": ["app/", "job", "queue"]
  }
]
```

The `expect_paths` uses substring matching - any result containing one of these substrings counts as a hit.

## Architecture

```
┌─────────────────┐
│  Codex / Agent  │
└────────┬────────┘
         │ MCP (stdio)
         ▼
┌─────────────────────┐
│  mcp_server.py      │
│  ┌───────────────┐  │
│  │ rag_answer    │──┼──> langgraph_app.py
│  │ rag_search    │──┼──> hybrid_search.py
│  └───────────────┘  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Qdrant + Redis     │  (Docker Compose)
│  BM25 + Embeddings  │
└─────────────────────┘
```

## Troubleshooting

### "Graph not initialized"

- Check Redis: `docker exec rag-redis redis-cli ping`
- Check Qdrant: `curl -s http://127.0.0.1:6333/collections`
- Verify `.env` has `OPENAI_API_KEY`, `REDIS_URL`, `QDRANT_URL`

### "No results returned"

1. Verify shared index exists: `ls -lh out.noindex-shared/agro/chunks.jsonl`
2. Ensure MCP sees correct path:
   ```bash
   source scripts/select_index.sh shared
   ```
   Or set via GUI → Infrastructure → "Apply All Changes"
3. Re-index (fast BM25-only):
   ```bash
   . .venv/bin/activate
   REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 \
     python index_repo.py
   ```
4. Try retrieval directly:
   ```bash
   . .venv/bin/activate
   OUT_DIR_BASE=./out.noindex-shared python - <<'PY'
   from retrieval.hybrid_search import search_routed_multi
   print(search_routed_multi('test', repo_override='agro', final_k=3))
   PY
   ```

### "Codex can't find the tools"

- Verify registration: `codex mcp list`
- Re-register: `codex mcp remove agro-rag && codex mcp add agro-rag -- ...`
- Check config: `cat ~/.codex/config.toml | grep mcp`

### Netlify Deploy Errors

- Ensure `NETLIFY_API_KEY` is set in the environment running the MCP server
- Verify the target site domain exists in your Netlify account

### web_get Blocked

Only these hosts are allowed:
- `openai.com`
- `platform.openai.com`
- `github.com`
- `openai.github.io`

## References

- [Codex MCP docs](https://developers.openai.com/codex/mcp/)
- [MCP specification](https://modelcontextprotocol.io/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [AgentKit announcement](https://openai.com/index/introducing-agentkit/)
