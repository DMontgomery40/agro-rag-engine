import logging
from typing import Any, Dict

from fastapi import APIRouter

from server.services import keywords as kw

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/api/keywords")
def get_keywords() -> Dict[str, Any]:
    return kw.get_keywords()


@router.post("/api/keywords/add")
def add_keyword(body: Dict[str, Any]) -> Dict[str, Any]:
    return kw.add_keyword(body)


@router.post("/api/keywords/generate")
def generate_keywords(body: Dict[str, Any]) -> Dict[str, Any]:
    return kw.generate_keywords(body)

