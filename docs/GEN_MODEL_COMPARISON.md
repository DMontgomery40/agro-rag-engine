# Generation Model Comparison: Qwen 3 vs OpenAI

This guide shows how to run head-to-head comparisons between local Qwen 3 (via Ollama) and OpenAI models for the LangGraph generation step.

What you’ll measure
- Answer latency (end-to-end graph generation)
- Token usage (estimated via `tiktoken`)
- Optional: accuracy via retrieval evals (see `eval/eval_loop.py`)

Prereqs
- MCP/infra running: `bash scripts/up.sh`
- Re-index repo: `REPO=agro python index_repo.py`
- For Qwen: `OLLAMA_URL=http://127.0.0.1:11434/api` and the model available (e.g., `qwen3-coder:30b`)
- For OpenAI: `OPENAI_API_KEY` exported

Recommended dataset
- Start with the two high-signal queries used in `scripts/test_token_comparison.py`:
  - “Where is OAuth token validated” (agro)
  - “How are fax jobs created and dispatched” (agro)

Run: Qwen 3 (local)
```bash
. .venv/bin/activate
export PYTHONPATH=.
export OLLAMA_URL=http://127.0.0.1:11434/api
export GEN_MODEL=qwen3-coder:30b
python scripts/test_token_comparison.py
```

Run: OpenAI (Responses/Chat)
```bash
. .venv/bin/activate
export PYTHONPATH=.
unset OLLAMA_URL
export GEN_MODEL=gpt-4o-mini  # or your chosen OpenAI model
python scripts/test_token_comparison.py
```

Notes
- The comparison script reports tokens for four approaches; focus on “2. RAG CLI Standalone” for generation head-to-head.
- If OpenAI embeddings hit quota, retrieval still works with local fallback; this does not affect generation comparison.
- If you want a larger suite, add questions to `golden.json` and/or duplicate the test list at the bottom of `scripts/test_token_comparison.py`.

Optional: structured benchmark
- Capture wall-clock timings using `/usr/bin/time -lp` or `time.perf_counter()` around graph invocation.
- Export JSON summaries for regression tracking (modify `scripts/test_token_comparison.py` to dump a machine-readable file).
