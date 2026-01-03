# NEVER edit or write to .env - EVER

# AGRO RAG Engine

Local-first Enterprise-Grade RAG Engine for codebases with GUI, CLI, hybrid search, and self-learning reranker.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic
- **Frontend**: React/Vite (`/web`)
- **Data**: Qdrant (vectors), Redis (cache), BM25S (sparse)
- **Testing**: Playwright (frontend), pytest (backend)
- **Infra**: Docker Compose (12 containers)

## Quick Start

```bash
./scripts/dev_up.sh                    # Development
./scripts/up.sh                        # Production
pytest tests/                          # Backend tests
npx playwright test --config=playwright.web.config.ts  # Frontend tests
```

## Critical Rules

### Configuration System (MANDATORY)
**ALL settings MUST use Pydantic configs—no exceptions:**
1. Add to `agro_config.json`
2. Register in `/server/models/`
3. Add to `/server/services/config_registry.py`
4. Add to `/server/services/config_store.py`

**Frontend state: Use `useConfigStore` (Zustand), NOT local `useState` for config values.**

Never use .env for configuration. .env is for secrets only and must never be edited.

### No Stubs or Placeholders
- Never add stubs, TODOs, placeholders, or simulated functionality
- All backend must be fully wired to GUI via Pydantic
- All GUI must be fully wired to backend via Pydantic + Zustand
- Every new setting/parameter → `agro_config.json` + Pydantic models + config registry

### Fix, Don't Delete
- **Never remove broken features or settings—fix them instead**
- If GUI settings are broken, fix the wiring
- If a component doesn't work, repair it
- All settings MUST appear in the GUI (accessibility requirement)
- If something is unused or undeclared, we DO NOT delete it—we fix it

### API Key Handling
- API keys stored in `.env` ONLY
- Frontend checks via `/api/secrets/check` → returns boolean only
- Keys are NEVER exposed to frontend—only existence is checked
- Reference: `web/src/components/RAG/RerankerConfigSubtab.tsx`

### Other Critical Rules
- **Git Flow**: `development` → `staging` → `main`. Never push to `main` directly.
- **No dangerouslySetInnerHTML**: Ever. Use safe alternatives.
- **TypeScript Only**: No new `.js` files.
- **JetBrains IDE MCP**: Use over Grep for code navigation.

## Config Contract Test (MANDATORY)

After ANY config change:
```bash
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
```

This validates: no `os.getenv` for config keys, JSON/Pydantic/registry parity, no hardcoded fallbacks.

## Detailed Rules

See `.claude/rules/` for comprehensive documentation:
- `config/` - Pydantic, Zustand, full-stack config flow
- `global/` - Security, git workflow, code style, testing
- `server/` - Routers, services, models
- `web/` - Components, stores, hooks, UI patterns
- `retrieval/`, `indexer/`, `reranker/`, `eval/` - Domain systems
- `tests/`, `scripts/`, `infra/`, `cli/` - Infrastructure

## Quick API Reference

```bash
curl 'http://127.0.0.1:8012/search?q=query&repo=agro&top_k=5'
curl 'http://127.0.0.1:8012/answer?q=query&repo=agro'
```
