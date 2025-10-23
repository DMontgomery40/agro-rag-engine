# Branch Governance & Controls

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

## Agent Guardrails

- Codex CLI: run with `--profile reranker-reset`. See `tooling/codex-cli.md`.
- Claude Code: require `.claude/settings.json` from repo. See `tooling/claude-code.md`.
- Pre-push hooks (future): block merges if docs/changelog missing.

## Incident Handling

If a guard fails, do not force-push. Fix, document in ADR log if systemic, update this runbook if policy changes.
