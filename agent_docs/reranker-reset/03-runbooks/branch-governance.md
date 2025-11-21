# Branch Governance & Controls

> **Reminder:** enforce [`AGENTS.md`](../../AGENTS.md) before following any procedure here. Sandbox mode, approval policies, and testing rules there remain in force.

## Branch Strategy

- `planning/reranker-reset`: documentation, ADRs, runbooks. No runtime code changes.
- `spike/reranker-refactor`: code refactor work. Must reference planning docs.
- `development`: untouched reference branch for comparison.

## Required Status Checks

| Check | Description |
|-------|-------------|
| `docs-sync` (`.github/workflows/reranker-docs.yml`) | Verifies any reranker-impacting change updates `agent_docs/reranker-reset/` + changelog. |
| `playwright-reranker-suite` | GUI regression for reranker tabs (to add). |
| `backend-reranker-smoke` | Calls `/api/reranker/smoketest` (to add). |

## Pull Request Expectations

- Link to relevant doc section.
- Reference ADR ID.
- Include smoke + Playwright evidence.
- Confirm no absolute paths/env leaks.
- State the Codex/Claude profile used (see `tooling/`).

## Agent Guardrails

- Codex CLI: run with `--profile reranker-reset`. See `tooling/codex-cli.md`.
- Claude Code: require `.claude/settings.json` from repo. See `tooling/claude-code.md`.
- Pre-push hooks (future): block merges if docs/changelog missing.
- When exceptional access is needed, record the deviation and resolution in `02-decision-log.md`.

## Incident Handling

If a guard fails, do not force-push. Fix, document in ADR log if systemic, update this runbook if policy changes.
