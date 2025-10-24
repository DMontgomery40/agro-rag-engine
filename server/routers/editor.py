import logging
from typing import Any, Dict

from fastapi import APIRouter

from server.services import editor as editor_svc

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/health/editor")
def editor_health() -> Dict[str, Any]:
    return editor_svc.health()


@router.get("/api/editor/settings")
def get_editor_settings() -> Dict[str, Any]:
    s = editor_svc.read_settings()
    return {"ok": True, "port": s.get("port", 4440), "enabled": s.get("enabled", True), "host": s.get("host", "127.0.0.1")}


@router.post("/api/editor/settings")
def set_editor_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    s = editor_svc.read_settings()
    if "port" in payload:
        s["port"] = int(payload["port"])
    if "enabled" in payload:
        s["enabled"] = bool(payload["enabled"])
    if "host" in payload:
        s["host"] = str(payload["host"])
    ok = editor_svc.write_settings(s)
    return {"ok": ok, "message": "Settings saved" if ok else "Failed to persist settings"}

