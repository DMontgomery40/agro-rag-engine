# MCP Integration for RAG Service

This document describes the Model Context Protocol (MCP) integration that allows Codex and other AI agents to directly query the RAG system.

## Overview

The MCP server (`mcp_server.py`) exposes four tools:

1. `rag_answer(repo, question)` → Full LangGraph pipeline with answer + citations
2. `rag_search(repo, question, top_k=10)` → Retrieval-only (debugging)
3. `netlify_deploy(domain)` → Trigger a Netlify build for `repo-b.net`, `repo-a.dev`, or `both` (requires `NETLIFY_API_KEY`)
4. `web_get(url, max_bytes=20000)` → HTTP GET for allowlisted hosts only (`openai.com`, `platform.openai.com`, `github.com`, `openai.github.io`)

### Tool Parity: stdio vs HTTP

**stdio mode** (`mcp_server.py`): 4 tools - `rag_answer`, `rag_search`, `netlify_deploy`, `web_get`

**HTTP mode** (`mcp_server_http.py`): 2 tools - `answer`, `search` (RAG-only, no Netlify/web helpers)

**Use stdio for:** Local agents (Codex CLI, Claude Code) with full tool access

**Use HTTP for:** Remote agents/platforms that only need RAG retrieval and generation

See [docs/REMOTE_MCP.md](REMOTE_MCP.md) for HTTP setup.

## Setup

### 1. Prerequisites

- Bring infra + MCP up: `bash scripts/up.sh`
- Activate virtualenv: `. .venv/bin/activate`
- Index repos: `REPO=repo-a python index_repo.py && REPO=repo-b python index_repo.py`
- Codex CLI installed: `brew install openai/tap/codex` or `npm install -g @openai/codex`

### Shared Index Across Branches

MCP often runs in a different process/session than your shell. To avoid “no results” from mismatched paths, standardize on a shared index:

```bash
. .venv/bin/activate
REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 \
  python index_repo.py

# Ensure MCP inherits consistent env
source scripts/select_index.sh shared   # sets OUT_DIR_BASE and COLLECTION_NAME

# Bring infra + MCP up with shared profile
bash scripts/up.sh && bash scripts/status.sh
```

You can also persist these values via the GUI (Infrastructure tab → set `Out Dir Base=./out.noindex-shared` → “Apply All Changes”).

### 2. Register MCP Server with Codex

```bash
codex mcp add repo-b-rag -- \
  /Users/path/to/repo-b_folder/rag-service/.venv/bin/python \
  /Users/path/to/repo-b_folder/rag-service/mcp_server.py
```

Verify registration:
```bash
codex mcp list
# Should show: repo-b-rag
```

### 3. Test MCP Server (Manual)

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

## Usage from Codex

Once registered, Codex can natively call these tools:

### Example 1: Ask a question

In a Codex chat session:

```
User: Use rag_answer to find where OAuth tokens are validated in repo-a

Codex will call:
  rag_answer(repo="repo-a", question="Where is OAuth token validated?")

Returns:
{
  "answer": "[repo: repo-a]\nOAuth tokens are validated in...",
  "citations": [
    "identity/auth/oauth.py:42-67",
    "identity/middleware/token.py:89-120"
  ],
  "repo": "repo-a",
  "confidence": 0.78
}
```

### Example 3: Trigger a Netlify Deploy

```
User: Use netlify_deploy to rebuild repo-b.net

Returns:
{
  "results": [
    {"domain": "repo-b.net", "status": "triggered", "site_id": "...", "build_id": "..."}
  ]
}
```

### Example 4: Fetch Allowlisted Docs

```
User: Use web_get to fetch https://github.com/openai/codex

Returns: {"url": "...", "status": 200, "length": 12345, "clipped": true, "content_preview": "..."}
```

### Example 2: Debug retrieval

```
User: Use rag_search to see what code comes up for "inbound fax handling" in repo-b

Codex will call:
  rag_search(repo="repo-b", question="How do we handle inbound faxes?", top_k=5)

Returns:
{
  "results": [
    {
      "file_path": "app/controllers/faxes_controller.rb",
      "start_line": 45,
      "end_line": 89,
      "language": "ruby",
      "rerank_score": 0.82,
      "repo": "repo-b"
    },
    ...
  ],
  "repo": "repo-b",
  "count": 5
}
```

## Defaults and Behavior

- Generation defaults to local Qwen 3 (Ollama). Set `GEN_MODEL` and `OLLAMA_URL` accordingly, or switch to OpenAI by setting `OPENAI_API_KEY` and `GEN_MODEL` to an OpenAI model.
- Reranking defaults to local cross-encoder. Set `RERANK_BACKEND=cohere` + `COHERE_API_KEY` to use Cohere rerank-3.5.
- LangGraph compiles without Redis if unavailable; Redis is used for checkpointing when present.

## Agent Rules (Codex Behavior)

These rules are documented in [`AGENTS.md`](AGENTS.md) and should be enforced:

1. **Never assume the user is wrong** about file paths, function names, or code locations
2. **Always call RAG tools first** before claiming something doesn't exist
3. **Never hallucinate file paths** — use retrieval results as ground truth
4. **Respect repo boundaries** — repo-a and repo-b are separate; never fuse them
5. **Trust RAG citations** — file paths and line ranges from retrieval are authoritative

## Eval Loop

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
    "repo": "repo-a",
    "expect_paths": ["ProviderSetupWizard", "admin_ui", "components"]
  },
  {
    "q": "How do we queue outbound fax jobs?",
    "repo": "repo-b",
    "expect_paths": ["app/", "job", "fax", "outbound"]
  }
]
```

The `expect_paths` uses substring matching — any result containing one of these substrings counts as a hit.

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

- Check that Redis is running: `docker exec rag-redis redis-cli ping`
- Check that Qdrant is running: `curl -s http://127.0.0.1:6333/collections`
- Verify `.env` has `OPENAI_API_KEY`, `REDIS_URL`, `QDRANT_URL`

### "No results returned"

- Verify shared index exists: `ls -lh out.noindex-shared/agro/chunks.jsonl`
- Ensure MCP sees `OUT_DIR_BASE=./out.noindex-shared`:
  - `source scripts/select_index.sh shared` before starting MCP
  - or set via GUI → Infrastructure → “Apply All Changes” (writes `.env`)
- Re-index (fast BM25-only):
  ```bash
  . .venv/bin/activate && REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 \
    python index_repo.py
  ```
- Try retrieval directly:
  ```bash
  . .venv/bin/activate && OUT_DIR_BASE=./out.noindex-shared \
    python - <<'PY'
  from retrieval.hybrid_search import search_routed_multi
  print(search_routed_multi('test', repo_override='agro', final_k=3))
  PY
  ```

### "Codex can't find the tools"

- Verify registration: `codex mcp list`
- Re-register if needed: `codex mcp remove repo-b-rag && codex mcp add repo-b-rag -- ...`
- Check Codex config: `cat ~/.codex/config.toml | grep mcp`

## References

- [Codex MCP docs](https://developers.openai.com/codex/mcp/)
- [MCP specification](https://modelcontextprotocol.io/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [AgentKit announcement](https://openai.com/index/introducing-agentkit/)
### Netlify deploy errors

- Ensure `NETLIFY_API_KEY` is set in the environment running the MCP server
- Verify the target site domain exists in your Netlify account

### web_get blocked

- Only these hosts are allowed: `openai.com`, `platform.openai.com`, `github.com`, `openai.github.io`
