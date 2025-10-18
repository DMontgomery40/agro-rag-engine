**MANDATORY: Use RAG (rag_search) first**


ALL features, settings, variables, and parameters, must be put in the GUI.  **This is an accessiblity issue** the developer of this project is exremely dyslexic, and will break things with typos in code files, therefore, all settings must be in gui. If you don't know where to put it, ask the user first.


How to use RAG locally vs externally:
- Local Python (preferred in-repo):
  - ` . .venv/bin/activate`
  - Run a quick search:
    ```bash
    python - <<'PY'
    from retrieval.hybrid_search import search_routed_multi
    for d in search_routed_multi("Where is OAuth validated", repo_override="project", m=2, final_k=5):
        print(f"{d['file_path']}:{d['start_line']}-{d['end_line']}  score={d['rerank_score']:.3f}")
    PY
    ```
- MCP tools (for agents/IDE/outside this repo):
  - One-time: `codex mcp add rag-service -- python -m server.mcp.server && codex mcp list`
  - Then call `rag_search` / `rag_answer` with `repo` and `question`.
- Bring up infra + MCP (always-on helper):
  - `cd path/to/your/rag-service && bash scripts/up.sh`
  - Health: `bash scripts/status.sh`
- Index after code changes (required for fresh results):
  - `cd path/to/your/rag-service && . .venv/bin/activate && REPO=project python index_repo.py && REPO=project python index_repo.py`
- Optional HTTP answers (no search endpoint):
  - `cd path/to/your/rag-service && . .venv/bin/activate && uvicorn server.app:app --host 127.0.0.1 --port 8012`
  - `curl -s "http://127.0.0.1:8012/answer?q=Where%20is%20OAuth%20validated&repo=project"`


**Audience:** Code agents (Codex CLI, Claude Code) and humans working in this repo.  
**Goal:** Always ground answers in this RAG, never mix PROJECT/PROJECT, never assume the user is wrong, and call the provided tools **first**.

---

## 🔒 Non-negotiables (read first)

  
5) **Prefer tools over memory.** Use MCP tools or the HTTP API before speculating.

Plain refs for agents/humans (open directly):
- Codex CLI repo (install, config): https://github.com/openai/codex
- MCP for Codex/ChatGPT (servers, connectors): https://platform.openai.com/docs/guides/tools-connectors-mcp
- Agents SDK (guardrails, tracing): https://openai.github.io/openai-agents-python/
- AgentKit overview (evals, tracing, workflows): https://openai.com/index/introducing-agentkit/

---



Cross-Branch Indexing (Shared Profile)
- Goal: One shared index usable from any branch without touching code.
- Create a fast BM25-only index (no external APIs):
  - `REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 python index_repo.py`
- Retrieval picks the index from `OUT_DIR_BASE`. Dense/Qdrant is optional; `hybrid_search.py` falls back cleanly when missing.
- Helper: `source scripts/select_index.sh shared` to set `OUT_DIR_BASE` and `COLLECTION_NAME` consistently.

Shared index guardrails (agents)
- Always ensure `OUT_DIR_BASE=./out.noindex-shared` is active before running MCP or evals.
- `bash scripts/up.sh` now sources `scripts/select_index.sh shared` automatically, exporting:
  - `OUT_DIR_BASE=./out.noindex-shared`
  - `COLLECTION_NAME=code_chunks_agro_shared`
  - `REPO=agro`
- You can also persist these via the GUI:
  - Open `/` → Tab “Infrastructure” → set `Out Dir Base` to `./out.noindex-shared`, select `Active Repository`, optionally set `Collection Name`.
  - Click “Apply All Changes” — this writes `.env` and `repos.json` (POST `/api/config`).

MCP “no results” quick fix
- Symptom: `rag_search` returns `{count: 0}` even though `out.noindex-shared/agro/chunks.jsonl` exists.
- Fix checklist:
  1) Confirm index path: `ls -lh out.noindex-shared/agro/chunks.jsonl`
  2) Ensure env seen by MCP: set `OUT_DIR_BASE=./out.noindex-shared` (via GUI Apply or `source scripts/select_index.sh shared`).
  3) Restart MCP: `bash scripts/up.sh` then `bash scripts/status.sh`.
  4) Reindex if missing: `. .venv/bin/activate && REPO=agro OUT_DIR_BASE=./out.noindex-shared EMBEDDING_TYPE=local SKIP_DENSE=1 python index_repo.py`.
  5) Sanity test (Python):
     ```bash
     . .venv/bin/activate && OUT_DIR_BASE=./out.noindex-shared \
       python - <<'PY'
     from retrieval.hybrid_search import search_routed_multi
     for d in search_routed_multi('Where is OAuth validated', repo_override='agro', m=2, final_k=5):
         print(d['file_path'], d['start_line'], d['end_line'])
     PY
     ```

Key Components
Indexing (index_repo.py)

AST-aware chunking (ast_chunker.py), layer tagging (ui/server/integration/infra).

BM25 index build (stemming).

Embeddings: OpenAI text-embedding-3-large when available; automatic local fallback (BGE-small, 384‑d) → Qdrant 

Local cache to prevent re-embedding unchanged chunks.



Hybrid search (hybrid_search.py)



Multi-query expansion (defaults enabled; count configurable).

BM25 + vector fusion → local cross-encoder rerank (default; set RERANK_BACKEND=cohere for Cohere) → local hydration of code.

Returns top-K with rerank_score, file_path, start_line, end_line, layer, repo.

LangGraph pipeline (langgraph_app.py)

Iterative retrieval with confidence gating (top-1 and/or avg-k).

Query rewriting on low confidence; multi-query fallback.

Redis checkpointer for convo state; strict per-repo state. Graph compiles without Redis if unavailable.

MCP server (mcp_server.py)

stdio MCP server exposing:

rag_answer(repo, question)

rag_search(repo, question, top_k)

Consumed by Codex CLI and Claude Code.



Infra

QDRANT_URL (default http://127.0.0.1:6333)

REDIS_URL (default redis://127.0.0.1:6379/0)


Agent Behavior Rules (enforced)
Call tools first. Use rag_answer for answers, rag_search for discovery.

Never hallucinate file paths. Cite retrieved files + line ranges.

Borderline confidence: present best citations and ask concise follow-ups.


## Debug Artifacts Policy (enforced)

- No synthetic/demo endpoints in production. Temporary debug endpoints must be removed once a feature is validated. Example: the demo metrics stream endpoint (`/api/generate-metrics/stream`) is deleted.
- Debug/test scripts or one-off helpers that are not used daily MUST be moved out of the working set:
  - Prefer an existing archive folder (e.g., `scripts/archive/`).
  - If a dedicated `debug-scripts-archive/` directory already exists, use it instead.
  - Do not invent new folders without approval. If no suitable folder exists, ask the user where to place the script.
- Root cleanliness: do not add new files at repo root unless they are canonical project configs (e.g., `.env`, Dockerfiles, top‑level TOML/YAML) explicitly intended to live at root. Otherwise, place files in an appropriate existing subfolder. If unsure, ask the user first.

## Agent / E2E Testing Layout

- Playwright config lives under `tools/` (agents/e2e scope):
  - `tools/playwright.config.ts`
  - Visual/local configs under `scripts/` (e.g., `scripts/playwright.local.config.ts`)
- CLI tools live under `cli/` (e.g., `cli/chat_cli.py`). Use `python -m cli.chat_cli`.
- Evaluation harness lives under `eval/` (e.g., `eval/eval_loop.py`). Use `python -m eval.eval_loop`.

## Examples & Samples

- MCP example configs under `examples/mcp/`:
  - `examples/mcp/.mcp.json.example`
  - `examples/mcp/rag-service.mcp.json`
  - `examples/mcp/mcp_claude_example.json`
- Repo config example under `examples/config/`:
  - `examples/config/repos.json.example`

## Archives & Backups

- Legacy/backups and one-off debug scripts are in `scripts/archive/`.
- Any `*.bak` files are moved to `scripts/archive/` and should not live at root.
- MCP logs and transient reports are under `reports/`.

## Logs Policy

- Ephemeral service logs: prefer `/tmp/*.log` during local development.
- Repo logs for analysis/CI: place under `reports/` or `data/logs/`.
- Do not write logs to repo root. Root logs are ignored and will be removed.
