#!/usr/bin/env bash
# MCP Server Management Script for AGRO
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ACTION="${1:-restart}"

stop_mcp() {
    echo "[mcp] Stopping existing MCP server processes..."
    # Kill processes running server.mcp.server (current/correct path)
    pkill -f "server.mcp.server" 2>/dev/null && echo "[mcp] Killed server.mcp.server processes" || echo "[mcp] No server.mcp.server processes found"
    
    # Kill any old mcp_server.py processes (legacy/stale)
    pkill -f "/Users/davidmontgomery/agro.*mcp_server.py" 2>/dev/null && echo "[mcp] Killed legacy mcp_server.py processes" || echo "[mcp] No legacy processes found"
    
    sleep 1
}

start_mcp() {
    echo "[mcp] Starting MCP server..."
    
    # Ensure venv exists
    if [ ! -d "$ROOT_DIR/.venv" ]; then
        echo "[err] Virtual environment not found at $ROOT_DIR/.venv" >&2
        exit 1
    fi
    
    # Start MCP server in background
    nohup bash -c "cd '$ROOT_DIR' && . .venv/bin/activate && python -m server.mcp.server" \
        > /tmp/agro_mcp_server.log 2>&1 &
    
    MCP_PID=$!
    echo "[mcp] Started MCP server (PID: $MCP_PID)"
    echo "[mcp] Logs: /tmp/agro_mcp_server.log"
    
    # Wait a moment and check if it's still running
    sleep 2
    if ps -p $MCP_PID > /dev/null 2>&1; then
        echo "[mcp] ✓ MCP server is running"
    else
        echo "[err] MCP server failed to start. Check logs at /tmp/agro_mcp_server.log" >&2
        tail -20 /tmp/agro_mcp_server.log
        exit 1
    fi
}

status_mcp() {
    echo "[mcp] Checking MCP server status..."
    if pgrep -f "server.mcp.server" >/dev/null; then
        echo "[mcp] ✓ MCP server is running:"
        ps aux | grep "server.mcp.server" | grep -v grep
    else
        echo "[mcp] ✗ MCP server is not running"
    fi
    
    # Check for legacy processes
    if pgrep -f "/Users/davidmontgomery/agro.*mcp_server.py" >/dev/null; then
        echo "[warn] Found legacy mcp_server.py processes (should be cleaned up):"
        ps aux | grep "/Users/davidmontgomery/agro.*mcp_server.py" | grep -v grep
    fi
}

test_mcp() {
    echo "[mcp] Testing MCP server..."
    cd "$ROOT_DIR"
    . .venv/bin/activate
    
    echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
        timeout 5 python -m server.mcp.server 2>/dev/null | \
        python -c 'import sys, json; d=json.load(sys.stdin); print("✓ Tools:", len(d.get("result", [])))'
}

case "$ACTION" in
    start)
        start_mcp
        ;;
    stop)
        stop_mcp
        ;;
    restart)
        stop_mcp
        start_mcp
        ;;
    status)
        status_mcp
        ;;
    test)
        test_mcp
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start MCP server"
        echo "  stop    - Stop all MCP server processes"
        echo "  restart - Stop and start MCP server (default)"
        echo "  status  - Check MCP server status"
        echo "  test    - Test MCP server functionality"
        exit 1
        ;;
esac

