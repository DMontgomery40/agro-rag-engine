#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure index profile env is set (default: shared)
if [ -f "$ROOT_DIR/scripts/select_index.sh" ]; then
  # shellcheck source=/dev/null
  . "$ROOT_DIR/scripts/select_index.sh" shared || true
fi

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  # Optionally auto-start Colima if available and requested
  if [ "${AUTO_COLIMA:-1}" = "1" ] && command -v colima >/dev/null 2>&1; then
    echo "[up] Docker not reachable; attempting 'colima start' ..."
    if [ -n "${COLIMA_PROFILE:-}" ]; then
      colima start "$COLIMA_PROFILE" >/tmp/colima_start.log 2>&1 || true
    else
      colima start >/tmp/colima_start.log 2>&1 || true
    fi
    # Wait up to ~10s for Docker to come up
    for _ in $(seq 1 40); do
      if docker info >/dev/null 2>&1; then break; fi
      sleep 0.25
    done
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[err] Docker daemon not reachable. Start Docker Desktop or Colima, then retry." >&2
    echo "      Hint (macOS with Colima): AUTO_COLIMA=1 bash scripts/up.sh" >&2
    exit 1
  fi
}

ensure_docker

echo "[up] Starting infra (Qdrant + Redis + Prometheus + Grafana) ..."
(
  cd "$ROOT_DIR/infra"
  docker compose up -d
)

echo "[up] Verifying Qdrant ..."
curl -s http://127.0.0.1:6333/collections >/dev/null || echo "[warn] Qdrant not reachable yet"

echo "[up] Verifying Redis ..."
if docker ps --format '{{.Names}}' | grep -qi redis; then
  docker exec "$(docker ps --format '{{.Names}}' | grep -i redis | head -n1)" redis-cli ping || true
fi

echo "[up] Verifying Prometheus ..."
if curl -s http://127.0.0.1:9090/-/ready >/dev/null 2>&1; then
  echo "[up] Prometheus ready at http://127.0.0.1:9090"
else
  echo "[warn] Prometheus not ready yet (check 'docker logs agro-prometheus')"
fi

echo "[up] Verifying Grafana ..."
if curl -s http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "[up] Grafana ready at http://127.0.0.1:3000 (admin/Trenton2023)"
else
  echo "[warn] Grafana not ready yet (check 'docker logs agro-grafana')"
fi

echo "[up] Starting MCP server in background ..."
if pgrep -f "server.mcp.server" >/dev/null; then
  echo "[up] MCP already running."
else
  nohup bash -lc ". .venv/bin/activate && python -m server.mcp.server" >/tmp/mcp_server.log 2>&1 &
  sleep 1
fi

echo "[up] Done. Logs: /tmp/mcp_server.log"

# --- Optional: Start local Ollama (Qwen 3) if available ---
if command -v ollama >/dev/null 2>&1; then
  echo "[up] Ensuring Ollama is serving ..."
  if ! curl -sSf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    nohup ollama serve >/tmp/ollama_server.log 2>&1 &
    sleep 2
  fi
  if curl -sSf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "[up] Ollama API reachable at 127.0.0.1:11434"
  else
    echo "[up] Ollama not reachable; check /tmp/ollama_server.log"
  fi
else
  echo "[up] Ollama not installed (skipping local Qwen)."
fi

# Start embedded editor if enabled
if [[ -f "$ROOT_DIR/scripts/editor_up.sh" ]]; then
  echo "[up] Starting embedded editor..."
  bash "$ROOT_DIR/scripts/editor_up.sh" || echo "[up] Editor startup failed (non-fatal)"
fi
