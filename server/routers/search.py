import logging
import os
from typing import Any, Dict, Optional, Type

from fastapi import APIRouter, Query, Request

from server.services import rag as rag_svc
from retrieval.hybrid_search import search_routed_multi

# Runtime import pattern to handle optional dependency
MCPServerClass: Optional[Type] = None
try:
    from server.mcp.server import MCPServer
    MCPServerClass = MCPServer
except ImportError:
    pass

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/search")
def search(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None),
    top_k: Optional[int] = Query(None),
    request: Request = None,  # FastAPI-injected (not part of query model)
) -> Dict[str, Any]:
    return rag_svc.do_search(q, repo, top_k, request)


@router.get("/answer")
def answer(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None),
    request: Request = None,  # FastAPI-injected (not part of query model)
) -> Dict[str, Any]:
    return rag_svc.do_answer(q, repo, request)


@router.post("/api/chat")
def chat(payload: Dict[str, Any], request: Request):
    return rag_svc.do_chat(payload, request)


@router.get("/api/mcp/rag_search")
def api_mcp_rag_search(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None, description="Repository override: agro|agro"),
    top_k: int = Query(10, description="Number of results to return"),
    force_local: Optional[bool] = Query(False, description="Bypass MCP class and call local retrieval directly")
):
    """HTTP wrapper that mirrors MCP rag_search.

    - Tries to use MCPServer.handle_rag_search if available
    - Falls back to local retrieval if MCP server class is unavailable or force_local
    """
    try:
        if not force_local and MCPServerClass is not None:
            mcp = MCPServerClass()
            # MCPServer handle_rag_search is typically synchronous or async?
            # Assuming synchronous based on backup code.
            res = mcp.handle_rag_search(repo=(repo or os.getenv('REPO','agro')), question=q, top_k=top_k)  # type: ignore[attr-defined]
            return res
    except Exception:
        # fall through to local
        pass
    docs = search_routed_multi(q, repo_override=repo or os.getenv('REPO','agro'), m=4, final_k=top_k)
    results = [
        {
            "file_path": d.get("file_path", ""),
            "start_line": d.get("start_line", 0),
            "end_line": d.get("end_line", 0),
            "language": d.get("language", ""),
            "rerank_score": float(d.get("rerank_score", 0.0) or 0.0),
            "repo": d.get("repo", repo),
        }
        for d in docs
    ]
    return {"results": results, "repo": repo or os.getenv('REPO','agro'), "count": len(results)}
