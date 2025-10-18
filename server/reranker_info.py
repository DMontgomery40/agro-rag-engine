from fastapi import APIRouter
from .reranker import get_reranker, get_reranker_info

router = APIRouter()

@router.get("/api/reranker/info")
def reranker_info():
    # trigger lazy load / hot-reload check if needed
    get_reranker()
    return get_reranker_info()
