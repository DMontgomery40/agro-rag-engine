# AGENTS.md

**Project**: agro-rag-engine
**Purpose**: agro-rag-engine project
**Type**: GREENFIELD_NEW
**Codex CLI Compatibility**: Full support with reference-based architecture

---

## Quick Reference

This project is a **Claude Code project** that can be used with **Codex CLI**.

**Project Statistics**:
- **Skills**: 0 total (0 functional, 0 prompt-based)
- **Agents**: 1 total
- **Documentation**: ❌ No

**For Codex CLI Users**:
- Skills are documented below with Codex CLI usage examples
- Use `codex exec` commands (never plain `codex`)
- Python scripts can be executed directly
- All file references are relative to project root

---

## Project Overview

agro-rag-engine project

**Project Type**: GREENFIELD_NEW
**Root Directory**: `agro-rag-engine/`

---

## Project Structure

```
agro-rag-engine/
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── package.json
├── pyproject.toml
├── requirements.txt
├── .claude/agents/
├── tests/
```

**Key Components**:
- `CLAUDE.md` - Claude Code configuration (source of truth)
- `AGENTS.md` - This file (Codex CLI bridge documentation)
- `.claude/agents/` - Custom Claude Code agents

---

## Global Rules

Source: `.claude/rules/global/`

### Code Style

Universal code style guidelines for the project.

#### No Stubs or Placeholders

**Never add stubs, TODOs, placeholders, or simulated functionality.**

- All backend must be fully wired to GUI via Pydantic
- All GUI must be fully wired to backend via Pydantic + Zustand
- Every feature must be complete and working

#### Fix, Don't Delete

**Never remove broken features or settings—fix them instead.**

- If GUI settings are broken, fix the wiring
- If a component doesn't work, repair it
- All settings MUST appear in the GUI (accessibility requirement)
- Ask user where GUI settings should go if unclear

#### No Over-Engineering

Keep solutions simple and focused:
- Only make changes that are directly requested
- Don't add features beyond what was asked
- Don't add unnecessary abstractions
- Don't design for hypothetical future requirements
- Three similar lines > premature abstraction

#### Language Standards

- **Backend**: Python 3.11+
- **Frontend**: TypeScript only (no new `.js` files)
- Legacy JS in `/web/modules` is being phased out

#### TypeScript Requirements

- Use TypeScript for all new frontend code
- When modifying legacy JS, refactor to TypeScript
- Archive refactored files to `/web/_archived`

#### File Organization

- Use relative paths, never hardcoded absolute paths
- Keep imports organized (stdlib → external → internal)
- One component per file (React)

#### Comments

- Don't add comments to code you didn't change
- Only add comments where logic isn't self-evident
- Don't add docstrings to unchanged code

#### UI Requirements

- New UI elements MUST have tooltips (see `useTooltips.ts`)
- All new settings must appear in GUI
- Don't add features without asking user first

### Git Workflow

Branch and commit conventions for this project.

#### Branch Protection

**Never push to `main` directly.**

Branch flow:
```
development → staging → main
```

- `development` - Active development
- `staging` - Hardening and testing
- `main` - Production-ready only

#### Pull Request Flow

1. Work on `development` branch
2. Create PR to `staging` for testing
3. After validation, PR from `staging` to `main`

#### Commit Requirements

- **Always get user approval before committing**
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Never commit secrets or `.env` files

#### What Not to Commit

- `.env` files (secrets)
- `node_modules/`
- `__pycache__/`
- Build artifacts (`/out`, `/dist`)
- IDE settings (except shared configs)
- Large binary files

#### Branch Naming

Use descriptive branch names:
- `feature/add-dark-mode`
- `fix/search-timeout`
- `refactor/config-system`

#### Before Committing

1. Verify changes with `git status`
2. Review diff with `git diff`
3. Check you're on the correct branch
4. Get user approval

### Security Rules

Critical security requirements that apply across the entire codebase.

#### Never Edit .env

The `.env` file contains secrets and infrastructure configuration.
- **Never** edit, write to, or commit `.env` files
- API keys belong in `.env` only
- Configuration goes in `agro_config.json`, not `.env`

#### API Key Handling

API keys must NEVER be exposed to the frontend:
1. Store keys in `.env` only
2. Backend checks existence via `/api/secrets/check` → returns boolean
3. Frontend displays "Configured" / "Not configured" status
4. User edits `.env` directly

Reference: `web/src/components/RAG/RerankerConfigSubtab.tsx`

#### No dangerouslySetInnerHTML

**Never use `dangerouslySetInnerHTML` anywhere in the React codebase.**

If pre-existing, fix immediately. Use safe alternatives:
- React components for structured content
- DOMPurify for unavoidable HTML (rare)
- Plain text rendering

#### Input Validation

- Validate at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees
- Don't over-validate internal data flow

#### OWASP Top 10 Awareness

Be aware of common vulnerabilities:
- SQL injection (use parameterized queries)
- XSS (no raw HTML rendering)
- Command injection (sanitize shell inputs)
- Path traversal (validate file paths)

#### Secrets in Code

Never hardcode:
- API keys
- Passwords
- Private keys
- Connection strings with credentials

Use `.env` for secrets, `agro_config.json` for configuration.

### Testing Requirements

Testing philosophy and requirements for the project.

#### Testing Stack

- **Backend**: pytest
- **Frontend E2E**: Playwright
- **Config**: Contract tests

#### Running Tests

```bash
# Backend tests
pytest tests/

# Frontend E2E (development - port 5173)
npx playwright test --config=playwright.web.config.ts

# Frontend E2E (production - port 8012)
npx playwright test --config=playwright.web-static.config.ts
```

#### Config Contract Tests

**Mandatory after any config-related changes:**

```bash
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
```

This validates:
- No `os.getenv` for config keys
- JSON/Pydantic/Registry parity
- No hardcoded fallbacks

#### GUI Verification Required

**GUI work requires actual functional verification:**

1. **Feature text visible** - Labels, headings, descriptions render correctly
2. **Button clicks work** - Actions execute, responses happen
3. **Micro-interactions work** - Hover states, transitions, feedback
4. **CSS style tokens correct** - Colors, spacing, typography match design system
5. **Data flows end-to-end** - Frontend → API → Backend → Response displayed

A GUI that "renders" but doesn't function is NOT acceptable.

#### Backend Verification

- Smoke test exercising actual endpoints
- Verify data transforms correctly
- Config changes persist and reload

#### Never Report "Done" Without Proof

- Show actual working functionality
- Demonstrate the feature in action
- Verify the complete data flow

#### Test Organization

```
tests/
├── smoke/           # Fast health checks
├── unit/            # Unit tests
├── integration/     # Cross-module tests
├── routers/         # API endpoint tests
└── playwright/      # E2E specs
```

#### Testing Patterns

```python
# Backend: Use TestClient
from fastapi.testclient import TestClient
from server.asgi import create_app

client = TestClient(create_app())
response = client.get("/api/health")
assert response.status_code == 200
```

```typescript
// Frontend: Verify actual functionality
test('reranker mode changes work', async ({ page }) => {
  await page.goto('/rag');
  await page.click('[data-testid="mode-cloud"]');
  await expect(page.locator('.provider-select')).toBeVisible();
  await expect(page.locator('.api-key-status')).toContainText('Configured');
});
```

---

## Full-Stack Configuration Flow

Source: `.claude/rules/config/full-stack-config.md`

End-to-end configuration architecture from UI to persistence.

### The Complete Flow

```
[React UI]
    ↓ useConfig().set('KEY', value)
[useConfigStore]
    ↓ debounced saveConfig()
[API Client]
    ↓ POST /api/env/save
[FastAPI Router]
    ↓ config_store.set_config()
[ConfigRegistry]
    ↓ update_agro_config()
[Pydantic Validation]
    ↓ AgroConfigRoot.from_flat_dict()
[Atomic Write]
    ↓ temp file + os.replace()
[agro_config.json]
    ↓ registry.reload()
[Module Reload]
    ↓ calls reload_config() on cached modules
[Response]
    ↓ { reloaded_modules: [...] }
[Frontend]
    ↓ updates store with confirmed values
```

### Adding a New Setting (Checklist)

#### Backend
1. [ ] Add field to Pydantic model in `server/models/agro_config_model.py`
2. [ ] Add default value to `agro_config.json`
3. [ ] Access via `config_registry.get_*(KEY, default)`

#### Frontend
4. [ ] Add UI control in appropriate Settings component
5. [ ] Use `useConfig()` or `useConfigField()` hook
6. [ ] Add tooltip via `useTooltips` hook

#### Validation
7. [ ] Run config contract test:
   ```bash
   pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
   ```

### Config Contract Test

After ANY config-related change, run:

```bash
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
```

This validates:
- No `os.getenv` for config keys (use registry)
- JSON/Pydantic/Registry parity
- No hardcoded fallbacks

### Environment Variables vs Configuration

| Type | Location | Frontend Access |
|------|----------|-----------------|
| Configuration | `agro_config.json` | Full read/write via store |
| Secrets (API keys) | `.env` | Boolean check only via `/api/secrets/check` |
| Infrastructure | `.env` (QDRANT_URL, etc.) | Never exposed |

### API Key Pattern (Gold Standard)

See `RerankerConfigSubtab.tsx` for the reference implementation.

**API keys NEVER leave the backend:**
1. Keys stored in `.env` only
2. Frontend checks via `/api/secrets/check?keys=KEY_NAME` → returns `{KEY_NAME: true/false}`
3. UI shows "Configured" / "Not configured" status
4. User edits `.env` directly to add keys

### Key Invariants

1. **Single source of truth**: `agro_config.json` for config, `.env` for secrets
2. **Type safety**: Pydantic validates all config changes
3. **Atomic writes**: No partial config corruption
4. **Reload protocol**: Cached modules stay in sync
5. **Secrets isolation**: API keys never exposed to frontend

---

## Workflow Patterns

Common Claude Code workflows and their Codex CLI equivalents:

### Generate New Skill

**Claude Code**:
```
User: "Create a skill for data visualization"
→ Skills Factory auto-activates
→ Generates complete skill package
```

**Codex CLI Equivalent**:
```bash
codex exec -m gpt-5 -s workspace-write --full-auto \
  --skip-git-repo-check \
  "Using the Skills Factory Prompt template, generate a
  data visualization skill with Python scripts for chart
  generation, interactive dashboards, and export functionality"
```

---

### Code Review

**Claude Code**: `/code-review`

**Codex CLI**:
```bash
codex exec -m gpt-5 -s read-only \
  --skip-git-repo-check \
  "Review this codebase for:
  - Code quality issues
  - Security vulnerabilities
  - Performance bottlenecks
  - Best practices violations
  Provide detailed report with file references"
```

---

### Run Tests

**Claude Code**: `/test`

**Codex CLI**:
```bash
codex exec -m gpt-5-codex -s workspace-write \
  --skip-git-repo-check \
  "Run all tests in this project and analyze any failures.
  Provide detailed failure reports with suggested fixes."
```

---

### Documentation Generation

**Claude Code**: `/docs-generate` or rr-tech-writer agent

**Codex CLI**:
```bash
codex exec -m gpt-5 -s workspace-write --full-auto \
  --skip-git-repo-check \
  "Generate comprehensive documentation for this project:
  - Update README.md with current features
  - Create API documentation
  - Update CHANGELOG.md with recent changes"
```

---

### Architecture Design

**Claude Code**: `/architect` or rr-architect agent

**Codex CLI**:
```bash
codex exec -m gpt-5 -s read-only \
  -c model_reasoning_effort=high \
  --skip-git-repo-check \
  "Analyze current architecture and propose:
  - System architecture diagram
  - Technology stack recommendations
  - Scalability improvements
  - Performance optimization strategies"
```

---

## Command Reference

| Operation | Claude Code | Codex CLI |
|-----------|-------------|-----------|
| Start session | `claude` | `codex` or `codex exec` |
| Resume session | `/resume-work` | `codex exec resume --last` |
| Code review | `/code-review` | `codex exec "review code"` |
| Run tests | `/test` | `codex exec "run tests"` |
| Generate docs | `/docs-generate` | `codex exec "generate docs"` |
| Plan feature | `/create-plan` | `codex exec -m gpt-5 "plan feature"` |
| Architecture | `/architect` | `codex exec -m gpt-5 -c model_reasoning_effort=high "design architecture"` |
| Build feature | `/implement` | `codex exec -m gpt-5-codex -s workspace-write "implement feature"` |

---

## Common Operations

### Execute Skill Python Script

**For functional skills with Python files**:

```bash
# Navigate to skill directory
cd generated-skills/skill-name/

# Run Python script
python script_name.py --arg value

# Example: AWS architecture designer
cd generated-skills/aws-solution-architect/
python architecture_designer.py --requirements requirements.json
```

---

### Reference Skill in Codex Prompt

**For prompt-based skills or complex workflows**:

```bash
codex exec -m gpt-5 -s read-only \
  "Using the skill documentation at path/to/SKILL.md,
  perform the following task: [your task description]"
```

---

### Combine Multiple Skills

```bash
codex exec -m gpt-5 -s workspace-write \
  "Referencing the following skills:
  - Skill 1 at path/to/skill1/SKILL.md
  - Skill 2 at path/to/skill2/SKILL.md

  Perform this complex task: [task description]"
```

---

### Resume Previous Session

```bash
# Resume last session
codex exec resume --last

# Or choose from history
codex exec resume
# (opens interactive picker)
```

---

## Best Practices for Codex CLI Users

### 1. Always Use `codex exec`

❌ **WRONG**: `codex -m gpt-5 "task"`
✅ **CORRECT**: `codex exec -m gpt-5 "task"`

**Why**: Claude Code runs in a non-terminal environment. Plain `codex` commands fail with "stdout is not a terminal" error.

---

### 2. Choose Correct Model

**gpt-5** (General reasoning):
- Architecture design
- Code analysis
- Documentation
- Planning

**gpt-5-codex** (Code editing):
- Refactoring
- Bug fixes
- Feature implementation
- Test generation

Example:
```bash
# Analysis: use gpt-5
codex exec -m gpt-5 -s read-only "analyze security"

# Editing: use gpt-5-codex
codex exec -m gpt-5-codex -s workspace-write "refactor code"
```

---

### 3. Choose Correct Sandbox Mode

**read-only** (Safe, default):
- Code review
- Analysis
- Documentation reading

**workspace-write** (File modifications):
- Code editing
- Documentation generation
- Test creation

**danger-full-access** (Network, rarely needed):
- Web scraping
- API calls
- External data fetching

---

### 4. Reference Skills Properly

**Functional skills** (has Python):
```bash
# Execute directly
cd skill-directory/
python script.py
```

**Prompt skills** (documentation only):
```bash
# Reference in prompt
codex exec "Using SKILL.md at path/to/skill, do task"
```

---

### 5. Use High Reasoning for Complex Tasks

```bash
codex exec -m gpt-5 \
  -c model_reasoning_effort=high \
  -s read-only \
  "Complex architecture analysis task"
```

---

## References

- **CLAUDE.md**: Project configuration for Claude Code
- **Skills Documentation**: See individual SKILL.md files in skill directories
- **Codex CLI Docs**: https://github.com/openai/codex
- **Claude Code Docs**: https://docs.claude.com/claude-code

---

**Last Updated**: 2026-01-03
**Generated By**: codex-cli-bridge skill
**Project Type**: GREENFIELD_NEW
**Maintained For**: Cross-tool team collaboration (Claude Code ↔ Codex CLI)
**Sync Strategy**: One-way sync (CLAUDE.md → AGENTS.md)

---

*This AGENTS.md is auto-generated from CLAUDE.md and project structure.*
*To update, modify CLAUDE.md and run: `/sync-agents-md` or regenerate with codex-cli-bridge skill.*
