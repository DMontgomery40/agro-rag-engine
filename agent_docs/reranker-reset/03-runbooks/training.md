# Reranker Training Runbook (Target State)

## Data Pipeline

1. Sanitize query logs to use relative doc IDs.
2. Mine triplets into HuggingFace datasets (Parquet) with metadata.
3. Track dataset snapshots via `data/training/history.jsonl`.

## Training Workflow

- Use `CrossEncoderTrainer` with configurable loss.
- Deterministic train/dev/test split keyed by dataset hash.
- Save model under `models/cross-encoder-agro/{timestamp}` with metadata.

## Evaluation & Promotion

- Compute MRR/Hit@K on held-out split.
- Compare against production baseline before promotion.
- Run `/api/reranker/smoketest` + Playwright suites.
- Update changelog/decision log and monitoring gauges.

## Rollback

- Keep previous model snapshots.
- Repoint `AGRO_RERANKER_MODEL_PATH`, restart services, rerun smoke tests.

Refer to `ADR-0002` for strategy details.
