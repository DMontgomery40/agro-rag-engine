import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from server.services import traces as traces_svc

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/api/traces")
def api_traces(repo: Optional[str] = Query(None)) -> Dict[str, Any]:
    return traces_svc.list_traces(repo)


@router.get("/api/traces/latest")
def api_traces_latest(repo: Optional[str] = Query(None)) -> Dict[str, Any]:
    return traces_svc.latest_trace(repo)

