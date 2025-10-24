# Reranker UX and Configuration Spec (Cross-Encoder Focus)

This spec organizes reranker functionality into clear modes and tabs, separating configuration, training, and evaluation. It avoids ambiguity between retrieval and reranking and prepares for future providers without UI rewrites.

## Goals
- Make “Reranker” easy to reason about despite multiple backends.
- Keep BM25/hybrid retrieval separate from the reranking stage.
- Support three reranker modes out of the box (cross-encoder only):
  1) Cloud Providers (e.g., Cohere, Voyage)
  2) Local Pretrained (HF cross-encoders like BAAI/BGE)
  3) Local Learning Reranker (train on feedback/triplets)
- Provide Evals & Regression Analysis tooling as first-class.

## Pipeline Anatomy (Concise)
- Retrieval Stage: BM25, Dense (embeddings), or Hybrid. Tuned via Settings → Retrieval.
- Reranking Stage: Optional. If enabled, chooses one of the three modes above.
- This separation clarifies: BM25 is not the reranker; it’s part of retrieval.

## Tabs in “Reranker” Section
- Configure
  - Toggle “Enable Reranker”
  - Mode selector: Cloud | Local Pretrained | Local Learning
  - Cloud: provider + model dropdown (from model catalog)
  - Local Pretrained: HF model id dropdown (from catalog) or manual id
  - Local Learning: shows model info (e.g., `cross-encoder-agro`), active checkpoint, and training dataset path
  - Confidence/rerank limit knobs (when applicable)
- Train (Local Learning only)
  - Start training; parameters; show logs; current loss/val metrics
  - Artifacts path; current active checkpoint; rollback button
- Evals
  - Baseline/Compare, evaluation dataset selection, run eval, show regression charts
- Logs & Costs
  - View logs (tail/download), show estimated/actual cost for provider usage (when Cloud)
- No-Hits & Cron
  - Inspect no-hit queries (for training data mining)
  - Nightly cron setup/removal for triplets/train/eval cycle

## Settings Layout
- Keep Retrieval settings (BM25/Dense/Hybrid knobs) under Settings → Retrieval (not inside Reranker), to avoid mixing concerns.
- Reranker settings under Settings → Reranker:
  - `RERANK_ENABLED` (bool)
  - `RERANK_BACKEND` enum: `cloud|hf|learning`
  - `RERANK_PROVIDER` (when cloud)
  - `RERANK_MODEL` (cloud model id or HF id)
  - `RERANK_TOP_K` or limit knobs if used
  - Learning model fields: paths to datasets, checkpoints, and training params

## Model Catalog & Dropdowns
- Cloud providers/models populated from `data/models/catalog.json`.
- Local pretrained cross-encoders populated from the same catalog (filtered by capability `rerank`). Manual string input allowed.
- Prices derived from `data/models/prices.json` (Cloud only), surfaced in the UI and used by cost estimator.

## Integration Points (Existing Endpoints)
- `GET/POST /api/reranker/*`: logs, baseline save/compare, cron setup, costs, clicks/nohits, smoketest
- `GET /api/config`, `POST /api/config`: store reranker mode/fields
- `GET /api/cost/estimate*`: display estimated provider costs

## Evals/Data
- Evaluation dataset controls remain under Evals tab; allow choose dataset, run, compare to baseline
- Feedback “clicks” generate triplets used by Training; No-Hits feed into mining

## Naming Alignment
- Replace “Semantic Boosts” label in the UI with “Semantic Boosts” (or “Concepts”) while keeping code paths intact for now (no functional change).

## Tests
- Playwright: Configure tab switches mode and persists config; Evals shows baseline diff; Logs fetch; No-Hits list loads
- Python smoke: reranker endpoints respond; baseline files readable; cron helper renders a command line without immediate execution in CI

