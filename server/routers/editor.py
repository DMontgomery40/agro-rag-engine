import logging
import httpx
from typing import Any, Dict
from pathlib import Path
import subprocess

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.websockets import WebSocket, WebSocketDisconnect

from server.services import editor as editor_svc

logger = logging.getLogger("agro.api")

router = APIRouter()

@router.get("/health/editor")
def editor_health() -> Dict[str, Any]:
    return editor_svc.health()

@router.get("/api/editor/settings")
def get_editor_settings() -> Dict[str, Any]:
    s = editor_svc.read_settings()
    return {
        "ok": True,
        "port": s.get("port", 4440),
        "enabled": s.get("enabled", True),
        "embed_enabled": s.get("embed_enabled", True),
        "bind": s.get("bind", "local"),
        "host": s.get("host", "127.0.0.1"),
        "image": s.get("image", "agro-vscode:latest"),
    }

@router.post("/api/editor/settings")
def set_editor_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    s = editor_svc.read_settings()
    if "port" in payload:
        s["port"] = int(payload["port"])
    if "enabled" in payload:
        s["enabled"] = bool(payload["enabled"])
    if "embed_enabled" in payload:
        s["embed_enabled"] = bool(payload["embed_enabled"])
    if "bind" in payload:
        s["bind"] = str(payload["bind"])
    if "host" in payload:
        s["host"] = str(payload["host"])
    if "image" in payload:
        s["image"] = str(payload["image"])
    ok = editor_svc.write_settings(s)
    return {"ok": ok, "message": "Settings saved" if ok else "Failed to persist settings"}

@router.post("/api/editor/restart")
def editor_restart() -> Dict[str, Any]:
    """Restart the embedded editor"""
    try:
        scripts_dir = Path(__file__).parent.parent.parent / "scripts"

        # Stop first
        down_script = scripts_dir / "editor_down.sh"
        if down_script.exists():
            subprocess.run([str(down_script)], check=False)

        # Start
        up_script = scripts_dir / "editor_up.sh"
        if up_script.exists():
            result = subprocess.run(
                [str(up_script)],
                capture_output=True,
                text=True,
                timeout=60
            )
            return {
                "ok": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        else:
            return {"ok": False, "error": "editor_up.sh not found"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# --- Proxy Logic ---

async def _editor_status_async() -> Dict[str, Any]:
    """Async helper to read status file."""
    return editor_svc.health()

@router.get("/editor")
def editor_root() -> Response:
    # normalize to trailing slash for relative asset links
    return RedirectResponse(url="/editor/")

@router.api_route("/editor/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def editor_proxy(path: str, request: Request):
    """Same-origin reverse proxy for the embedded editor."""
    # Check if this is a WebSocket upgrade request
    connection_header = request.headers.get("connection", "").lower()
    upgrade_header = request.headers.get("upgrade", "").lower()

    if "upgrade" in connection_header and upgrade_header == "websocket":
        import httpx_ws

        status = await _editor_status_async()
        base = str(status.get("direct_url") or status.get("url") or "").rstrip("/")
        if not base:
            return JSONResponse({"ok": False, "error": "No editor URL"}, status_code=503)

        qs = ("?" + request.url.query) if request.url.query else ""
        target = f"{base}/{path}{qs}"
        target = target.replace("http://", "ws://").replace("https://", "wss://")

        # Create WebSocket from ASGI scope
        websocket = WebSocket(request.scope, request.receive, request._send)
        await websocket.accept()

        try:
            # Connect to upstream WebSocket
            async with httpx.AsyncClient() as client:
                async with httpx_ws.aconnect_ws(target, client) as upstream_ws:
                    import asyncio

                    async def client_to_upstream():
                        try:
                            while True:
                                message = await websocket.receive()
                                if "text" in message:
                                    await upstream_ws.send_text(message["text"])
                                elif "bytes" in message:
                                    await upstream_ws.send_bytes(message["bytes"])
                        except (WebSocketDisconnect, Exception):
                            pass

                    async def upstream_to_client():
                        try:
                            async for message in upstream_ws:
                                if isinstance(message, httpx_ws.WSMessage):
                                    if message.type == httpx_ws.WSMessageType.TEXT:
                                        await websocket.send_text(message.data)
                                    elif message.type == httpx_ws.WSMessageType.BINARY:
                                        await websocket.send_bytes(message.data)
                        except (WebSocketDisconnect, Exception):
                            pass

                    await asyncio.gather(client_to_upstream(), upstream_to_client())
        except Exception as e:
            print(f"[WebSocket Proxy] Error: {e}")
        finally:
            await websocket.close()

        return Response(status_code=101)

    # Regular HTTP request handling
    status = await _editor_status_async()
    if not status.get("enabled"):
        return JSONResponse({"ok": False, "error": "Editor disabled"}, status_code=503)

    # Always proxy to the direct URL (container) to avoid recursive /editor calls
    base = str(status.get("direct_url") or status.get("url") or "").rstrip("/")
    if base.startswith("/editor"):
        # Fallback: if we somehow got the proxy URL, strip and use configured port instead
        base = str(status.get("url") or "").rstrip("/")
    if not base:
        return JSONResponse({"ok": False, "error": "No editor URL"}, status_code=503)

    qs = ("?" + request.url.query) if request.url.query else ""
    target = f"{base}/{path}{qs}"
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "connection", "accept-encoding")}
    
    async with httpx.AsyncClient() as client:
        try:
            upstream = await client.request(
                request.method, 
                target, 
                headers=headers, 
                content=await request.body(),
                timeout=30.0
            )
            resp_headers = dict(upstream.headers)
            for h in [
                "x-frame-options",
                "content-security-policy",
                "content-security-policy-report-only",
            ]:
                if h in resp_headers:
                    del resp_headers[h]
                
            return Response(content=upstream.content, status_code=upstream.status_code, headers=resp_headers)
        except Exception as e:
            return JSONResponse({"ok": False, "error": str(e)}, status_code=502)
