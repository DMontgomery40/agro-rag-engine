import json
import logging
from pathlib import Path
from typing import Any, Dict
from urllib.request import urlopen
from urllib.error import URLError

from server.services.config_registry import get_config_registry
from server.models.agro_config_model import AGRO_CONFIG_KEYS

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
    """Read editor settings, preferring registry (agro_config.json/.env) with legacy file fallback."""
    registry = get_config_registry()
    settings = {
        "port": registry.get_int("EDITOR_PORT", 4440),
        "enabled": registry.get_bool("EDITOR_ENABLED", True),
        "embed_enabled": registry.get_bool("EDITOR_EMBED_ENABLED", True),
        "bind": registry.get_str("EDITOR_BIND", "local"),
        "image": registry.get_str("EDITOR_IMAGE", "agro-vscode:latest"),
        "host": "127.0.0.1",
    }

    # Legacy file override for host/port if present
    try:
        p = _settings_path()
        if p.exists():
            file_settings = json.loads(p.read_text())
            if isinstance(file_settings, dict):
                settings.update({k: v for k, v in file_settings.items() if v is not None})
    except Exception as e:
        logger.warning("read_settings failed: %s", e)

    return settings


def write_settings(settings: Dict[str, Any]) -> bool:
    """Persist editor settings to agro_config.json/.env (via registry) and legacy file."""
    registry = get_config_registry()
    try:
        updates = {}
        if "port" in settings:
            updates["EDITOR_PORT"] = int(settings["port"])
        if "bind" in settings:
            updates["EDITOR_BIND"] = str(settings["bind"])
        if "enabled" in settings:
            updates["EDITOR_ENABLED"] = 1 if bool(settings["enabled"]) else 0
        if "embed_enabled" in settings:
            updates["EDITOR_EMBED_ENABLED"] = 1 if bool(settings["embed_enabled"]) else 0
        if "image" in settings:
            updates["EDITOR_IMAGE"] = str(settings["image"])

        if updates:
            registry.update_agro_config({k: v for k, v in updates.items() if k in AGRO_CONFIG_KEYS})

        # Write legacy file for compatibility with existing scripts
        p = _settings_path()
        legacy_payload = {
            "port": settings.get("port", registry.get_int("EDITOR_PORT", 4440)),
            "enabled": bool(settings.get("enabled", registry.get_bool("EDITOR_ENABLED", True))),
            "host": settings.get("host", "127.0.0.1"),
        }
        p.write_text(json.dumps(legacy_payload, indent=2))
        return True
    except Exception as e:
        logger.warning("write_settings failed: %s", e)
        return False


def health() -> Dict[str, Any]:
    """Editor health with config-based fallback so UI never spins indefinitely."""
    registry = get_config_registry()
    cfg_enabled = registry.get_bool("EDITOR_ENABLED", True)
    cfg_embed = registry.get_bool("EDITOR_EMBED_ENABLED", True)
    cfg_port = registry.get_int("EDITOR_PORT", 4440)
    cfg_host = "127.0.0.1"
    proxy_url = "/editor/"
    direct_url = f"http://{cfg_host}:{cfg_port}/"
    token = None

    def _probe(url: str) -> bool:
        try:
            with urlopen(url, timeout=2) as resp:  # nosec - local probe
                return 200 <= getattr(resp, "status", 0) < 400
        except URLError:
            return False
        except Exception:
            return False

    status_data: Dict[str, Any] = {}
    # If status.json exists, honor it first
    try:
        p = _status_path()
        if p.exists():
            status_data = json.loads(p.read_text())
            token = status_data.get("token")
            cfg_port = int(status_data.get("port", cfg_port))
            direct_url = status_data.get("url", direct_url) or direct_url
    except Exception as e:
        logger.warning("editor health check failed reading status: %s", e)

    # Live probe takes precedence so iframe can load even if status.json is stale
    healthy = _probe(direct_url.rstrip("/") + "/")
    if healthy and cfg_enabled:
        return {
            "ok": True,
            "enabled": True,
            "embed_enabled": cfg_embed,
            "port": cfg_port,
            "url": proxy_url,
            "proxy_url": proxy_url,
            "direct_url": direct_url,
            "readiness_stage": "live_probe",
            "token": token,
        }

    # If status file explicitly disabled and no live service, respect it unless config forces enable
    if status_data and not status_data.get("enabled", True) and not healthy and not cfg_enabled:
        return {"ok": False, "enabled": False, "embed_enabled": cfg_embed, "reason": status_data.get("reason", "disabled")}

    # Fallback to config-derived URL instead of failing hard
    return {
        "ok": cfg_enabled and healthy,
        "enabled": cfg_enabled,
        "embed_enabled": cfg_embed,
        "port": cfg_port,
        "url": proxy_url,
        "proxy_url": proxy_url,
        "direct_url": direct_url,
        "readiness_stage": "config_fallback",
        "token": token,
    }
