#!/usr/bin/env bash
set -euo pipefail

# One-shot developer launcher:
# - Starts infra (Qdrant + Redis) and MCP via scripts/up.sh
# - Ensures venv and launches uvicorn server.app:app
# - Waits for /health and opens the GUI in a browser

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[dev_up] $*"; }

# Load .env (for HOST/PORT overrides from GUI Apply) if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT_DIR/.env" || true
  set +a
fi

# 1) Infra + MCP
log "Bringing up infra and MCP ..."
bash "$ROOT_DIR/scripts/up.sh"

# 2) Ensure venv (if missing) and dependencies
if [ ! -f "$ROOT_DIR/.venv/bin/uvicorn" ]; then
  log "Venv or uvicorn missing — running setup.sh"
  bash "$ROOT_DIR/scripts/setup.sh"
fi

# 3) Activate venv
. "$ROOT_DIR/.venv/bin/activate"

# 4) Host/port (allow overrides via env or .env)
HOST="${UVICORN_HOST:-${HOST:-127.0.0.1}}"
PORT="${UVICORN_PORT:-${PORT:-8012}}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

# 5) Start uvicorn if not already running
if pgrep -f "uvicorn .*server\.app:app" >/dev/null; then
  log "Uvicorn already running."
else
  log "Starting uvicorn on $HOST:$PORT ..."
  nohup uvicorn server.app:app --host "$HOST" --port "$PORT" \
    > /tmp/uvicorn_server.log 2>&1 &
  sleep 1
fi

# 6) Wait for health
URL="http://$HOST:$PORT/health"
for i in $(seq 1 40); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    log "API healthy at $URL"
    break
  fi
  sleep 0.25
done

# 7) Open browser to GUI (best-effort)
if [ "$OPEN_BROWSER" = "1" ]; then
  GUI_URL="http://$HOST:$PORT/"
  if command -v open >/dev/null 2>&1; then
    # macOS
    open "$GUI_URL" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "$GUI_URL" || true
  else
    log "Please open: $GUI_URL"
  fi
else
  log "OPEN_BROWSER=0 — not opening a browser"
  log "GUI: http://$HOST:$PORT/"
fi

log "Done. Logs: /tmp/mcp_server.log (MCP), /tmp/uvicorn_server.log (API)"
