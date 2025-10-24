import logging
from typing import Any, Dict

from fastapi import APIRouter, Query

from server.services import indexing as svc

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.post("/api/index/start")
def index_start(payload: Dict[str, Any] = None) -> Dict[str, Any]:
    return svc.start(payload)


@router.get("/api/index/stats")
def index_stats() -> Dict[str, Any]:
    return svc.stats()


@router.post("/api/index/run")
async def run_index(repo: str = Query(...), dense: bool = Query(True)):
    return await svc.run(repo, dense)


@router.get("/api/index/status")
def index_status() -> Dict[str, Any]:
    return svc.status()

