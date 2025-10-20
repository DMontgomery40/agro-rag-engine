#!/usr/bin/env bash
set -euo pipefail

# One-shot developer launcher (Docker-first):
# - Optionally starts infra (Qdrant/Redis/Prom/Grafana) via scripts/up.sh when DEV_WITH_INFRA=1
# - Starts API as a Docker Compose service (infra/docker-compose.yml: api)
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

# 1) Optional infra stack
if [[ "${DEV_WITH_INFRA:-0}" == "1" ]]; then
  log "DEV_WITH_INFRA=1 → bringing up infra stack ..."
  bash "$ROOT_DIR/scripts/up.sh"
else
  log "Skipping infra stack (set DEV_WITH_INFRA=1 to enable)"
fi

# 2) Host/port (allow overrides via env or .env)
HOST="${UVICORN_HOST:-${HOST:-127.0.0.1}}"
PORT="${UVICORN_PORT:-${PORT:-8012}}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

# 3) Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
  log "Docker daemon not reachable. Start Docker Desktop/Colima."
  exit 1
fi

# 4) Start API container (docker-compose.services.yml)
log "Starting API container via docker compose (docker-compose.services.yml) ..."
docker compose -f "$ROOT_DIR/docker-compose.services.yml" up -d api

# 5) Wait for health
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

log "Done. View API logs: docker compose -f infra/docker-compose.yml logs -f api"
