import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from retrieval.hybrid_search import search_routed_multi
from server.metrics import stage

logger = logging.getLogger("agro.api")

_graph = None
CFG = {"configurable": {"thread_id": "http"}}


def _get_graph():
    global _graph
    if _graph is None:
        try:
            from server.langgraph_app import build_graph
            _graph = build_graph()
        except Exception as e:
            logger.warning("build_graph failed: %s", e)
            _graph = None
    return _graph


def do_search(q: str, repo: Optional[str], top_k: Optional[int], request: Optional[Request] = None) -> Dict[str, Any]:
    if top_k is None:
        try:
            top_k = int(os.getenv('FINAL_K', os.getenv('LANGGRAPH_FINAL_K', '10') or 10))
        except Exception:
            top_k = 10

    with stage("retrieve"):
        docs = list(search_routed_multi(q, repo_override=repo, m=4, final_k=top_k))

    results: List[Dict[str, Any]] = []
    for d in docs:
        try:
            results.append(dict(d))
        except Exception:
            results.append({k: d.get(k) for k in ("file_path","start_line","end_line","rerank_score","code") if k in d})

    return {"results": results, "repo": repo or os.getenv('REPO', 'agro'), "count": len(results)}


def do_answer(q: str, repo: Optional[str], request: Optional[Request] = None) -> Dict[str, Any]:
    g = _get_graph()
    if g is None:
        # Fallback: retrieval-only answer
        sr = do_search(q, repo, top_k=None, request=request)
        lines = []
        for d in sr.get("results", [])[:5]:
            try:
                lines.append(f"- {d.get('file_path','')}:{d.get('start_line',0)}-{d.get('end_line',0)}  score={float(d.get('rerank_score',0) or 0.0):.3f}")
            except Exception:
                pass
        return {"answer": "Retrieval-only (no model available)\n" + "\n".join(lines), "event_id": None}

    try:
        state = {"question": q, "documents": [], "generation": "", "iteration": 0, "confidence": 0.0, "repo": (repo.strip() if repo else None)}
        res = g.invoke(state, CFG)
        return {"answer": res.get("generation", ""), "event_id": None}
    except Exception as e:
        logger.warning("answer pipeline failed: %s", e)
        return {"answer": f"Error: {e}", "event_id": None}


def do_chat(payload: Dict[str, Any], request: Optional[Request] = None) -> JSONResponse:
    # Apply overrides to env for the invocation lifetime
    overrides = {
        'GEN_MODEL': payload.get('model'),
        'GEN_TEMPERATURE': payload.get('temperature'),
        'GEN_MAX_TOKENS': payload.get('max_tokens'),
        'MQ_REWRITES': payload.get('multi_query'),
        'LANGGRAPH_FINAL_K': payload.get('final_k'),
        'SYSTEM_PROMPT': payload.get('system_prompt'),
    }
    saved = {k: os.environ.get(k) for k in overrides.keys()}
    try:
        for k, v in overrides.items():
            if v is None:
                continue
            os.environ[k] = str(v)
        g = _get_graph()
        if g is None:
            res = do_search(payload.get('question',''), payload.get('repo'), None, request)
            text = "Retrieval-only (no model available)\n" + "\n".join(
                [f"- {d.get('file_path','')}:{d.get('start_line',0)}-{d.get('end_line',0)}" for d in res.get('results', [])[:5]]
            )
            return JSONResponse({"answer": text, "confidence": 0.0, "event_id": None})

        state = {
            "question": payload.get('question',''),
            "documents": [],
            "generation": "",
            "iteration": 0,
            "confidence": 0.0,
            "repo": (payload.get('repo','').strip() or None),
        }
        res = g.invoke(state, CFG)
        return JSONResponse({"answer": res.get("generation",""), "confidence": res.get("confidence",0.0), "event_id": None})
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
