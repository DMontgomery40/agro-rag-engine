#!/usr/bin/env bash
set -euo pipefail

echo "[status] MCP server:"
if pgrep -f "server.mcp.server" >/dev/null; then
  echo "  running (pid(s): $(pgrep -f "server.mcp.server" | paste -sd, -))"
else
  echo "  not running"
fi

echo "[status] Docker services:"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

echo "[status] API health:"
if curl -sf http://127.0.0.1:8012/health >/dev/null 2>&1; then
  echo "  ✓ http://127.0.0.1:8012/health"
else
  echo "  ✗ Not reachable"
fi

echo "[status] Qdrant collections:"
curl -s http://127.0.0.1:6333/collections || echo "(qdrant not reachable)"

echo "[status] Prometheus:"
if curl -s http://127.0.0.1:9090/-/ready >/dev/null 2>&1; then
  echo "  ✓ Ready at http://127.0.0.1:9090"
else
  echo "  ✗ Not reachable"
fi

echo "[status] Grafana:"
if curl -s http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "  ✓ Ready at http://127.0.0.1:3000 (admin/Trenton2023)"
else
  echo "  ✗ Not reachable"
fi
