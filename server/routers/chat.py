from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from common.paths import repo_root
from server.utils import atomic_write_json, read_json


router = APIRouter()


def _out_dir() -> Path:
    return repo_root() / "out"


def _config_path() -> Path:
    return _out_dir() / "chat_config.json"


def _templates_path() -> Path:
    return _out_dir() / "chat_templates.json"


@router.get("/api/chat/config")
def get_chat_config() -> Dict[str, Any]:
    """Return persisted chat configuration, or {} if none saved.

    UI merges this with its DEFAULT_CONFIG on the client.
    """
    data = read_json(_config_path(), default={})
    # Ensure we only return JSON objects
    if not isinstance(data, dict):
        return {}
    return data


@router.post("/api/chat/config")
def set_chat_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist chat configuration to repo_root()/out/chat_config.json.

    Accepts arbitrary key/value pairs; the UI performs its own validation
    and merges with a typed default on the client.
    """
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Ensure payload is JSON-serializable
        json.dumps(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
    atomic_write_json(p, payload)
    return {"ok": True}


@router.post("/api/chat/templates")
def save_chat_template(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Append a chat prompt template to out/chat_templates.json.

    Expected payload: {"name": str, "prompt": str}
    """
    name = str(payload.get("name", "")).strip()
    prompt = str(payload.get("prompt", ""))
    if not name or not prompt:
        raise HTTPException(status_code=400, detail="Both 'name' and 'prompt' are required")

    path = _templates_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = read_json(path, default=[])
    if not isinstance(data, list):
        data = []

    entry = {
        "name": name,
        "prompt": prompt,
        "created_at": __import__("datetime").datetime.now().isoformat(),
    }
    data.append(entry)
    atomic_write_json(path, data)
    return {"ok": True}

