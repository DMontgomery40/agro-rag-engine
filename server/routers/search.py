import logging
import os
from typing import Any, Dict, Optional, Type, Union

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from server.services import rag as rag_svc
from server.models.chat_models import ChatRequest, ChatResponse, SearchResponse, LegacyChatPayload
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
    """Retrieval-only search endpoint (no generation)."""
    return rag_svc.do_search(q, repo, top_k, request)


@router.get("/api/search")
def api_search(
    q: str = Query(..., description="Search query"),
    repo: Optional[str] = Query(None, description="Repository to search"),
    top_k: int = Query(10, ge=1, le=200, description="Number of results"),
    request: Request = None,
) -> Dict[str, Any]:
    """Retrieval-only search with /api prefix for consistency."""
    return rag_svc.do_search(q, repo, top_k, request)


@router.get("/answer")
def answer(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None),
    request: Request = None,  # FastAPI-injected (not part of query model)
) -> Dict[str, Any]:
    """DEPRECATED: Use POST /api/chat instead.

    This endpoint is maintained for backward compatibility but lacks:
    - Event ID for feedback correlation
    - Trace information
    - Provider metadata
    - Streaming support

    Prefer /api/chat for all new integrations.
    """
    return rag_svc.do_answer(q, repo, request)


@router.post("/api/chat")
async def chat(
    request: Request,
    payload: Union[ChatRequest, Dict[str, Any]] = None,
):
    """Unified chat endpoint with optional streaming support.

    Accepts both structured ChatRequest and legacy Dict payloads for backward
    compatibility. When stream=true in the payload, returns SSE stream.

    Request body (ChatRequest):
        - question: str - User question (required)
        - repo: str - Repository to search (optional)
        - model: str - Override generation model (optional)
        - temperature: float - Generation temperature (default: 0.0)
        - max_tokens: int - Max tokens (default: 2048)
        - final_k: int - Top-K results (default: 10)
        - stream: bool - Enable SSE streaming (default: false)
        - include_reasoning: bool - Include thinking in stream (default: false)
        - fast_mode: bool - Skip reranking (default: false)

    Returns:
        - Non-streaming: ChatResponse JSON with answer, citations, trace, meta
        - Streaming: SSE stream with chunks: thinking, content, citations, trace, meta, done
    """
    # Parse body - handle both Pydantic model and raw dict
    body = await request.body()
    import json as _json

    try:
        if body:
            raw = _json.loads(body.decode('utf-8'))
        else:
            raw = {}
    except Exception:
        raw = {}

    # Check if streaming requested
    stream_requested = raw.get('stream', False)

    if stream_requested:
        # Return streaming response
        return StreamingResponse(
            rag_svc.do_chat_stream(raw, request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )

    # Non-streaming: use existing do_chat
    return rag_svc.do_chat(raw, request)


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
