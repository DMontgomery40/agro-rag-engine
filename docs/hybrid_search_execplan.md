# Hybrid Search Refactor – Execution Plan & Notes

## What changed
- Rebuilt `retrieval/hybrid_search.py` into a staged pipeline: vector search, BM25 search, card hits, RRF fusion, hydration, rerank, and AGRO-specific bonuses.
- Added `HybridRuntimeConfig` + helpers for dense/sparse stages, fusion, hydration, and scoring; kept public APIs and config knobs intact.
- Introduced `RetrievalOutput` container to simplify passing retrieval results between stages and to blend BM25/vector scores.
- Simplified tracing/metrics hooks while preserving existing step names and registry-driven settings.

## Files touched
- `retrieval/hybrid_search.py`: pipeline refactor, helper extraction, hybrid score blending, rerank gating, and bonus application cleanup.
- `tests/test_hybrid_pipeline_modes.py`: new coverage for BM25-only, dense-only, hybrid fusion, rerank on/off, multi-query on/off, and bonus application.

## How the new pipeline works (high level)
1. **Preprocess**: optional synonym expansion via config; load lightweight tokenizer/chunk metadata.
2. **Retrieve**: parallel-ish stages for dense (Qdrant) and sparse (BM25) retrieval; optional card BM25 over summaries.
3. **Fuse**: RRF merges dense/sparse ids; normalized dense/sparse scores blend into a `hybrid_score`.
4. **Hydrate**: optional code hydration based on `HYDRATION_MODE`.
5. **Rerank**: cross-encoder rerank unless disabled or deferred to cloud backends; metrics/traces retained.
6. **Score & bonuses**: apply card/path/project-layer/vendor/feature boosts plus filename boosts in multi-query final pass.

## Tradeoffs & compatibility
- Maintained public signatures and config/env hooks; reload still refreshes cached knobs.
- Dense retrieval still depends on Qdrant; if unreachable the pipeline gracefully falls back to BM25-only paths.
- Tests stub out heavy dependencies (embeddings/reranker/hydration) for determinism while exercising fusion/rerank gating logic.
