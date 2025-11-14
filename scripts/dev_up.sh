#!/usr/bin/env bash
set -euo pipefail

# One-shot developer launcher (Docker-first):
# - Optionally starts infra (Qdrant/Redis/Prom/Grafana) via scripts/up.sh when DEV_WITH_INFRA=1
# - Starts API as a Docker Compose service (docker-compose.services.yml: api)
# - Waits for /health and optionally opens the GUI

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

<<<<<<< HEAD
# 1) Optional infra stack
if [[ "${DEV_WITH_INFRA:-0}" == "1" ]]; then
  log "DEV_WITH_INFRA=1 → bringing up infra stack ..."
  bash "$ROOT_DIR/scripts/up.sh"
else
  log "Skipping infra stack (set DEV_WITH_INFRA=1 to enable)"
fi

# 2) Host/port (allow overrides via env or .env)
=======
log "Bringing up full Docker stack (default) ..."
bash "$ROOT_DIR/scripts/up.sh"
>>>>>>> 1d13175 (chore(stack): unify Docker Compose; make Docker default; uvicorn dev-only; add editor service; add GUI smoke configs; add RAG React subtabs + panels (additive, no legacy disruption))
HOST="${UVICORN_HOST:-${HOST:-127.0.0.1}}"
PORT="${UVICORN_PORT:-${PORT:-8012}}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

<<<<<<< HEAD
# Dev-only override: allow local uvicorn instead of Docker
if [[ "${DEV_LOCAL_UVICORN:-0}" = "1" ]]; then
  if [ ! -f "$ROOT_DIR/.venv/bin/uvicorn" ]; then
    log "Venv or uvicorn missing — running setup.sh"
    bash "$ROOT_DIR/scripts/setup.sh"
  fi
  . "$ROOT_DIR/.venv/bin/activate"
  if pgrep -f "uvicorn .*server\.app:app" >/dev/null; then
    log "Uvicorn already running."
  else
    log "Starting uvicorn locally on $HOST:$PORT (DEV_LOCAL_UVICORN=1) ..."
    nohup uvicorn server.app:app --host "$HOST" --port "$PORT" > /tmp/uvicorn_server.log 2>&1 &
    sleep 1
  fi
fi
=======
# Dev-only override: allow local uvicorn instead of Docker
if [[ "${DEV_LOCAL_UVICORN:-0}" = "1" ]]; then
  if [ ! -f "$ROOT_DIR/.venv/bin/uvicorn" ]; then
    log "Venv or uvicorn missing — running setup.sh"
    bash "$ROOT_DIR/scripts/setup.sh"
  fi
  . "$ROOT_DIR/.venv/bin/activate"
  if pgrep -f "uvicorn .*server\.app:app" >/dev/null; then
    log "Uvicorn already running."
  else
    log "Starting uvicorn locally on $HOST:$PORT (DEV_LOCAL_UVICORN=1) ..."
    nohup uvicorn server.app:app --host "$HOST" --port "$PORT" > /tmp/uvicorn_server.log 2>&1 &
    sleep 1
  fi
fi

# Wait for health (Docker API or local uvicorn)
>>>>>>> 1d13175 (chore(stack): unify Docker Compose; make Docker default; uvicorn dev-only; add editor service; add GUI smoke configs; add RAG React subtabs + panels (additive, no legacy disruption))
URL="http://$HOST:$PORT/health"
for i in $(seq 1 60); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    log "API healthy at $URL"
    break
  fi
  sleep 0.5
done

# 6) Open browser to GUI (best-effort)
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

<<<<<<< HEAD
log "Done."
=======
log "Done."
>>>>>>> 1d13175 (chore(stack): unify Docker Compose; make Docker default; uvicorn dev-only; add editor service; add GUI smoke configs; add RAG React subtabs + panels (additive, no legacy disruption))
