# Decision Log

Add newest entries at the top. Each row captures context, outcome, and follow-up work.

| ID | Date (UTC) | Title | Context | Decision | Follow-Up / Owner |
|----|------------|-------|---------|----------|-------------------|
| ADR-0003 | 2025-10-23 | Documentation enforcement guardrail | Reranker refactor must update planning docs automatically. | Add GitHub workflow `.github/workflows/reranker-docs.yml` running `scripts/reranker_doc_guard.py` to block PRs missing doc updates. Maintain changelog in `agent_docs/reranker-reset/CHANGELOG.md`. | Monitor workflow, expand watch list as scope widens. Owner: Codex CLI.
| ADR-0002 | 2025-10-23 | Training pipeline rewrite strategy | Legacy script uses deprecated API & dirty data. | Adopt `CrossEncoderTrainer` with `datasets.Dataset` inputs, enforce relative doc IDs, record provenance. | Track progress in `03-runbooks/training.md`. Owner: Codex CLI.
| ADR-0001 | 2025-10-23 | Branch & documentation workflow | Need durable plan across agents/context resets. | Work on `planning/reranker-reset` (docs) and `spike/reranker-refactor` (code); require doc updates for reranker changes. | Create branches, configure protections/CI. Owner: Codex CLI.
