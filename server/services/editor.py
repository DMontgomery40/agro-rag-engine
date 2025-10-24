import json
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("agro.api")


def _settings_path() -> Path:
    settings_dir = Path(__file__).parent.parent / "out" / "editor"
    settings_dir.mkdir(parents=True, exist_ok=True)
    return settings_dir / "settings.json"


def _status_path() -> Path:
    status_dir = Path(__file__).parent.parent / "out" / "editor"
    status_dir.mkdir(parents=True, exist_ok=True)
    return status_dir / "status.json"


def read_settings() -> Dict[str, Any]:
    try:
        p = _settings_path()
        if p.exists():
            return json.loads(p.read_text())
    except Exception as e:
        logger.warning("read_settings failed: %s", e)
    return {"port": 4440, "enabled": True, "host": "127.0.0.1"}


def write_settings(settings: Dict[str, Any]) -> bool:
    try:
        p = _settings_path()
        p.write_text(json.dumps(settings, indent=2))
        return True
    except Exception as e:
        logger.warning("write_settings failed: %s", e)
        return False


def health() -> Dict[str, Any]:
    """Editor health. Degrades gracefully if status.json not present."""
    try:
        p = _status_path()
        if not p.exists():
            return {"ok": False, "error": "No status file", "enabled": False}
        data = json.loads(p.read_text())
        if not data.get("enabled", False):
            return {"ok": False, "reason": data.get("reason", "disabled"), "enabled": False}
        # Best-effort: return URL for browser even if server-side probe may fail in containers
        return {"ok": True, "enabled": True, "port": data.get("port"), "url": data.get("url"), "readiness_stage": "assume_ready_browser_access"}
    except Exception as e:
        logger.warning("editor health check failed: %s", e)
        return {"ok": False, "enabled": False, "error": str(e)}

