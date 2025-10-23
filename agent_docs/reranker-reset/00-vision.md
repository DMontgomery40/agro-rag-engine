# Vision & Scope

## Why This Reset Exists

Current reranker behavior diverges from SBERT expectations: double-loaded cross encoders, stale datasets with absolute paths, out-of-date training scripts, and UI copy that doesn’t reflect reality. We’re standardizing on a truthful, maintainable cross-encoder pipeline.

## End State

- **Single runtime reranker** shared by retrieval and HTTP APIs, fully traced in LangSmith.
- **Modern Trainer** (`CrossEncoderTrainer`) consuming clean HuggingFace datasets with relative paths and dataset provenance.
- **Truthful GUI** where every control aligns with backend functionality and terminology matches SBERT docs.
- **Document-first workflow** so future agents (and you) can pick up without context loss.

## Non-Goals

- Introducing new retrieval strategies or algorithms beyond bringing the cross-encoder up to spec.
- Rewriting the entire GUI—only the portions tied to reranker workflow.
- Migrating to a new repository unless retrofitting proves impossible.

## Guiding Principles

1. **Traceability first** — every change maps to a documented decision.
2. **Safety over speed** — tests & smoke runs are mandatory.
3. **Separation of concerns** — training, runtime, and UI have clear boundaries.
4. **Deterministic automation** — guardrails enforce the “narrow path.”
5. **Incremental delivery** — fix double reranking/data first, then rename & polish.

## Milestones

1. Planning lockdown (docs, guardrails, branch protections).
2. Runtime unification (single loader, tracing, smoke tests).
3. Training rewrite (Trainer, dataset cleanup, evaluation).
4. GUI alignment (terminology, controls, Playwright coverage).
5. Stabilization (regression eval, monitoring, merge back to `development`).
