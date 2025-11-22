import os
from typing import Any, Dict

import requests
from fastapi import APIRouter

from server.services.config_registry import get_config_registry
from server.services import config_store as cfg_store

router = APIRouter()


def _safe_config(unmask: bool = False) -> Dict[str, Any]:
    """Return the current Grafana configuration with optional secret masking."""
    registry = get_config_registry()

    api_key = os.getenv("GRAFANA_API_KEY", "")
    auth_token = os.getenv("GRAFANA_AUTH_TOKEN", "")

    if not unmask and api_key:
        api_key = "••••••••"
    if not unmask and auth_token:
        auth_token = "••••••••"

    dashboard_uid = registry.get_str("GRAFANA_DASHBOARD_UID", "agro-overview")
    dashboard_slug = registry.get_str("GRAFANA_DASHBOARD_SLUG", "agro-overview")

    return {
        "url": registry.get_str("GRAFANA_BASE_URL", "http://127.0.0.1:3000"),
        "dashboardUid": dashboard_uid,
        "dashboardSlug": dashboard_slug or dashboard_uid,
        "refresh": registry.get_str("GRAFANA_REFRESH", "10s"),
        "kiosk": registry.get_str("GRAFANA_KIOSK", "tv"),
        "orgId": registry.get_int("GRAFANA_ORG_ID", 1),
        "authMode": registry.get_str("GRAFANA_AUTH_MODE", "anonymous"),
        "embedEnabled": registry.get_bool("GRAFANA_EMBED_ENABLED", True),
        "apiKey": api_key,
        "authToken": auth_token,
    }


@router.get("/api/grafana/config")
def get_grafana_config() -> Dict[str, Any]:
    """Return Grafana configuration sourced from agro_config.json/.env."""
    return _safe_config(unmask=False)


@router.post("/api/grafana/config")
def save_grafana_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist Grafana configuration into agro_config.json and .env."""
    registry = get_config_registry()

    base_url = str(payload.get("url") or payload.get("baseUrl") or "").strip() or "http://127.0.0.1:3000"
    dashboard_uid = str(payload.get("dashboardUid") or payload.get("dashboardId") or "agro-overview").strip() or "agro-overview"
    dashboard_slug = str(payload.get("dashboardSlug") or payload.get("dashboardId") or dashboard_uid).strip() or dashboard_uid
    refresh = str(payload.get("refresh") or "10s").strip() or "10s"
    kiosk = str(payload.get("kiosk") or "tv").strip() or "tv"
    auth_mode = str(payload.get("authMode") or "anonymous").strip() or "anonymous"
    org_id_raw = payload.get("orgId", 1)
    try:
        org_id = int(org_id_raw)
    except Exception:
        org_id = 1
    embed_enabled = bool(payload.get("embedEnabled", True))

    # Update agro_config.json values
    registry.update_agro_config(
        {
            "GRAFANA_BASE_URL": base_url,
            "GRAFANA_DASHBOARD_UID": dashboard_uid,
            "GRAFANA_DASHBOARD_SLUG": dashboard_slug,
            "GRAFANA_REFRESH": refresh,
            "GRAFANA_KIOSK": kiosk,
            "GRAFANA_AUTH_MODE": auth_mode,
            "GRAFANA_ORG_ID": org_id,
            "GRAFANA_EMBED_ENABLED": 1 if embed_enabled else 0,
        }
    )

    # Persist secrets to .env (optional)
    env_updates: Dict[str, Any] = {}
    if payload.get("apiKey"):
        env_updates["GRAFANA_API_KEY"] = str(payload.get("apiKey")).strip()
    if payload.get("authToken"):
        env_updates["GRAFANA_AUTH_TOKEN"] = str(payload.get("authToken")).strip()

    if env_updates:
        cfg_store.set_config({"env": env_updates})

    return _safe_config(unmask=False)


@router.post("/api/grafana/test")
def test_grafana(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Connectivity test to Grafana, Prometheus, and Loki datasources."""
    cfg = _safe_config(unmask=True)
    base_url = str(payload.get("url") or cfg.get("url") or "http://127.0.0.1:3000").rstrip("/")
    api_key = str(payload.get("apiKey") or os.getenv("GRAFANA_API_KEY", "") or "").strip()
    auth_token = str(payload.get("authToken") or os.getenv("GRAFANA_AUTH_TOKEN", "") or "").strip()

    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    result: Dict[str, Any] = {"success": False, "health": None, "datasources": {"prometheus": False, "loki": False}}

    try:
        health_resp = requests.get(f"{base_url}/api/health", headers=headers, timeout=5)
        result["health"] = {"status": health_resp.status_code, "body": health_resp.json() if health_resp.ok else None}
        if not health_resp.ok:
            result["error"] = f"Health check failed ({health_resp.status_code})"
            return result
    except Exception as e:
        result["error"] = f"Health check error: {e}"
        return result

    # Datasources probe
    try:
        ds_resp = requests.get(f"{base_url}/api/datasources", headers=headers, timeout=5)
        if ds_resp.ok:
            datasources = ds_resp.json() if isinstance(ds_resp.json(), list) else []
            for ds in datasources:
                if str(ds.get("type")) == "prometheus":
                    result["datasources"]["prometheus"] = True
                if str(ds.get("type")) == "loki":
                    result["datasources"]["loki"] = True
        else:
            result["error"] = f"Datasources check failed ({ds_resp.status_code})"
    except Exception as e:
        result["error"] = f"Datasources error: {e}"

    health_ok = bool(result.get("health") and result["health"].get("status") == 200)
    ds_ok = bool(result["datasources"]["prometheus"] or result["datasources"]["loki"])

    if health_ok and not ds_ok and "error" not in result:
        result["error"] = "No Prometheus/Loki datasources detected"

    result["success"] = health_ok and (ds_ok or "error" not in result)
    return result
