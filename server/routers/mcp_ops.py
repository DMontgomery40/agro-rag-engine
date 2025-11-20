import os
import sys
import json
import subprocess
from typing import Dict, Any
from fastapi import APIRouter
from common.paths import repo_root

router = APIRouter()

def mcp_http_status_check() -> Dict[str, Any]:
    """Shared logic for status check."""
    import socket
    host = os.getenv('MCP_HTTP_HOST') or '127.0.0.1'
    try:
        port = int(os.getenv('MCP_HTTP_PORT') or '8013')
    except Exception:
        port = 8013
    path = os.getenv('MCP_HTTP_PATH') or '/mcp'
    running = False
    try:
        with socket.create_connection((host, port), timeout=0.25):
            running = True
    except Exception:
        running = False
    url = f"http://{host}:{port}"
    return {
        "running": running,
        "host": host,
        "port": port,
        "path": path,
        "mode": "http",
        "url": url,
    }

@router.get("/api/mcp/http/status")
def mcp_http_status() -> Dict[str, Any]:
    return mcp_http_status_check()

@router.get("/api/mcp/status")
def mcp_status() -> Dict[str, Any]:
    """Consolidated MCP status for Dashboard."""
    import socket
    def tcp(host: str, port: int, timeout: float = 0.25) -> bool:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            return False

    # Python HTTP MCP
    py_host = os.getenv('MCP_HTTP_HOST') or '127.0.0.1'
    try:
        py_port = int(os.getenv('MCP_HTTP_PORT') or '8013')
    except Exception:
        py_port = 8013
    py_path = os.getenv('MCP_HTTP_PATH') or '/mcp'
    py_http = {
        'running': tcp(py_host, py_port),
        'host': py_host,
        'port': py_port,
        'path': py_path,
        'url': f"http://{py_host}:{py_port}{py_path}",
    }

    # Node HTTP MCP (proxy); default to :8014
    node_host = os.getenv('NODE_MCP_HOST') or '127.0.0.1'
    try:
        node_port = int(os.getenv('NODE_MCP_PORT') or '8014')
    except Exception:
        node_port = 8014
    node_http = {
        'running': tcp(node_host, node_port),
        'host': node_host,
        'port': node_port,
        'path': '/mcp',
        'url': f"http://{node_host}:{node_port}/mcp",
    }

    # Python stdio MCP availability
    try:
        __import__("server.mcp.server")
        py_stdio_available = True
    except Exception:
        py_stdio_available = False

    return {
        'python_http': py_http,
        'node_http': node_http,
        'python_stdio_available': py_stdio_available,
    }

@router.post("/api/mcp/http/start")
def mcp_http_start() -> Dict[str, Any]:
    """Start HTTP MCP server on port 8013"""
    try:
        status = mcp_http_status_check()
        if status["running"]:
            return {"success": False, "error": "HTTP MCP already running on port 8013"}
        
        subprocess.Popen(
            [sys.executable, "-m", "server.mcp.http"],
            cwd=str(repo_root()),
            stdout=open("/tmp/agro_mcp_http.log", "w"),
            stderr=subprocess.STDOUT
        )
        
        import time
        time.sleep(2)
        status = mcp_http_status_check()
        return {"success": status["running"], "port": 8013}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/api/mcp/http/stop")
def mcp_http_stop() -> Dict[str, Any]:
    """Stop HTTP MCP server"""
    try:
        # Kill process on port 8013
        _ = subprocess.run(
            ["pkill", "-f", "server.mcp.http"],
            capture_output=True, text=True, timeout=5
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/api/mcp/http/restart")
def mcp_http_restart() -> Dict[str, Any]:
    stop_result = mcp_http_stop()
    if not stop_result["success"]:
        return stop_result
    import time
    time.sleep(1)
    return mcp_http_start()

@router.get("/api/mcp/test")
def mcp_stdio_test() -> Dict[str, Any]:
    """Test stdio MCP server (one-shot)"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "server.mcp.server"],
            input='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
            capture_output=True, text=True, timeout=10, cwd=str(repo_root())
        )
        
        if result.returncode == 0 and result.stdout:
            try:
                response = json.loads(result.stdout.strip())
                tools = response.get("result", [])
                return {
                    "success": True,
                    "tools_count": len(tools),
                    "tools": [t.get("name") for t in tools] if isinstance(tools, list) else [],
                    "output": result.stdout[:500]
                }
            except Exception:
                pass
        
        return {"success": False, "error": "Failed to parse MCP response", "output": result.stdout + "\n" + result.stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}
