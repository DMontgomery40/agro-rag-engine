#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Load environment
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

EDITOR_ENABLED="${EDITOR_ENABLED:-1}"
EDITOR_PORT="${EDITOR_PORT:-4440}"
EDITOR_BIND="${EDITOR_BIND:-local}"
EDITOR_IMAGE="${EDITOR_IMAGE:-codercom/code-server:latest}"
CONTAINER_NAME="agro-openvscode"

OUT_DIR="$REPO_ROOT/out/editor"
STATUS_FILE="$OUT_DIR/status.json"
LOG_FILE="$OUT_DIR/up.log"
TOKEN_FILE="$REPO_ROOT/.editor_data/token"
DATA_DIR="$REPO_ROOT/.editor_data"

mkdir -p "$OUT_DIR" "$DATA_DIR"
# Ensure persistent directories for both code-server and openvscode-server
mkdir -p "$DATA_DIR/code-server-config" "$DATA_DIR/code-server-data" "$DATA_DIR/openvscode"

# Initialize log
echo "=== Editor startup $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > "$LOG_FILE"

# Check if disabled
if [[ "$EDITOR_ENABLED" != "1" ]]; then
    echo '{"enabled":false,"reason":"EDITOR_ENABLED!=1"}' > "$STATUS_FILE"
    echo "[editor] Disabled via EDITOR_ENABLED" | tee -a "$LOG_FILE"
    exit 0
fi

# Detect container runtime
RUNTIME=""
if command -v docker &>/dev/null; then
    RUNTIME="docker"
elif command -v podman &>/dev/null; then
    RUNTIME="podman"
else
    echo '{"enabled":false,"error":"No Docker or Podman found"}' > "$STATUS_FILE"
    echo "[editor] ERROR: Neither docker nor podman found. Install one to use the editor." | tee -a "$LOG_FILE"
    exit 1
fi

echo "[editor] Using runtime: $RUNTIME" | tee -a "$LOG_FILE"

# Check if container already running
if $RUNTIME ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # The container exposes 8080 internally; map to whatever host port we chose.
    # Be robust across Docker/Podman and IPv4/IPv6 formats.
    EXISTING_PORT=$($RUNTIME port "$CONTAINER_NAME" 8080/tcp 2>/dev/null | sed -E 's/.*:(\d+).*/\1/' | head -n1 || echo "")
    if [[ -n "$EXISTING_PORT" ]] && curl -sf "http://127.0.0.1:${EXISTING_PORT}/" &>/dev/null; then
        echo "[editor] Container already running healthy on port $EXISTING_PORT" | tee -a "$LOG_FILE"
        TOKEN=""
        if [[ -f "$TOKEN_FILE" ]]; then
            TOKEN=$(cat "$TOKEN_FILE")
        fi
        cat > "$STATUS_FILE" <<EOF
{
  "enabled": true,
  "port": ${EXISTING_PORT},
  "token": "${TOKEN}",
  "container": "${CONTAINER_NAME}",
  "url": "http://127.0.0.1:${EXISTING_PORT}",
  "bind": "${EDITOR_BIND}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        echo "✅ Editor running: http://127.0.0.1:${EXISTING_PORT} (token in $TOKEN_FILE)"
        exit 0
    else
        echo "[editor] Container exists but unhealthy; removing..." | tee -a "$LOG_FILE"
        $RUNTIME rm -f "$CONTAINER_NAME" &>/dev/null || true
    fi
fi

# Find available port
FINAL_PORT="$EDITOR_PORT"
for port in $(seq "$EDITOR_PORT" $((EDITOR_PORT + 20))); do
    if ! lsof -iTCP:"$port" -sTCP:LISTEN &>/dev/null; then
        FINAL_PORT="$port"
        break
    fi
done

echo "[editor] Selected port: $FINAL_PORT" | tee -a "$LOG_FILE"

# Generate connection token
if [[ ! -f "$TOKEN_FILE" ]]; then
    openssl rand -hex 24 > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    echo "[editor] Generated new connection token" | tee -a "$LOG_FILE"
fi

TOKEN=$(cat "$TOKEN_FILE")

# Determine bind address
BIND_ADDR="127.0.0.1"
if [[ "$EDITOR_BIND" == "public" ]]; then
    BIND_ADDR="0.0.0.0"
    echo "[editor] WARNING: Binding to 0.0.0.0 (public access enabled)" | tee -a "$LOG_FILE"
fi

# Prepare volumes
WORKSPACE_MOUNT="$REPO_ROOT:/home/workspace"
# Mount both targets so either image persists settings:
# - codercom/code-server → /home/coder/.config/code-server and /home/coder/.local/share/code-server
# - openvscode-server   → /home/.openvscode-server
CS_CONFIG_MOUNT="$DATA_DIR/code-server-config:/home/coder/.config/code-server"
CS_DATA_MOUNT="$DATA_DIR/code-server-data:/home/coder/.local/share/code-server"
OVS_DATA_MOUNT1="$DATA_DIR/openvscode:/home/.openvscode-server"
OVS_DATA_MOUNT2="$DATA_DIR/openvscode:/home/openvscode-server/.openvscode-server"
CS_CODE_CONFIG_MOUNT="$DATA_DIR/code-server-config:/home/coder/.config/Code"

# Build docker run command
RUN_CMD=(
    "$RUNTIME" run -d
    --name "$CONTAINER_NAME"
    --restart unless-stopped
    -p "${BIND_ADDR}:${FINAL_PORT}:8080"
    -v "$WORKSPACE_MOUNT"
    -v "$CS_CONFIG_MOUNT"
    -v "$CS_CODE_CONFIG_MOUNT"
    -v "$CS_DATA_MOUNT"
    -v "$OVS_DATA_MOUNT1"
    -v "$OVS_DATA_MOUNT2"
    -e PASSWORD="$TOKEN"
    "$EDITOR_IMAGE"
    --auth none
    --bind-addr 0.0.0.0:8080
    /home/workspace
)

# Log the command
echo "[editor] Running: ${RUN_CMD[*]}" >> "$LOG_FILE"

# Start container
CONTAINER_ID=$("${RUN_CMD[@]}" 2>&1 | tee -a "$LOG_FILE" | tail -n1)

if [[ -z "$CONTAINER_ID" ]]; then
    echo '{"enabled":false,"error":"Failed to start container"}' > "$STATUS_FILE"
    echo "[editor] ERROR: Failed to start container" | tee -a "$LOG_FILE"
    exit 1
fi

# Wait for health check
echo "[editor] Waiting for editor to become healthy..." | tee -a "$LOG_FILE"
for i in {1..30}; do
    if curl -sf "http://127.0.0.1:${FINAL_PORT}/" &>/dev/null; then
        echo "[editor] Editor is healthy" | tee -a "$LOG_FILE"
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo "[editor] WARNING: Health check timeout after 30s" | tee -a "$LOG_FILE"
        $RUNTIME logs "$CONTAINER_NAME" 2>&1 | tail -n 200 >> "$LOG_FILE"
    fi
    sleep 1
done

# Write status
cat > "$STATUS_FILE" <<EOF
{
  "enabled": true,
  "port": ${FINAL_PORT},
  "token": "${TOKEN}",
  "container": "${CONTAINER_NAME}",
  "url": "http://127.0.0.1:${FINAL_PORT}",
  "bind": "${EDITOR_BIND}",
  "image": "${EDITOR_IMAGE}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Editor started: http://127.0.0.1:${FINAL_PORT}"
