# Branch + Worktree Workflow (No Branch Switching in Editor)

This project uses Git worktrees so multiple feature branches can be active in parallel without switching the current editor branch.

- Current base branch: `development`
- Never push to `main`. Open PRs: development → staging → main.

## Create Feature Worktrees

From repo root:

```
# UI migration branch (worktree directory under .worktrees)
git worktree add .worktrees/feature-ui-migration -b feature/ui-migration

# Backend modularization branch
git worktree add .worktrees/feature-backend-modularization -b feature/backend-modularization
```

- This creates separate working directories at `.worktrees/feature-ui-migration` and `.worktrees/feature-backend-modularization`.
- Do your work by opening those paths in your editor (no branch switch needed).

## Working Without Switching Branches

- In VSCode, “Add Folder to Workspace” and select the worktree path (e.g., `.worktrees/feature-ui-migration`).
- All commands should use full paths when referencing files across worktrees.
- Keep the main editor session on `development` branch; do not `git checkout` there.

## Commit/Push Policy

- Do not commit to `main`.
- Do not push or open PRs without approval.
- When a feature slice is stable and Playwright/pytest checks are green, push the feature branch and open a PR to `development`.

## Docker Compose Refresh (after config/static mount changes)

```
docker compose -f docker-compose.services.yml up -d --force-recreate api
```

## Notes

- Worktrees isolate build artifacts and node_modules per branch when built inside each worktree directory.
- If a worktree is no longer needed:

```
git worktree remove .worktrees/feature-ui-migration
```

(Only after merging/archiving; ensure no uncommitted changes.)
