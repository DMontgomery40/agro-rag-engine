"""Autotune router - Parameter optimization endpoints.

Autotune is a Pro/Enterprise feature that automatically optimizes
retrieval and reranking parameters based on evaluation feedback.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.services.config_registry import get_config_registry

router = APIRouter()

# In-memory state (persists for session, reset on restart)
# For persistent state, this would be stored in agro_config.json
_autotune_state = {
    "enabled": False,
    "current_mode": None,
}


class AutotuneUpdateRequest(BaseModel):
    """Request body for autotune updates."""
    enabled: bool = False
    current_mode: str | None = None


def _check_pro_edition() -> bool:
    """Check if the current edition supports Pro features."""
    registry = get_config_registry()
    edition = registry.get_str("AGRO_EDITION", "oss").lower().strip()
    return edition in ("pro", "enterprise")


@router.get("/api/autotune/status")
def autotune_status() -> Dict[str, Any]:
    """Return autotune status.

    Returns 403 if Pro/Enterprise edition is required.
    """
    if not _check_pro_edition():
        raise HTTPException(
            status_code=403,
            detail="Autotune is a Pro/Enterprise feature. Set AGRO_EDITION to 'pro' or 'enterprise'."
        )

    return {
        "enabled": _autotune_state["enabled"],
        "current_mode": _autotune_state["current_mode"],
        "edition": get_config_registry().get_str("AGRO_EDITION", "oss"),
    }


@router.post("/api/autotune/status")
def autotune_update(payload: AutotuneUpdateRequest) -> Dict[str, Any]:
    """Update autotune settings.

    Returns 403 if Pro/Enterprise edition is required.
    """
    if not _check_pro_edition():
        raise HTTPException(
            status_code=403,
            detail="Autotune is a Pro/Enterprise feature. Set AGRO_EDITION to 'pro' or 'enterprise'."
        )

    _autotune_state["enabled"] = payload.enabled
    _autotune_state["current_mode"] = payload.current_mode

    return {
        "ok": True,
        "enabled": _autotune_state["enabled"],
        "current_mode": _autotune_state["current_mode"],
    }
