# Reranker Training Runbook (Target State)

> **Agents:** confirm you are operating under the policies in [`AGENTS.md`](../../AGENTS.md) before running any command in this runbook.

## Data Pipeline

1. Sanitize query logs to use relative doc IDs.
2. Mine triplets into HuggingFace datasets (Parquet) with metadata.
3. Track dataset snapshots via `data/training/history.jsonl`.

## Training Workflow

- Use `CrossEncoderTrainer` with configurable loss (see [official docs](https://www.sbert.net/docs/package_reference/cross_encoder/trainer.html)).
- Deterministic train/dev/test split keyed by dataset hash.
- Save model under `models/cross-encoder-agro/{timestamp}` with metadata.
- Reference SBERT guidance on [dataset format](https://www.sbert.net/docs/cross_encoder/training_overview.html#dataset) and [loss selection](https://www.sbert.net/docs/cross_encoder/loss_overview.html).
- Build datasets via HuggingFace `datasets` ([quickstart](https://huggingface.co/docs/datasets/en/quickstart)).

## Evaluation & Promotion

- Compute MRR/Hit@K on held-out split.
- Compare against production baseline before promotion.
- Run `/api/reranker/smoketest` + Playwright suites.
- Update changelog/decision log and monitoring gauges.
- Push metrics to Prometheus using helpers in `server/metrics.py` (histograms/gauges for reranker margin, winners). Ensure evaluation script invokes `record_canary`.

## Rollback

- Keep previous model snapshots.
- Repoint `AGRO_RERANKER_MODEL_PATH`, restart services, rerun smoke tests.

Refer to `ADR-0002` for strategy details.
