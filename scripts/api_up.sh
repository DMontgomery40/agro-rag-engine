#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[api_up] Starting API container via docker-compose.services.yml ..."
docker compose -f "$ROOT_DIR/docker-compose.services.yml" up -d api

echo "[api_up] Waiting for health ..."
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8012/health >/dev/null 2>&1; then
    echo "[api_up] ✅ RAG API ready at http://127.0.0.1:8012"
    exit 0
  fi
  sleep 0.5
done
echo "[api_up] ❌ API did not become healthy in time"
exit 1
