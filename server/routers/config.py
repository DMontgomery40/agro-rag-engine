from typing import Any, Dict, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query
from server.services import config_store as cfg


router = APIRouter()


@router.get("/api/config-schema")
def get_config_schema() -> Dict[str, Any]:
    return cfg.config_schema()


@router.post("/api/env/reload")
def api_env_reload() -> Dict[str, Any]:
    return cfg.env_reload()


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
