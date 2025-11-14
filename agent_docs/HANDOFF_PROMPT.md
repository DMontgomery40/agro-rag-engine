## AGRO RAG Engine — Comprehensive Handoff (Future Agent Brief)

This is a complete, context‑dense handoff to help “future you” (or another agent) pick up the AGRO RAG Engine refactor and deliver a stable, functional build with a clear path to production. It includes personal context, technical status, branch/worktree mapping, what’s been merged, what’s working/broken, problems encountered, and two TODO lists: a scalpel‑tight near‑term plan and a longer production‑ready roadmap. Frequently refer to the repository’s `assets/` and `screenshots/` folders for visual references of “working” states.

---

### 0) Personal Context & Guardrails

- Accessibility & ADA: The user is highly dyslexic. All tunables, runtime state, and status indicators must be visible and operable in the GUI. Do not add stubs or half‑wired UI; do not remove “broken” settings — fix and wire them.
- Stakes: Delivery directly affects the user’s family housing and career prospects. Proceed cautiously, verify at each step, and do not break the working legacy GUI surface.
- Verification Policy (updated): Playwright is used for “non‑black‑screen” and structural smoke only; deep content correctness relies on human screenshots and confirmation. Backend changes must include a minimal smoke test.
- Never push to main; work consolidates into `development`, then hardening on `staging`.

---

### 1) Original Problem (Summarized)

- Repo fragmented across ~28 branches/worktrees with parallel agents. Claude’s code CLI sometimes branched from wrong bases; sub‑agents created multiple worktrees. Good work is scattered; bad changes break UI. React migration in `web/` incomplete; legacy `gui/` (6k LOC HTML) is stable and should remain the default.
- Critical breakage: Subtabs (especially RAG mega‑tab) sometimes missing or in the wrong place in React. Legacy GUI subtabs are correct.
- Ten‑container stack with infra (Qdrant/Redis/Prometheus/Grafana), MCP servers, API, and an embedded editor; startup logic was spread across `infra/`, root Dockerfiles, and scripts.

---

### 2) Branches/Worktrees Snapshot (Local)

Likely‑valuable branches (by area):
- RAG React: `react/rag-tab-and-modules`
- Infrastructure tabs: `react/infrastructure-docker-tabs`
- Core foundation: `react/core-foundation-modules`
- Chat/VSCode/Admin wiring: `react/chat-vscode-admin`
- UI/UX polish: `react/ui-ux-polish`
- Start/onboarding polish: `react/start-tab-final-polish`
- Backend modularization: `feature/backend-modularization`
- UI migration bootstrap: `feature/ui-migration`

Other branches/worktrees exist (e.g., `dash/*`, `claude/*`, `backup/*`). Treat names with skepticism; verify code content before trusting.

---

### 3) What We’ve Merged To `development` (and Why)

Cherry‑picks into `development` (to avoid megamerge conflict hell):
1. Unify Docker stack + smoke infra + React RAG components (additive)
   - Commit f99dc2b: “chore(stack): unify Docker Compose; make Docker default; uvicorn dev‑only; add editor service; add GUI smoke configs; add RAG React subtabs + panels (additive, no legacy disruption)”
   - What:
     - `docker-compose.yml` unified into a single project: qdrant, redis, alertmanager, prometheus, loki, promtail, grafana, api, mcp-http, mcp-node, editor.
     - `scripts/up.sh`: Compose‑first full stack start.
     - `scripts/dev_up.sh`: Docker default; local uvicorn only if `DEV_LOCAL_UVICORN=1`.
     - GUI smokes: `playwright.api-gui.config.ts`, `tests/gui-smoke/black-screen-smoke.spec.ts`, `tests/gui-smoke/rag-subtabs-placement.spec.ts`.
     - React RAG components added (not defaulted): `web/src/components/RAG/*`, `web/src/components/tabs/RAGTab.tsx`.
2. React Navigation module (compatibility, no legacy change)
   - Commit 0d2222b: “feat(web): add full Navigation module for React compatibility (no change to legacy GUI)”
   - What: `web/src/modules/navigation.js` included to support future React activation.
3. RAG React panels wired to real endpoints
   - Commit f6978d9: “feat(rag): wire React RAG panels to live endpoints (/api/config, /search, /answer, /api/reranker/info, /api/reranker/available); keep legacy GUI default”
   - What: Retrieval, Learning Ranker, External Rerankers panels call server endpoints. Legacy GUI remains the default.

Why cherry‑pick: Avoid massive conflicts; only merge additive, verified slices that don’t disturb the stable `gui/` surface.

---

### 4) What’s Working Now (Verified)

- Unified Compose: `docker compose up -d` starts full stack; Grafana always included; Editor included but removable.
- API health: GET `/health` healthy; legacy GUI visible at `/`.
- RAG endpoints: `/search`, `/answer` return results for meaningful queries.
- Reranker endpoints:
  - `/api/reranker/info` → enabled=true; model_loaded=true; device detected; alpha/topN/batch present.
  - `/api/reranker/status`, `/api/reranker/triplets/count`, `/api/reranker/eval/latest` respond with sane data.
- GUI smokes (API‑served): non‑black‑screen and subtabs alignment pass.
- Backend smokes added: `tests/test_reranker_info_api.py` (shape + metadata) passing.

---

### 5) What’s Broken / Gaps / Unknowns

- `/api/reranker/available` returned 404 in the running container despite `server/reranker_info.py` defining it and router inclusion in `server/app.py`. Hypotheses: different app entry module in container path, stale image, or router inclusion drift in an alt entrypoint. Needs targeted check.
- React subtabs/placement: stable in legacy; React version still needs care when activated broadly.
- Editor service image pulls are heavy; start latency. Acceptable, but worth documenting for users.
- Container name conflict if old infra containers exist. Mitigate with `docker compose down -v` before re‑up.
- Multi‑backend reranker switching (BGE/Voyage/Cohere) not fully wired server‑side; intent exists in docs; code partially present (Cohere available list) but not full adapters.
- Nightly mining/train/promote (cron) described in docs; needs Docker‑safe job design and volumes.

---

### 6) Reranker System (Current Understanding)

- Flagship: Self‑learning CrossEncoder via SentenceTransformers (`server/reranker.py`)
  - Hot‑reload by model dir mtime (symlink promotion supported).
  - Blend with base retrieval via `alpha`, and `topN` gate to limit CE scoring.
  - Env toggles: `AGRO_RERANKER_*` (model path, alpha, topn, batch, maxlen, reload flags).
- Endpoints (server):
  - Info: `/api/reranker/info` (works now)
  - Available: `/api/reranker/available` (code present; container returned 404 → investigate)
  - Mine/Train/Eval/Status/Logs/Triplets/Baseline/Rollback: implemented in `server/app.py` (legacy GUI expects these; many verified responding).
- Legacy GUI module `gui/js/reranker.js`: end‑to‑end UI (feedback, mining, training, eval, terminal, baseline compare/rollback).
- Models present in repo: `models/cross-encoder-agro/` and `.baseline/` (MiniLM L12/L6 v2 base). Evidence of working historical evals and baselines.
- Internal docs (`internal_docs.md/`): Phase 2 plan, promotion scripts (`scripts/promote_reranker.py`), and cron automation.

---

### 7) Problems Encountered & How They Were Overcome

- Branch merge conflicts: avoided megamerge; used cherry‑picks for small, testable slices.
- Playwright limitations: constrained to non‑black‑screen + structure; human visual confirmations requested for deeper checks (per updated AGENTS.md).
- Uvicorn vs Docker: dev scripts started host uvicorn; switched to Compose as default and made uvicorn opt‑in (`DEV_LOCAL_UVICORN=1`).
- Container name conflicts: identified; recommend `docker compose down -v` before re‑up when conflicting names exist.

---

### 8) Where Pseudocode/Plans Exist in Docs

- `internal_docs.md/reranker-phase2.md`: inline “cat > …” blocks instructing how to wire endpoints/scripts — these are historical design notes, not stubs currently shipped.
- `agent_docs/documentation_links.py`: catalog of external reranker docs (BAAI/BGE, Cohere, Qdrant reranking) indicating intended support.

---

### 9) Scalpel‑Tight TODO (Near‑Term, Executable)

1) Lock reranker API smokes
   - [ ] Add small tests for `/api/reranker/status` and `/api/reranker/triplets/count` shapes.
   - [ ] Investigate `/api/reranker/available` 404 in container:
       - [ ] Confirm server entry (app vs asgi) includes `reranker_info_router`.
       - [ ] Rebuild image (no cache), verify route list, test endpoint.

2) Legacy GUI reranker flow validation (human‑visible)
   - [ ] In docker, click Run “Mine Triplets”, “Train”, “Evaluate”, observe `/api/reranker/status` → live_output/progress.
   - [ ] Capture screenshots and compare to `assets/` and `screenshots/` references (e.g., training complete, eval latest metrics, baseline compare).

3) React RAG parity for reranker (additive, do not disrupt legacy)
   - [ ] Port the minimal eval+baseline panels from `gui/js/reranker.js` into React `LearningRankerSubtab` behind a flag.
   - [ ] Keep legacy terminal; consider adding a light React terminal wrapper later.

4) Compose UX hygiene
   - [ ] Add `scripts/down.sh` to stop/remove stack cleanly.
   - [ ] Makefile helpers: `make stack`, `make stack-down`, `make api-logs`.

5) Document knobs in GUI (accessibility)
   - [ ] Surface `AGRO_RERANKER_*` settings in Admin/Infrastructure tabs and persist via `/api/config`.

---

### 10) Bigger‑Picture Production Roadmap

Backend adapters & validation
- [ ] Introduce `RERANK_BACKEND` with adapters: `none` | `local_ce` | `cohere` | `hf_bge` | `voyage`.
- [ ] Implement Cohere adapter (rate limiting, error transparency) and reflect costs in metrics.
- [ ] Add config/schema validation for reranker settings; expose via `/api/config-schema`.

React UI parity (move carefully)
- [ ] Migrate remaining reranker flows from legacy to React (feedback capture, mining, training, eval, baseline compare/rollback, logs).
- [ ] Provide robust status view with retries and clear errors; preserve accessibility text.

Automation & Observability
- [ ] Docker‑safe nightly job: mine→train→eval→promote with guardrails (min data thresholds, delta accuracy gate, auto‑rollback).
- [ ] Grafana dashboards: triplets mined, eval trends, model version, training duration, CE compute usage, provider costs (Cohere, etc.).

Testing & Release
- [ ] Add hot‑reload test: symlink `models/cross-encoder-current` change triggers info reload in ≤60s.
- [ ] Expand GUI smokes to nav flows without deep DOM asserts (structure only).
- [ ] Human QA pass with screenshots at each major tab/subtab; compare against `assets/` reference images.

Docs & Dev Ergonomics
- [ ] README + AGENTS.md clarifications; quickstart: `docker compose up -d`, health, GUI smokes, minimal backend smokes.
- [ ] “Troubleshooting” for container name conflicts and editor image pulls.

---

### 11) How To Run & Verify

Start the stack (Docker default):
- `docker compose up -d`
- Health: `curl -s http://127.0.0.1:8012/health`
- GUI smoke: `npx playwright test -c playwright.api-gui.config.ts`

Optional local uvicorn (dev only):
- `DEV_LOCAL_UVICORN=1 make dev`

Reranker API checks:
- Info: `curl -s http://127.0.0.1:8012/api/reranker/info | jq .`
- Status: `curl -s http://127.0.0.1:8012/api/reranker/status | jq .`
- Triplets: `curl -s http://127.0.0.1:8012/api/reranker/triplets/count | jq .`
- Eval latest: `curl -s http://127.0.0.1:8012/api/reranker/eval/latest | jq .`

Backend tests:
- `. .venv/bin/activate; pytest -q tests/test_reranker_info_api.py`

---

### 12) Assets To Reference Frequently

- `assets/` — curated screenshots for “working” states of tabs (Dashboard, Chat, Grafana, RAG). Use these as the source‑of‑truth for visual confirmation.
- `screenshots/` — test and manual screenshots; cross‑check UI micro‑interactions and subtabs placement.
- Root PNGs (`gui-*.png`, `vscode-*.png`, etc.) document prior working states; match them during verification.

---

### 13) Final Notes To Future Agent

- Do not break `gui/`. React `web/` is strictly additive until proven.
- Only merge slices that pass the dockerized smokes; get human screenshots for deeper UI confirmation.
- If a branch looks promising, spin a temporary worktree, run API + smoke, cherry‑pick only the good parts.
- Keep changes small, testable, and reversible. Preserve the user’s cognitive load — surface all essential controls in the GUI and label them clearly.

