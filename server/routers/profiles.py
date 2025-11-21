import os
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from server.utils import read_json, atomic_write_json
from common.paths import gui_dir
from server.services.config_store import get_config

router = APIRouter()

def _read_prices() -> Dict[str, Any]:
    return read_json(gui_dir() / "prices.json", {"models": []})

@router.get("/api/profiles")
def profiles_list() -> Dict[str, Any]:
    prof_dir = gui_dir() / "profiles"
    prof_dir.mkdir(parents=True, exist_ok=True)
    names = []
    for p in prof_dir.glob("*.json"):
        names.append(p.stem)
    return {"profiles": sorted(names), "default": None}

@router.get("/api/profiles/{name}")
def profiles_get(name: str) -> Dict[str, Any]:
    prof_dir = gui_dir() / "profiles"
    path = prof_dir / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")
    prof = read_json(path)
    return {"ok": True, "name": name, "profile": prof}

@router.post("/api/profiles/save")
def profiles_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    name = str(payload.get("name") or "").strip()
    prof = payload.get("profile") or {}
    if not name:
        raise HTTPException(status_code=400, detail="missing name")
    path = gui_dir() / "profiles" / f"{name}.json"
    atomic_write_json(path, prof)
    return {"ok": True, "name": name}

@router.post("/api/profiles/apply")
def profiles_apply(payload: Dict[str, Any]) -> Dict[str, Any]:
    prof = payload.get("profile") or {}
    applied = []
    for k, v in prof.items():
        os.environ[str(k)] = str(v)
        applied.append(str(k))
    return {"ok": True, "applied_keys": applied}

# --- Auto-profile v2
try:
    from server.autoprofile import autoprofile as _ap_select
except Exception:
    _ap_select = None  # type: ignore

@router.post("/api/profile/autoselect")
def api_profile_autoselect(payload: Dict[str, Any]):
    if _ap_select is None:
        raise HTTPException(status_code=500, detail="autoprofile module not available")
    prices = _read_prices()
    env, reason = _ap_select(payload, prices)
    if not env:
        raise HTTPException(status_code=422, detail=reason)
    return {"env": env, "reason": reason}

@router.post("/api/checkpoint/config")
def checkpoint_config() -> Dict[str, Any]:
    """Write a timestamped checkpoint of current env + repos to gui/profiles."""
    cfg = get_config()
    from datetime import datetime
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    out_dir = gui_dir() / "profiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"checkpoint-{ts}.json"
    atomic_write_json(path, cfg)
    return {"ok": True, "path": str(path)}

