# Quick Start: MCP + Codex Integration

## What Got Implemented ✓

1. **MCP Server** (module: `server.mcp.server`) - stdio-based tool server
2. **MCP Tools**:
   - `rag_answer(repo, question)` → full answer + citations
   - `rag_search(repo, question, top_k)` → retrieval only
   - `netlify_deploy(domain)` → trigger Netlify build (your domains; requires `NETLIFY_API_KEY`)
   - `web_get(url, max_bytes)` → HTTP GET for allowlisted hosts (openai.com, platform.openai.com, github.com, openai.github.io)
3. **Codex Registration** - Register as `rag-service` (recommended)
4. **Agent Rules** - Updated in `AGENTS.md`
5. **Eval Loop** - `eval/eval_loop.py` with baselines and regression tracking
6. **Golden Tests** - `golden.json` with 10 test cases

## Before You Start

- Bring everything up (infra + MCP + API + open GUI):
  - `make dev`  (or `bash scripts/dev_up.sh`)
- Alternative (manual):
  - `bash scripts/up.sh`  (infra + MCP)
  - `make api`            (runs uvicorn)
- Configure host/port and Docker preference in the GUI → Misc tab → “Apply All Changes”. These persist to `.env` and are read on next run.
- Index your repo (once per code change):
  - `REPO=agro python -m indexer.index_repo`
- Defaults:
  - Generation → Qwen 3 via Ollama (`GEN_MODEL` + `OLLAMA_URL`)
  - Rerank → Cohere (`RERANK_BACKEND=cohere`, `COHERE_RERANK_MODEL=rerank-3.5`)

Shared index across branches (recommended)
- Use a single index so MCP and local tools always agree:
  ```bash
  . .venv/bin/activate
  REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 python -m indexer.index_repo
  # Export consistent env for MCP/tools
  source scripts/select_index.sh shared
  ```
The GUI can persist these via “Apply All Changes” (Infrastructure tab: set `Out Dir Base=./out.noindex-shared`).

## Quick Commands

### Check MCP Registration
```bash
codex mcp list
# Should show: rag-service
```

### Test MCP Tools Manually
```bash
. .venv/bin/activate

# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python -m server.mcp.server
```

### New Tools: Quick Examples

```bash
# Netlify deploy (from Codex chat)
# User: Use netlify_deploy to rebuild example.dev

# Web GET (allowlisted)
# User: Use web_get to fetch https://github.com/openai/codex
```

### Run Evals
```bash
. .venv/bin/activate

# Run once
python -m eval.eval_loop

# Save baseline
python -m eval.eval_loop --baseline

# Compare vs baseline
python -m eval.eval_loop --compare

# Watch mode (auto re-run on changes)
    python -m eval.eval_loop --watch
```

### Use in Codex Chat

Open a new Codex session and try:

```
User: Use rag_search to find code related to "OAuth token validation" in agro

User: Use rag_answer to explain how inbound faxes are processed in agro
```

Codex will automatically call the registered MCP tools and display results.

## Architecture

```
Codex CLI
    ↓ (MCP stdio)
mcp_server.py
    ├─→ rag.answer → langgraph_app.py → hybrid_search.py
    └─→ rag.search → hybrid_search.py
                          ↓
                  Qdrant + Redis + BM25
                          ↓
                  out/agro/chunks.jsonl
                  out/agro/chunks.jsonl
```

## Agent Behavior Rules

These are now documented in `AGENTS.md`:

1. ✗ Never assume user is wrong about paths/functions
2. ✓ Always call RAG tools first before claiming something doesn't exist
3. ✗ Never hallucinate file paths
4. ✓ Respect repo boundaries (no cross-repo mixing)
5. ✓ Trust RAG citations as authoritative

## Files Created

| File | Purpose | Size |
|------|---------|------|
| `mcp_server.py` | MCP stdio server | 11KB |
| `eval/eval_loop.py` | Eval harness with regression tracking | 8KB |
| `golden.json` | Test cases (10 questions) | 1.4KB |
| `MCP_README.md` | Full documentation | 5.5KB |
| `test_mcp.sh` | Manual test script | 2.8KB |

## Next Steps

1. **Add more golden test cases** to `golden.json`
2. **Run baseline**: `python -m eval.eval_loop --baseline`
3. **Try in Codex**: Open chat and use `rag_answer` or `rag_search`
4. **Monitor regressions**: `python -m eval.eval_loop --watch` (runs on code changes)

## Troubleshooting

**"Graph not initialized"**
- Use the helper: `bash scripts/up.sh` (handles infra + background MCP)
- Check Redis: `docker exec rag-redis redis-cli ping`
- Check Qdrant: `curl -s http://127.0.0.1:6333/collections`
- Note: Graph compiles without Redis if temporarily unavailable.

**"No results"**
- Verify shared index exists: `ls -lh out.noindex-shared/agro/chunks.jsonl`
- Ensure MCP sees shared env: `source scripts/select_index.sh shared` (or set in GUI → Apply All Changes)
- Index repos (BM25-only fast path): `REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 python index_repo.py`
- Verify collections (optional): `curl -s http://127.0.0.1:6333/collections | jq`

- Re-register: `codex mcp remove rag-service && codex mcp add rag-service -- .venv/bin/python -m server.mcp.server`
- Ensure MCP is running: `bash scripts/status.sh`

## References

- Full docs: [`MCP_README.md`](MCP_README.md)
- Agent guidelines: [`AGENTS.md`](AGENTS.md)
- Project runbook: [`new_agents_runbookd.md`](new_agents_runbookd.md)
