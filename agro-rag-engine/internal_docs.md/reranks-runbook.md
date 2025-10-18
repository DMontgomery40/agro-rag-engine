Reranking Rollout Runbook (GUI‑First)
=================================================

Purpose
- Track the end‑to‑end rollout of cross‑encoder reranking with a strict GUI‑first configuration workflow. This prevents typo‑drift in code and centralizes all settings in the app UI.

Status Legend
- [ ] Pending
- [x] Completed

Checklist

1) Prereqs and Environment
- [ ] Ensure active repo is set to `agro` in GUI → Configuration → Repositories (or Infrastructure), then click “Apply All Changes”.
- [ ] Set `OUT_DIR_BASE` to `./out.noindex-shared` in GUI → Infrastructure, then “Apply All Changes”.
- [ ] Confirm `REPO=agro` appears in `/api/config` and in `.env` after Apply.

2) GUI: Add Reranking Controls (must be in GUI)
- [x] Add `RERANK_BACKEND` select with options: `none`, `local`, `hf`, `cohere`.
- [x] Add `RERANKER_MODEL` text input (default `BAAI/bge-reranker-v2-m3`).
- [x] Add `COHERE_RERANK_MODEL` dropdown with common options (e.g., `rerank-3.5`, `rerank-english-v3.0`, `rerank-multilingual-v3.0`).
- [x] Add `COHERE_API_KEY` password input.
- [x] Add `TRANSFORMERS_TRUST_REMOTE_CODE` toggle (0/1).

2b) GUI: Help Tooltips (verbose)
- [x] Add verbose help tips for all reranking fields (backend choice, models, API key, trust_remote_code).

3) Offline‑Friendly Defaults (no external downloads)
- [x] Set `RERANK_BACKEND=none` (disable reranks) for offline/dev.
- [x] Build BM25‑only index (skip dense): `SKIP_DENSE=1`.

4) Indexing (agro)
- [x] Run indexer for `agro` to generate `bm25_index/` and `chunks.jsonl` under `out.noindex-shared/agro/`.
- [x] Verify status via GUI → Data & Indexing → “Index Server” or logs show “BM25 index saved.”

5) Retrieval Smoke Test (must use RAG tools)
- [x] Use local RAG to find this runbook by name and cite exact lines.
- [x] Confirm search returns relevant file paths + line ranges.

6) Optional Enhancements (later)
- [ ] Wire `RERANK_INPUT_SNIPPET_CHARS` from `ui/ALL_KNOBS.yaml` into `retrieval/rerank.py` for snippet sizing.
- [ ] Add GUI inputs for `CONF_TOP1`, `CONF_AVG5`, `CONF_ANY` if not already present.
- [ ] Surface per‑repo layer bonuses in GUI for fine‑grained tuning.
- [ ] Add screenshot + quickstart in `reranker-phase2.md` and link from README.

Notes
- Strictly avoid hardcoding settings in code; always expose via GUI. If unsure where to place a setting, add to the “Misc” or “Retrieval” tab.
