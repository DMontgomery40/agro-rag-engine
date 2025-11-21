# Architecture Baseline (Current State)

_Last updated: 2025-10-23_

## Runtime Reranking

- **Primary path**: `retrieval/hybrid_search.py:96-941` calls `ce_rerank` (`retrieval/rerank.py:64-207`), which lazily loads a HuggingFace cross-encoder or Cohere reranker via `rerankers`.
- **HTTP overlay**: `server/app.py:574-643` invokes `server.reranker.rerank_candidates` (`server/reranker.py:31-101`), loading a second `CrossEncoder`. This duplicates work, causes latency, and splits tracing.

## Training & Evaluation Pipeline

- **Triplet mining**: `scripts/mine_triplets.py:1-161` reads `data/logs/queries.jsonl`, outputs `data/training/triplets.jsonl` with absolute file paths.
- **Training**: `scripts/train_reranker.py:1-132` uses deprecated `InputExample` + manual `DataLoader`.
- **Evaluation**: `scripts/eval_reranker.py:1-86` reuses the same dataset tail for testing; `/api/reranker/evaluate` shells it.
- **Promotion**: `scripts/promote_reranker.py:1-92` compares candidate vs current using same data.

## GUI Surface

- RAG > Reranker tab: markup `gui/index.html:3532-3825`, logic `gui/js/reranker.js:1-960`.
- Data Quality tab: keywords API `server/app.py:1030-1394`, cards builder `server/cards_builder.py`, front-end under `gui/js/cards.js`.

## Observability & Testing

- LangTrace spans only exist in `retrieval/rerank.py`; API reranker lacks tracing.
- Smoke tests: `tests/smoke/test_reranker_default_model.py`, `tests/test_rag_smoke.py`. Playwright specs cover reranker info/no-hits but assume current endpoints.

## Pain Points

1. Duplicate cross-encoder loaders.
2. Dataset contamination (absolute paths, weak positives).
3. Outdated training loop.
4. Shared train/dev/test dataset.
5. Terminology drift (“golden questions”, “learning reranker”, “cards”).
6. No provenance for trained models.

This baseline is our starting snapshot; every milestone must document how it changes.
