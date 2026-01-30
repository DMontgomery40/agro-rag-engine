---
paths: scripts/**/*
---

# Scripts System

Shell and Python scripts for startup, operations, and utilities.

## Core Startup Scripts

### Startup Hierarchy
```
First-time: setup.sh → quick_setup.py
Development: dev_up.sh (local uvicorn or Docker)
Production:  up.sh (full Docker stack)
Status:      status.sh
Shutdown:    down.sh
```

### up.sh - Production Full Stack
- Starts all 12 Docker containers
- Default API port: 8012 (`API_PORT` env var)
- Auto-starts Colima on macOS if Docker unavailable
- Loads index profile via `select_index.sh`
- Health checks all services

### dev_up.sh - Developer Mode
Two paths via `DEV_LOCAL_UVICORN` flag:
1. **Default (0)**: Full Docker stack via `up.sh`
2. **Dev mode (1)**: Docker minus API + local uvicorn

Features:
- `DEV_FORCE_KILL_API=1` - Auto-kill conflicting processes
- Health polling: 60 retries at 0.5s intervals
- Auto-browser opening via `OPEN_BROWSER`

### down.sh - Shutdown
- Graceful container cleanup
- Preserves volumes (no `-v` flag)
- Prunes git worktrees

## Port Mappings

| Service | Port | Health Check |
|---------|------|--------------|
| API | 8012 | `curl -s http://127.0.0.1:8012/health` |
| Qdrant | 6333 | `curl -s http://127.0.0.1:6333/collections` |
| Redis | 6379 | `docker exec redis redis-cli ping` |
| Prometheus | 9090 | `curl -s http://127.0.0.1:9090/-/ready` |
| Grafana | 3000 | `curl -s http://127.0.0.1:3000/api/health` |
| MCP | 8013 | Process check |
| Editor | 4440 | `curl -sf http://127.0.0.1:4440/` |

## Environment Variables

### Startup Control
```bash
API_PORT=8012              # API server port
UVICORN_HOST=127.0.0.1     # Local uvicorn bind
UVICORN_PORT=8012          # Local uvicorn port
OPEN_BROWSER=1             # Auto-open browser
```

### Feature Flags
```bash
DEV_LOCAL_UVICORN=0        # Use local uvicorn
DEV_FORCE_KILL_API=0       # Kill conflicting processes
DEV_SKIP_ENV=0             # Skip .env loading
AUTO_INDEX=0               # Git hook auto-indexing
AUTO_COLIMA=1              # Auto-start Colima (macOS)
EDITOR_ENABLED=1           # Enable code-server
```

## MCP Server Management

### mcp_restart.sh
Actions: `{start|stop|restart|status|test}`

```bash
./scripts/mcp_restart.sh restart  # Default action
./scripts/mcp_restart.sh status   # Check PID
./scripts/mcp_restart.sh test     # JSON-RPC test
```

- Logs to `/tmp/agro_mcp_server.log`
- Kills both current and legacy processes

## Editor Management

### editor_up.sh
- Port scanning: `EDITOR_PORT` + 20 range
- Token auth via OpenSSL
- Status JSON at `out/editor/status.json`
- Bind modes: `local` (127.0.0.1) or `public` (0.0.0.0)

### editor_install_extensions.sh
Installs 16 extensions inside code-server:
- Python (ms-python, ruff)
- JS/TS/React (prettier, eslint, tailwind)
- AI (continue.continue)
- Git (gitlens), DevOps (docker)

## Data Management

### wipe_all_data.sh
Nuclear reset sequence:
1. Stop Qdrant
2. Delete Qdrant data
3. Clear `out/*` directories
4. Remove training triplets
5. Clear reranker cache
6. Restart Qdrant

### cleanup_repo.sh
Git archival tool:
- CSV summary (branch stats)
- Git bundles per branch
- Protected branches: `{main, development, staging}`
- Optional deletion: `DELETE_AFTER_ARCHIVE=1`

## Health Check Pattern

Standard polling:
```bash
for _ in $(seq 1 60); do
  if curl -fsS "$URL" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
```

## Error Handling

All scripts use:
```bash
set -euo pipefail  # Fail on error, undefined vars, pipe failures
```

Patterns:
- Port conflict detection via `lsof`
- Docker daemon checks
- Graceful degradation (`|| true`)
- JSON status files for state tracking

## Log Locations

| Script | Log File |
|--------|----------|
| Colima | `/tmp/colima_start.log` |
| Uvicorn (dev) | `/tmp/uvicorn_server.log` |
| MCP | `/tmp/agro_mcp_server.log` |
| Editor up | `out/editor/up.log` |
| Editor down | `out/editor/down.log` |

## Python Scripts Categories

### Testing & Verification
- `test_backend.py`, `gui_smoke.py`
- `test_token_comparison.py`

### Reranker Training
- `train_reranker.py`, `eval_reranker.py`
- `mine_triplets.py`, `mine_golden.py`

### Documentation
- `docs_ai/bootstrap_docs.py` - Large doc rewrites
- `docs_ai/docs_autopilot_enhanced.py` - Incremental updates
- `docs_ai/generate_docs_from_diff.py` - Diff-based generation

## Git Hooks (install_git_hooks.sh)

Creates 3 hooks:
1. **post-checkout**: Auto-index on branch change
2. **post-commit**: Auto-index after commit
3. **pre-commit**: Block root-level `.py`/`.json` files

Whitelist: `repos.json`, `package.json`, `package-lock.json`
