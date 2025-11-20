#!/usr/bin/env bash
set -euo pipefail

# Developer launcher (Docker-first).
# - Default: bring up full Docker stack via scripts/up.sh
# - Dev-only: if DEV_LOCAL_UVICORN=1, start stack without API, then run local uvicorn

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[dev_up] $*"; }

# Load .env for HOST/PORT overrides (applied to uvicorn only)
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT_DIR/.env" || true
  set +a
fi

HOST="${UVICORN_HOST:-${HOST:-127.0.0.1}}"
PORT="${UVICORN_PORT:-${PORT:-8012}}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

if [[ "${DEV_LOCAL_UVICORN:-0}" = "1" ]]; then
  log "DEV_LOCAL_UVICORN=1 → starting Docker stack without API service ..."
  # Start all services except API to avoid port 8012 conflicts
  docker compose up -d --scale api=0

  # Ensure local uvicorn is available
  if [ ! -f "$ROOT_DIR/.venv/bin/uvicorn" ]; then
    log "Venv or uvicorn missing — running setup.sh"
    bash "$ROOT_DIR/scripts/setup.sh"
  fi
  . "$ROOT_DIR/.venv/bin/activate"
  if pgrep -f "uvicorn .*server\.asgi:create_app" >/dev/null; then
    log "Uvicorn already running."
  else
    log "Starting uvicorn locally on $HOST:$PORT (ASGI factory) ..."
    nohup uvicorn server.asgi:create_app --factory --host "$HOST" --port "$PORT" > /tmp/uvicorn_server.log 2>&1 &
    sleep 1
  fi
else
  log "Bringing up full Docker stack (default) ..."
  bash "$ROOT_DIR/scripts/up.sh"
fi

# Wait for health (Docker API or local uvicorn)
URL="http://$HOST:$PORT/health"
for _ in $(seq 1 60); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    log "API healthy at $URL"
    break
  fi
  sleep 0.5
done

# Open browser to GUI (best-effort)
if [ "$OPEN_BROWSER" = "1" ]; then
  GUI_URL="http://$HOST:$PORT/"
  if command -v open >/dev/null 2>&1; then
    open "$GUI_URL" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$GUI_URL" || true
  else
    log "Please open: $GUI_URL"
  fi
else
  log "OPEN_BROWSER=0 — not opening a browser"
  log "GUI: http://$HOST:$PORT/"
fi

log "Done."
