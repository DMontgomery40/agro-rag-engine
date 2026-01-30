# Git Workflow

Branch and commit conventions for this project.

## Branch Protection

**Never push to `main` directly.**

Branch flow:
```
development → staging → main
```

- `development` - Active development
- `staging` - Hardening and testing
- `main` - Production-ready only

## Pull Request Flow

1. Work on `development` branch
2. Create PR to `staging` for testing
3. After validation, PR from `staging` to `main`

## Commit Requirements

- **Always get user approval before committing**
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Never commit secrets or `.env` files

## What Not to Commit

- `.env` files (secrets)
- `node_modules/`
- `__pycache__/`
- Build artifacts (`/out`, `/dist`)
- IDE settings (except shared configs)
- Large binary files

## Branch Naming

Use descriptive branch names:
- `feature/add-dark-mode`
- `fix/search-timeout`
- `refactor/config-system`

## Before Committing

1. Verify changes with `git status`
2. Review diff with `git diff`
3. Check you're on the correct branch
4. Get user approval
