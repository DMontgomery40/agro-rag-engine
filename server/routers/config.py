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
    """Reload environment and propagate config changes to all caching modules.
    
    This endpoint reloads the config registry and then triggers reload_config()
    on all modules that cache configuration values. This ensures that changes
    to REPO, embedding models, reranker mode, etc. take effect immediately.
    """
    result = cfg.env_reload()
    
    # Track reload errors for debugging
    reload_errors = []
    reloaded_modules = []
    
    # List of modules that cache config values and need reloading
    # Format: (module_path, friendly_name)
    modules_to_reload = [
        ('retrieval.hybrid_search', 'hybrid_search'),
        ('retrieval.rerank', 'rerank'),
        ('server.langgraph_app', 'langgraph_app'),
        ('server.env_model', 'env_model'),
        ('server.tracing', 'tracing'),
        ('server.metrics', 'metrics'),
        ('server.services.keywords', 'keywords'),
        ('server.cards_builder', 'cards_builder'),
        ('server.learning_reranker', 'learning_reranker'),
        ('common.metadata', 'metadata'),
    ]
    
    for module_path, name in modules_to_reload:
        try:
            # Dynamic import to avoid circular dependencies
            parts = module_path.rsplit('.', 1)
            if len(parts) == 2:
                parent, child = parts
                module = __import__(module_path, fromlist=[child])
            else:
                module = __import__(module_path)
            
            if hasattr(module, 'reload_config'):
                module.reload_config()
                reloaded_modules.append(name)
                logger.debug(f"Reloaded {name} config")
        except Exception as e:
            reload_errors.append(f"{name}: {str(e)}")
            logger.warning(f"Failed to reload {name} config: {e}")
    
    if reload_errors:
        logger.warning(f"Some modules failed to reload: {reload_errors}")
        result["reload_warnings"] = reload_errors
    
    if reloaded_modules:
        logger.info(f"Successfully reloaded config for: {', '.join(reloaded_modules)}")
        result["reloaded_modules"] = reloaded_modules
    
    return result


@router.post("/api/env/save")
def api_env_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save environment variables"""
    result = cfg.set_config(payload)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid configuration"))
    return result


@router.post("/api/secrets/ingest")
async def api_secrets_ingest(
    file: UploadFile = File(...),
    persist: Optional[str] = Form(None),
) -> Dict[str, Any]:
    text = (await file.read()).decode("utf-8", errors="ignore")
    do_persist = str(persist or "").strip().lower() in {"1", "true", "on", "yes"}
    return cfg.secrets_ingest(text, do_persist)


@router.get("/api/secrets/check")
def check_secrets(keys: str = Query(default="")) -> Dict[str, bool]:
    """Check if secret keys are configured (without exposing values).
    
    Args:
        keys: Comma-separated list of key names to check (e.g., "OPENAI_API_KEY,COHERE_API_KEY")
    
    Returns:
        Dict mapping key names to boolean (True if configured and non-empty)
    """
    import os
    result = {}
    for key in keys.split(","):
        key = key.strip()
        if key:
            value = os.environ.get(key, "")
            # Key is "configured" if it exists and is not empty or masked
            result[key] = bool(value and not value.startswith("••••"))
    return result


@router.get("/api/config")
def get_config(unmask: bool = Query(default=False)) -> Dict[str, Any]:
    return cfg.get_config(unmask=bool(unmask))


@router.post("/api/config")
def set_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save configuration and auto-reload if critical settings changed.
    
    Critical settings that trigger auto-reload:
    - REPO: Active repository affects all queries
    - RERANKER_MODE: Affects search result ranking
    - GEN_MODEL: Affects generation responses
    - EMBEDDING_TYPE: Affects vector search
    """
    result = cfg.set_config(payload)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid configuration"))
    
    # Auto-reload if critical settings were changed
    env_updates = payload.get("env", {})
    critical_keys = {'REPO', 'RERANKER_MODE', 'GEN_MODEL', 'EMBEDDING_TYPE', 'EMBEDDING_MODEL'}
    
    if any(k in env_updates for k in critical_keys):
        changed_keys = [k for k in critical_keys if k in env_updates]
        logger.info(f"Critical config changed ({changed_keys}), triggering reload")
        reload_result = api_env_reload()
        result["auto_reloaded"] = True
        result["reloaded_modules"] = reload_result.get("reloaded_modules", [])
        if "reload_warnings" in reload_result:
            result["reload_warnings"] = reload_result["reload_warnings"]
    
    return result


@router.get("/api/models")
def get_prices():
    return cfg.prices_get()


@router.post("/api/models/upsert")
def upsert_price(item: Dict[str, Any]) -> Dict[str, Any]:
    return cfg.prices_upsert(item)


@router.post("/api/integrations/save")
def save_integrations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save integration settings (LangSmith, Grafana, webhooks, etc.)"""
    result = cfg.set_config(payload)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid configuration"))
    return result


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
