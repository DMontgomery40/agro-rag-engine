## Reranker System — Research Summary (2025-11-13)

This summarizes the current state of the reranker stack in AGRO, focusing on the “self‑learning cross‑encoder” (flagship), other local/API rerankers, endpoints, training/eval flows, and UI wiring. It aggregates references from code, agent_docs, and internal_docs.md/.

### High‑Level Picture
- Primary reranker = CrossEncoder (SentenceTransformers) with self‑learning loop.
  - Code: `server/reranker.py` implements lazy load, hot‑reload, scoring+blend, and info reporting.
  - Env controls: `AGRO_RERANKER_MODEL_PATH`, `AGRO_RERANKER_ENABLED`, `AGRO_RERANKER_ALPHA`, `AGRO_RERANKER_TOPN`, `AGRO_RERANKER_BATCH`, `AGRO_RERANKER_MAXLEN`, `AGRO_RERANKER_RELOAD_ON_CHANGE`, `AGRO_RERANKER_RELOAD_PERIOD_SEC`.
  - Models present: `models/cross-encoder-agro/` and `.baseline/` with READMEs referencing MiniLM L12/L6 v2.
  - Hot‑reload by directory mtime change; designed to pick up promoted models without restart.

- Additional rerankers/APIs intended:
  - Cohere (cloud): referenced in `server/reranker_info.py` and GUI; enabled if `COHERE_API_KEY` present; model name via `COHERE_RERANK_MODEL`.
  - Future placeholders in docs mention BAAI/BGE and VoyageAI, but no active server code found wiring those yet in this repo snapshot.

### Server Endpoints (observed)
- Live in `server/app.py` (many training/eval routes) and `server/reranker_info.py`:
  - Info: `GET /api/reranker/info` → returns current config (enabled, model path, device, alpha/topn/batch/maxlen, reload flags).
  - Available: `GET /api/reranker/available` → returns available reranker options (local cross‑encoder, Cohere) based on env.
  - Training/eval/mining (from `app.py`): `/api/reranker/mine`, `/api/reranker/train`, `/api/reranker/evaluate`, `/api/reranker/status`, `/api/reranker/logs`, `/api/reranker/triplets/count`, `/api/reranker/baseline/*`, `/api/reranker/rollback`, `/api/reranker/smoketest`, etc. (These underpin the self‑learning pipeline.)

### GUI Integration
- Legacy GUI module `gui/js/reranker.js` is extensive (>1k loc):
  - Handles feedback capture, triplet mining, training and evaluation orchestration, costs/logs, baseline comparison, rollback, and a live terminal UI.
  - Expects the endpoints listed above to be present.
- React RAG panels (new):
  - External Rerankers panel → reads `/api/reranker/available` (404 earlier on branch until we unified; present now).
  - Learning Ranker panel → reads `/api/reranker/info` live.
  - Retrieval panel → exercises `/search` and `/answer` against selected repo to observe effective behavior.

### Internal Docs (key design notes)
- `internal_docs.md/reranker-phase2.md` documents Phase 2:
  - Update plan: top‑N gate, hot‑reload, promotion scripts.
  - Training pipeline: `scripts/mine_triplets.py`, `scripts/train_reranker.py`, `scripts/eval_reranker.py`, `scripts/promote_reranker.py` and crontab automation.
  - Promotion: creates/updates a `models/cross-encoder-current` symlink; server hot‑reload picks up new target within ~60s.
  - Info endpoint spec (now implemented). Baseline compare/rollback also described.
- `internal_docs.md/reranks-runbook.md`: settings planned in GUI for RERANK_BACKEND (`none`, `local`, `hf`, `cohere`) and `RERANKER_MODEL` default (`BAAI/bge-reranker-v2-m3`). Not all of these are wired server‑side yet.
- `agent_docs/documentation_links.py`: collates links for BAAI/BGE, Cohere, Qdrant reranker docs—evidence of intention to support multiple rerankers.

### Current State (verified)
- Local CrossEncoder working:
  - `/api/reranker/info` returns enabled=true; model_loaded=true; device=mps:0.
  - `/search` + `/answer` endpoints healthy under Docker.
- `/api/reranker/available` endpoint exists and returns options based on env (local, Cohere) in this repo snapshot; earlier 404 was likely branch/config nuance but present in current development after merge.
- GUI smoke passes; RAG subtabs visible; React panels render live info.

### Gaps / Risks
1) Multi‑backend switching:
   - Server does not yet expose a unified `RERANK_BACKEND` switch (none/local/hf/cohere/voyage/bge). Internal docs mention it, but code implements only local cross‑encoder + partial Cohere availability listing. No Voyage/BGE server wiring present.
2) Training pipeline ergonomics:
   - Legacy GUI has heavy logic for terminal/controls. React parity requires careful migration to avoid feature loss.
   - Nightly crontab automation described; scripts need validation in Docker context (paths, permissions, volumes, model dirs).
3) Hot‑reload robustness:
   - Depends on mtime scan of model path; for symlink promotions it should work, but needs explicit tests in containerized env.
4) Cost/telemetry integration:
   - Needs confirmation that cost counters account for cross‑encoder compute time and any cloud reranker costs (Cohere).

### End‑State Goals (proposed)
- Backend:
  - Pluggable `RERANK_BACKEND` with adapters: `none` | `local_ce` | `cohere` | `hf_bge` | `voyage` (as available).
  - Consistent response envelopes for reranker metadata and eval results.
  - Solid train/eval/promote/rollback pipeline with container‑friendly scripts and hot‑reload tests.
- Frontend (GUI):
  - Keep legacy stable; progressively migrate Reranker UI to React panels with identical capabilities (feedback capture, mining, training, eval, baseline compare, rollback, logs/metrics).
  - Surface all tunables (alpha, topN, batch, maxlen, backend select, model IDs) clearly and persist via /api/config.
- Ops:
  - Nightly (optional) job for mining+train+promote with guardrails (min data thresholds, rollback protection).
  - Grafana panels for reranker metrics (triplets mined, train accuracy deltas, eval trends, model version info).

### Roadmap (phased, test‑gated)
1) Stabilize Local CE Path (short‑term)
   - Add backend smoke tests for `/api/reranker/info` hot‑reload and promotion (simulate symlink flip in container volume).
   - Ensure `/api/reranker/available` reflects env accurately (local/cohere) — add a small test.
   - Confirm cost/telemetry increments during reranker usage.

2) Backend Adapter Interface (mid‑term)
   - Introduce `RERANK_BACKEND` switch; refactor reranking callsite (`rerank_candidates`) to dispatch to provider adapters (local CE, Cohere first; BGE/Voyage as future work).
   - Add config validation (/api/config-schema) for reranker settings (backend-specific fields).

3) React UI Parity (mid‑term)
   - Port training/eval/rollback panels from `gui/js/reranker.js` into React with progressive enablement.
   - Provide clear status and logs, keep legacy terminal for now if necessary, but plan a React LiveTerminal equivalent.

4) Cloud Rerankers (long‑term)
   - Cohere: implement server adapter, rate limiting, error transparency; reflect costs.
   - VoyageAI/BGE/HF: add adapters as needed; unify interface and env config; update `/api/reranker/available` accordingly.

5) Nightly Automation & Observability (long‑term)
   - Container‑safe cron or orchestrator job; volumes mounted for models and logs.
   - Grafana dashboards for reranker KPIs.

### What’s likely “far out”
- Full backend‑agnostic reranker with parity across local and multiple cloud vendors, complete React parity for all training/eval flows, and production‑grade nightly promotion tooling. This is feasible but non‑trivial — expect multiple iterations with careful test gating.

### Immediate Recommendations
- Lock in the local CE backend (it’s already working):
  - Add small tests under `tests/` to assert `/api/reranker/info` shape and hot‑reload behavior.
  - Keep React ExternalRerankers panel reading `/api/reranker/available` (now live), but hide/disable actions for unsupported backends until adapters exist.
  - Document env knobs in the GUI with persistence via `/api/config`.

