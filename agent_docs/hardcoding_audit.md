# Hardcoding Audit — AGRO RAG Engine

Date: 2025-11-22

- Full hit list (CSV, programmatic): `agent_docs/audit/hardcoding_hits.csv` (2527 rows)
- Method: Ran the exact ripgrep searches provided (no LLM grep), deduped, then categorized with conservative heuristics. Known hotspots were manually inspected and annotated below.

## High-Severity Hotspots (Annotated)

- server/env_model.py:155
  - Prefers Ollama when `OLLAMA_URL` is set; uses hardcoded `max_retries=2`, `chunk_timeout=60`, `total_timeout=300`. Temperature/max_tokens are cached from registry but Ollama HTTP timeouts/retries are inline.
- server/services/rag.py:44
  - `do_search()` calls `search_routed_multi(..., m=4)` with hardcoded multi‑query variant count. Should be registry-driven (e.g., `MQ_REWRITES`).
- retrieval/hybrid_search.py:693–777
  - Qdrant/FAISS routing via `_config_registry.get_str('VECTOR_BACKEND', 'qdrant')`, but Qdrant URL comes from `QDRANT_URL` (ensure registry backed). BM25/card loaders rely on implicit paths. Tracing spans used conditionally.
- retrieval/hybrid_search.py:1173–1230
  - `expand_queries(query, m=4)` default and `search_routed_multi(..., m=4)` pipeline hardcode multi‑query count; uses `generate_text()` for rewrites without model override.
- server/langgraph_app.py:321–326
  - Redis checkpointer URL defaults to `redis://127.0.0.1:6379/0` when `REDIS_URL` missing. Should be from ConfigRegistry with repo-level defaults.
- server/asgi.py:259–288
  - Health checks mix ConfigRegistry with `os.getenv` fallbacks for `QDRANT_URL`, `REDIS_URL`, `OLLAMA_URL`; unify to ConfigRegistry. Default Qdrant base: `http://127.0.0.1:6333`.
- server/tracing.py:80–85
  - `Trace.enabled()` ignores `TRACING_ENABLED` and only keys on mode/LangSmith env. Registry value should gate tracing on/off.
- web/src/components/Chat/ChatSettings.tsx:21–33
  - UI defaults: model `gpt-4o-mini`, temperature 0, maxTokens 1000. Should seed from `/api/config` or `/api/prices` + ConfigRegistry.
- web/src/modules/app.js (multiple)
  - Budget/heuristic seeds default `GEN_MODEL` to `'gpt-4o-mini'` or `'qwen3-coder:14b'` for local/budget=0 paths (e.g., lines 318, 443, 454, 463, 677–684).

## Noteworthy “Config Defaults” (Justified)

- server/models/agro_config_model.py
  - Defaults like `gen_model='gpt-4o-mini'`, `gen_model_cli='qwen3-coder:14b'`, `gen_model_ollama='qwen3-coder:30b'` are Pydantic config defaults. These are authoritative and OK as defaults (low severity). Ensure all runtime reads use ConfigRegistry instead of raw env.

## Known Files – Specific Notes

- server/env_model.py:155–220
  - Provider routing: prefers MLX if `_ENRICH_BACKEND=='mlx'` or model starts with `mlx-community/`; else prefers Ollama if `OLLAMA_URL` is set; else OpenAI Responses. Timeouts/retries hardcoded for Ollama path (`60s` chunk, `300s` total, `2` retries, exponential backoff).
  - Action: Move timeouts/retries to GenerationConfig (e.g., `GEN_TIMEOUT`, `GEN_RETRY_MAX`, `OLLAMA_CHUNK_TIMEOUT`, `OLLAMA_TOTAL_TIMEOUT`) via ConfigRegistry; add UI controls.

- server/services/rag.py:35–46,56–75,78–120
  - `do_search`: `m=4` hardcoded; `top_k` reads `FINAL_K` or `LANGGRAPH_FINAL_K`. `do_answer`: LangGraph fallback used if graph build fails. `do_chat`: env overrides use OS env and trigger reloads; fast mode forces `DISABLE_RERANK=1`, `VECTOR_BACKEND='faiss'`, `MQ_REWRITES=1`.
  - Action: Replace hardcoded `m=4` with `MQ_REWRITES` (default from config). For fast mode toggles, read/write via ConfigRegistry session override facility rather than raw env where possible.

- retrieval/hybrid_search.py:680–760
  - Qdrant client uses `QDRANT_URL`; backend switch via `VECTOR_BACKEND` to faiss avoids remote query. Payload includes fields set inline; sparse/dense limits are function args with defaults (75/75/10 upstream). Errors printed to stdout; consider logging.
  - Action: Ensure `QDRANT_URL` comes from ConfigRegistry; promote topk defaults to RetrievalConfig and GUI.

- retrieval/hybrid_search.py:1176–1228
  - Multi‑query expansion defaults `m=4`; calls `generate_text()` with no explicit model override (so GEN_MODEL). Dedup/limit to `[:m]`.
  - Action: Make `m` a registry key `MQ_REWRITES`; surface in GUI.

- server/langgraph_app.py:1–40,232–320
  - Uses RedisSaver; `DB_URI = os.getenv('REDIS_URL','redis://127.0.0.1:6379/0')`. System prompt pulled from registry (good). Fallback path compiles without checkpoint when Redis fails.
  - Action: Source Redis URL from ConfigRegistry; provide GUI field; keep fallback compile behavior.

- server/asgi.py:200–520
  - Mixed config sources: uses ConfigRegistry for most, but health checks use `os.getenv` directly. Default Qdrant base `'http://127.0.0.1:6333'` is hardcoded.
  - Action: Normalize all to ConfigRegistry; define explicit keys with defaults in config model. Keep short health timeouts in config.

- server/tracing.py:80–85
  - `enabled()` ignores `TRACING_ENABLED` and bases solely on mode/LangSmith env. Comments indicate enabling tied to `LANGCHAIN_TRACING_V2`.
  - Action: Honor `TRACING_ENABLED` first; if 0, return False. Respect `TRACE_SAMPLING_RATE`.

- web/src/components/Chat/ChatSettings.tsx and web/src/modules/chat.js
  - Defaults hardcode model/knobs; partial seeding from `/api/prices`. Should seed from `/api/config`/ConfigRegistry and persist changes back to backend.
  - Action: Initialize from `/api/config` env keys; only use UI defaults when backend returns empty.

## Deliverable (All Hits)

- CSV with every hit, categorized + remediation/test hints: `agent_docs/audit/hardcoding_hits.csv`
  - Columns: path, line, summary (the matched line), category, severity, remediation_hint, test

## Fix Plan (By Category)

- Providers/Models
  - Introduce per‑task keys: `GEN_MODEL`, `MQ_REWRITE_MODEL`, `ENRICH_MODEL`, plus backend selectors (`ENRICH_BACKEND`, `VECTOR_BACKEND`). Ensure all reads go through ConfigRegistry. Expose in GUI pickers seeded from `/api/prices`.

- Timeouts/Retries
  - Add to GenerationConfig/RetrievalConfig: `GEN_TIMEOUT`, `GEN_RETRY_MAX`, `OLLAMA_CHUNK_TIMEOUT`, `OLLAMA_TOTAL_TIMEOUT`, `QDRANT_TIMEOUT`. Default conservatively; make writable via GUI.

- URLs/Hosts/Ports
  - Centralize endpoints under Indexing/Tracing config: `QDRANT_URL`, `REDIS_URL`, `OLLAMA_URL`, `API_BASE`. Remove direct `os.getenv` reads in routers; use ConfigRegistry with file/env override cascade.

- Search/Rerank Knobs
  - Promote inline constants to config: `FINAL_K`, `LANGGRAPH_FINAL_K`, `MQ_REWRITES`, `TOPK_DENSE`, `TOPK_SPARSE`, `DISABLE_RERANK`, `RERANK_BACKEND`, `RERANKER_MODEL`. Surface in GUI with sensible tooltips.

- Tracing/Toggles
  - Enforce `TRACING_ENABLED` and `TRACING_MODE` from ConfigRegistry. Respect `TRACE_SAMPLING_RATE`. Keep LangSmith integration behind explicit opt‑in.

## Smoke Tests To Prove Fixes

- Model/Provider
  - Edit `agro_config.json` → set `GEN_MODEL` to a new value; GET `/api/pipeline/summary` shows updated `generation.model/provider`; Chat default reflects new model.
- Timeouts/Retry
  - Set `GEN_TIMEOUT=2`, `GEN_RETRY_MAX=1`; POST `/api/chat` with long prompt; verify request times out per config and logs reflect retry count.
- URLs/Hosts
  - Point `QDRANT_URL` to a non‑default host; GET `/api/pipeline/summary` → `health.qdrant` transitions from ok→fail predictably; restore and verify ok.
- Knobs
  - Change `FINAL_K` and `MQ_REWRITES`; compare `/api/search?q=...` result counts before/after; pipeline summary top_k matches config.
- Tracing
  - Toggle `TRACING_ENABLED` 0/1; run `/answer`; confirm traces present in `out/<repo>/traces/` (local) or LangSmith run exists only when enabled and sampling allows.

---

Note: Config defaults defined in `server/models/agro_config_model.py` are considered legitimate defaults (low severity). The audit flags runtime hardcoding across server/retrieval/web that bypasses ConfigRegistry or embeds provider‑specific strings/URLs/timeouts.

