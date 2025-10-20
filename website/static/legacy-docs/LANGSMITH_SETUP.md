LangSmith Observability — Quick Setup (AGRO)

![Trace & Tune](../assets/tune_and_trace.png)

This repo already includes a minimal LangSmith integration via `server/tracing.py`. Turning it on is a matter of setting a few environment variables (via the GUI) and running a query.

What you get
- Root run per request (RAG.run) with child events for retrieval, rerank, gating, and generation decisions.
- Works for both HTTP (`/answer`) and CLI/MCP flows.

Prereqs
- Dependencies: `langchain` and `langsmith` (pinned in `requirements-rag.txt`).
- API key: `LANGCHAIN_API_KEY` (starts with `ls_`)

Enable via GUI (preferred)
1) Open the GUI (make dev or `uvicorn server.app:app --host 127.0.0.1 --port 8012`).
2) Tab “Misc” → LangSmith section:
   - `LangChain Tracing V2` → On
   - `LangChain Project` → your project (e.g., `agro`)
   - `LangSmith Endpoint` → `https://api.smith.langchain.com` (default)
   - `LangSmith API Key` → `ls_...`
3) Click “Apply All Changes”. This writes `.env` and applies to the running server.

Test
1) Hit the API once to generate a trace:
   - `curl -s "http://127.0.0.1:8012/answer?q=Where%20is%20hybrid%20retrieval%20implemented?&repo=agro" | jq .`
2) Open LangSmith (Observability → Projects) and select your project. You should see a new run `RAG.run`.

How it works
- `server/tracing.py`:
  - Reads `LANGCHAIN_TRACING_V2`, `LANGCHAIN_PROJECT`, `LANGCHAIN_ENDPOINT`, `LANGCHAIN_API_KEY` from env.
  - Starts a root run `RAG.run` when a request begins and ends it at completion.
  - Each internal event (retriever, reranker, gating decision, packing) is recorded as a child run.

Notes
- This integration uses LangChain’s `LangChainTracerV2`. It does not wrap OpenAI calls directly; rather, it records meaningful RAG stages with inputs/outputs to keep costs low and traces compact.
- You can switch between local JSON traces and LangSmith by toggling `LangChain Tracing V2` in the GUI.

Troubleshooting
- No runs appear:
  - Confirm env via `/api/config` -> `env` shows `LANGCHAIN_TRACING_V2=1` and your API key.
  - Check server logs for `LangChainTracerV2` import errors; install deps: `. .venv/bin/activate && pip install -r requirements-rag.txt`.
- Wrong project:
  - Set `LANGCHAIN_PROJECT` in the GUI and click Apply (persists to `.env`).
