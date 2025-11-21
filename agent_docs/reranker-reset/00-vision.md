# Vision & Scope

> **Always enforce [`AGENTS.md`](../AGENTS.md).** Every agent must follow the global rules (sandbox, approvals, test mandates) before acting on the steps below.

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

## Reference Materials (keep handy)

- [SBERT CrossEncoder Training Overview](https://www.sbert.net/docs/cross_encoder/training_overview.html)
- [SBERT CrossEncoder Loss Overview](https://www.sbert.net/docs/cross_encoder/loss_overview.html)
- [Sentence-Transformers `CrossEncoderTrainer` docs](https://www.sbert.net/docs/package_reference/cross_encoder/trainer.html)
- [Hugging Face `datasets` quickstart](https://huggingface.co/docs/datasets/v2.19.0/en/quickstart)
- [Prometheus Histogram best practices](https://prometheus.io/docs/practices/histograms/)
