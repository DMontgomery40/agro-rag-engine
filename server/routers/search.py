import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query, Request

from server.services import rag as rag_svc

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/search")
def search(q: str = Query(..., description="Question"), repo: Optional[str] = Query(None), top_k: Optional[int] = Query(None), request: Request = None) -> Dict[str, Any]:
    return rag_svc.do_search(q, repo, top_k, request)


@router.get("/answer")
def answer(q: str = Query(..., description="Question"), repo: Optional[str] = Query(None), request: Request = None) -> Dict[str, Any]:
    return rag_svc.do_answer(q, repo, request)


@router.post("/api/chat")
def chat(payload: Dict[str, Any], request: Request):
    return rag_svc.do_chat(payload, request)

