#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CONTAINER_NAME="agro-openvscode"
STATUS_FILE="$REPO_ROOT/out/editor/status.json"
LOG_FILE="$REPO_ROOT/out/editor/down.log"

mkdir -p "$(dirname "$LOG_FILE")"
echo "=== Editor shutdown $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > "$LOG_FILE"

# Detect runtime
RUNTIME=""
if command -v docker &>/dev/null; then
    RUNTIME="docker"
elif command -v podman &>/dev/null; then
    RUNTIME="podman"
else
    echo "[editor] No container runtime found; nothing to stop" | tee -a "$LOG_FILE"
    exit 0
fi

# Stop and remove container
if $RUNTIME ps -a --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[editor] Stopping container $CONTAINER_NAME..." | tee -a "$LOG_FILE"
    $RUNTIME stop "$CONTAINER_NAME" >> "$LOG_FILE" 2>&1 || true
    $RUNTIME rm "$CONTAINER_NAME" >> "$LOG_FILE" 2>&1 || true
    echo "[editor] Container removed" | tee -a "$LOG_FILE"
else
    echo "[editor] Container $CONTAINER_NAME not found" | tee -a "$LOG_FILE"
fi

# Update status
cat > "$STATUS_FILE" <<EOF
{
  "enabled": false,
  "stopped_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Editor stopped"
