# Reranker Reset Program

> **Agents: mandatory reminder** — before acting on anything in this folder, re-read the policies in [`AGENTS.md`](../AGENTS.md). Every workflow and guardrail below assumes those instructions are followed verbatim.

This directory is the source of truth for the cross-encoder/reranker consolidation effort. Everything that follows in code must trace back to an explicit item in these docs.

## Document Map

- `00-vision.md` — goals, non-goals, guiding principles.
- `01-architecture-baseline.md` — current-state inventory with code references.
- `02-decision-log.md` — running ADR-style log; every irreversible choice goes here.
- `CHANGELOG.md` — chronological summary of material changes tied to decision IDs.
- `03-runbooks/branch-governance.md` — branch policy, CI gates, and agent guardrails.
- `03-runbooks/training.md` — canonical procedure for mining, training, evaluating, and promoting models.
- `tooling/codex-cli.md` — locked-down Codex CLI profile expectations.
- `tooling/claude-code.md` — required Claude Code settings/permissions.
- `04-deep-dive.md` — exhaustive dependency analysis, research answers, and risk register.

## Working Rules

1. **Nothing ships without documentation.** If a PR touches reranker code/data, it must reference a section here and update the decision log + changelog.
2. **Two-branch workflow.** We operate on `planning/reranker-reset` (docs/governance) and `spike/reranker-refactor` (code). Neither merges without the other’s sign-off.
3. **Agent guardrails.** Codex CLI and Claude Code must run under the profiles captured in `tooling/`, including sandbox/approval settings and path restrictions.
4. **Mandatory smoke tests.** Every milestone requires `/api/reranker/smoketest` and Playwright GUI suites relevant to reranker tabs.
5. **Decision log is the single source.** No off-repo memory—this folder is the plan.
6. **External references live here.** When we rely on third-party behaviour (SBERT, HuggingFace datasets, Prometheus), cite the exact docs so tomorrow’s agent can re-ground.

## Next Actions Checklist

- [ ] Enable GitHub branch protections and required checks for `planning/reranker-reset` and `spike/reranker-refactor`.
- [ ] Confirm doc-enforcement workflow (`.github/workflows/reranker-docs.yml`) passes.
- [ ] Begin refactor tasks on `spike/reranker-refactor` once docs & CI guardrails are verified.
