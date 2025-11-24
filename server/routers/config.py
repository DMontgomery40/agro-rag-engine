from typing import Any, Dict, Optional, Literal
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from pydantic import BaseModel
import logging
from server.services import config_store as cfg
from server.services.config_registry import get_config_registry

logger = logging.getLogger("agro.config")

router = APIRouter()


@router.get("/api/config-schema")
def get_config_schema() -> Dict[str, Any]:
    return cfg.config_schema()


@router.post("/api/env/reload")
def api_env_reload() -> Dict[str, Any]:
    result = cfg.env_reload()
    # Reload hybrid_search module globals to pick up config changes
    try:
        from retrieval import hybrid_search
        hybrid_search.reload_config()
        logger.info("Reloaded hybrid_search config globals")
    except Exception as e:
        logger.warning(f"Failed to reload hybrid_search config: {e}")
    return result


@router.post("/api/env/save")
def api_env_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save environment variables"""
    return cfg.set_config(payload)


@router.post("/api/secrets/ingest")
async def api_secrets_ingest(
    file: UploadFile = File(...),
    persist: Optional[str] = Form(None),
) -> Dict[str, Any]:
    text = (await file.read()).decode("utf-8", errors="ignore")
    do_persist = str(persist or "").strip().lower() in {"1", "true", "on", "yes"}
    return cfg.secrets_ingest(text, do_persist)


@router.get("/api/config")
def get_config(unmask: bool = Query(default=False)) -> Dict[str, Any]:
    return cfg.get_config(unmask=bool(unmask))


@router.post("/api/config")
def set_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    return cfg.set_config(payload)


@router.get("/api/prices")
def get_prices():
    return cfg.prices_get()


@router.post("/api/prices/upsert")
def upsert_price(item: Dict[str, Any]) -> Dict[str, Any]:
    return cfg.prices_upsert(item)


@router.post("/api/integrations/save")
def save_integrations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save integration settings (LangSmith, Grafana, webhooks, etc.)"""
    return cfg.set_config(payload)


@router.post("/api/config/mcp_key")
def save_mcp_key(payload: Dict[str, str]) -> Dict[str, Any]:
    """Save MCP API key to .env file.

    Args:
        payload: {"key": "MCP API key value"}

    Returns:
        Success status

    Security:
        - Key is written to .env (not logged)
        - Updates both file and os.environ for immediate effect
    """
    return cfg.save_mcp_key(payload.get("key", ""))


# Runtime Mode Endpoints
class RuntimeModeUpdate(BaseModel):
    """Runtime mode update request"""
    mode: Literal["development", "production"]


@router.get("/api/config/runtime_mode")
async def get_runtime_mode() -> Dict[str, str]:
    """Get current runtime mode setting.

    Returns:
        Current runtime mode value (development or production)
    """
    try:
        registry = get_config_registry()
        mode = registry.get_str('RUNTIME_MODE', 'development')
        return {"runtime_mode": mode}
    except Exception as e:
        logger.error(f"Failed to get runtime mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/config/runtime_mode")
async def update_runtime_mode(update: RuntimeModeUpdate) -> Dict[str, Any]:
    """Update runtime mode setting.

    Args:
        update: Runtime mode update (development or production)

    Returns:
        Success status and updated value

    Raises:
        400: Invalid mode value
        500: Failed to update config
    """
    try:
        registry = get_config_registry()
        registry.update_agro_config({'RUNTIME_MODE': update.mode})
        logger.info(f"Runtime mode updated to {update.mode}")
        return {
            "status": "success",
            "runtime_mode": update.mode,
            "message": f"Runtime mode updated to {update.mode}"
        }
    except Exception as e:
        logger.error(f"Failed to update runtime mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))
