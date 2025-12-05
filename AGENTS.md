# NEVER edit or write to .env - EVER

# AGRO RAG Engine

Local-first Enterprise-Grade RAG Engine for codebases with GUI, CLI, hybrid search, and self-learning reranker.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic
- **Frontend**: React/Vite (`/web`), Legacy JS (`/gui`)
- **Data**: Qdrant (vectors), Redis (cache), BM25S (sparse)
- **Testing**: Playwright (GUI), pytest (backend)
- **Infra**: Docker Compose (up to 12 containers in `/infra`)

## Project Structure

- `server/` - FastAPI backend, routers, services, MCP servers
- `web/` - React/Vite frontend (primary GUI)
- `retrieval/` - Hybrid search, embeddings, AST chunking
- `indexer/` - Code indexing pipeline
- `reranker/` - Learning reranker system
- `tests/` - All tests (Playwright specs, pytest)
- `scripts/` - `up.sh`, `down.sh`, `dev_up.sh`
- `agent_docs/` - Agent-created documentation (NOT root)

## Commands

```bash
# Start services
./scripts/dev_up.sh          # Development
./scripts/up.sh              # Production

# Testing
npx playwright test --config=playwright.web.config.ts        # Dev (port 5173)
npx playwright test --config=playwright.web-static.config.ts # Prod (port 8012)
pytest tests/                # Backend tests

# Git workflow
git rev-parse --abbrev-ref HEAD  # Check branch at session start
```

## Configuration System (MANDATORY)

**ALL settings MUST use Pydantic configs—no exceptions:**
1. Add to `agro_config.json`
2. Register in `/server/models/`
3. Add to `/server/services/config_registry.py`
4. Add to `/server/services/config_store.py`

**Frontend state: Use `useConfigStore` (Zustand), NOT local `useState` for config values.**

Never use .env for configuration. .env is for secrets only and must never be edited.

## Critical Rules

### No Stubs or Placeholders
- Never add stubs, TODOs, placeholders, or simulated functionality
- All backend must be fully wired to GUI via Pydantic
- All GUI must be fully wired to backend via Pydantic + Zustand
- Every new setting/parameter → `agro_config.json` + Pydantic models + config registry

### Verification Required
- **GUI work**: Playwright smoke test (renders, no black screen, nav works)
- **Backend work**: Smoke test in `/tests/` exercising endpoints
- Never report "done" without proof it works

### Configuration & Accessibility
- All new settings MUST appear in GUI (accessibility requirement)
- Ask user where GUI settings should go if unclear
- Never remove broken GUI settings—fix them instead

### Git Workflow
- Never push to `main` directly
- Work on `development`, harden on `staging`
- PRs: `development` → `staging` → `main`
- Never commit without user approval

### Code Style
- Use relative paths, never hardcoded absolute paths
- New UI elements must have tooltips (see `useTooltips.ts`)
- Don't add features without asking user first
- JetBrains IDE MCP must ALWAYS be used over Grep

## Quick Reference

```python
# RAG API
curl 'http://127.0.0.1:8012/search?q=query&repo=agro&top_k=5'
curl 'http://127.0.0.1:8012/answer?q=query&repo=agro'

# Direct code
from retrieval.hybrid_search import search_routed_multi
results = search_routed_multi("query", repo_override="agro", final_k=5)
```