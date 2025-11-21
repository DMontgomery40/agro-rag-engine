from typing import Dict, Any
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter
from server.utils import atomic_write_json, read_json
from common.paths import repo_root

router = APIRouter()

def _get_onboarding_state_path() -> Path:
    return repo_root() / "out" / "onboarding" / "state.json"

def _read_state() -> Dict[str, Any]:
    return read_json(_get_onboarding_state_path(), {"completed": False, "step": 1})

@router.get("/api/onboarding/state")
def get_onboarding_state() -> Dict[str, Any]:
    state = _read_state()
    return {
        "ok": True,
        "completed": state.get("completed", False),
        "completed_at": state.get("completed_at"),
        "step": state.get("step", 1)
    }

@router.post("/api/onboarding/complete")
def mark_onboarding_complete() -> Dict[str, Any]:
    state = _read_state()
    state.update({
        "completed": True,
        "completed_at": datetime.now().isoformat(),
        "step": 5
    })
    atomic_write_json(_get_onboarding_state_path(), state)
    return {"ok": True, "message": "Onboarding marked as complete"}

@router.post("/api/onboarding/reset")
def reset_onboarding() -> Dict[str, Any]:
    state = {"completed": False, "completed_at": None, "step": 1}
    atomic_write_json(_get_onboarding_state_path(), state)
    return {"ok": True, "message": "Onboarding reset"}

