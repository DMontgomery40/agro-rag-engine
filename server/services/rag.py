import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from retrieval.hybrid_search import search_routed_multi
from server.metrics import stage
from server.telemetry import log_query_event
from server.services.config_registry import get_config_registry
import uuid

logger = logging.getLogger("agro.api")

# Module-level config registry
_config_registry = get_config_registry()

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
            # Try FINAL_K first, fall back to LANGGRAPH_FINAL_K
            top_k = _config_registry.get_int('FINAL_K', _config_registry.get_int('LANGGRAPH_FINAL_K', 10))
        except Exception:
            top_k = 10

    trace_obj = None
    try:
        from server.tracing import get_trace as _gt
        trace_obj = _gt()
    except Exception:
        trace_obj = None

    with stage("retrieve"):
        docs = list(search_routed_multi(q, repo_override=repo, m=4, final_k=top_k, trace=trace_obj))

    results: List[Dict[str, Any]] = []
    for d in docs:
        try:
            results.append(dict(d))
        except Exception:
            results.append({k: d.get(k) for k in ("file_path","start_line","end_line","rerank_score","code") if k in d})

    return {"results": results, "repo": repo or _config_registry.get_str('REPO', 'agro'), "count": len(results)}


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
    # Validate per-chat parameters early and return exceptional, guided errors
    try:
        if payload is not None and isinstance(payload, dict):
            fk = payload.get('final_k')
            if fk is not None:
                try:
                    fk_i = int(fk)
                except Exception:
                    return JSONResponse({
                        "detail": "Invalid value for final_k: must be an integer",
                        "causes": ["The provided value cannot be parsed as an integer."],
                        "fixes": ["Enter a whole number >= 1 for Final K (e.g., 10)."],
                        "links": [["Top‑K Retrieval (Wikipedia)", "https://en.wikipedia.org/wiki/Information_retrieval"]]
                    }, status_code=400)
                if fk_i < 1 or fk_i > 200:
                    return JSONResponse({
                        "detail": "final_k must be between 1 and 200",
                        "causes": [
                            "Values < 1 are invalid (no results).",
                            "Very large values can cause excessive latency and memory use."
                        ],
                        "fixes": [
                            "Use a balanced value like 10 (default) or 20 for broader context.",
                            "For very fast responses, try 5."
                        ],
                        "links": [["Retrieval Basics", "https://en.wikipedia.org/wiki/Information_retrieval"]]
                    }, status_code=400)
    except Exception:
        # Never block chat on validator errors
        pass
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
    trace_obj = None
    try:
        from server.tracing import get_trace as _gt
        trace_obj = _gt()
    except Exception:
        trace_obj = None
    try:
        for k, v in overrides.items():
            if v is None:
                continue
            os.environ[k] = str(v)
        # Reload module-level caches so overrides take effect immediately
        try:
            from server import env_model as _envm
            _envm.reload_config()
        except Exception:
            pass
        try:
            from retrieval import hybrid_search as _hs
            _hs.reload_config()
        except Exception:
            pass
        try:
            from retrieval import rerank as _rr
            _rr.reload_config()
        except Exception:
            pass
        try:
            from server import langgraph_app as _lg
            if hasattr(_lg, 'reload_config'):
                _lg.reload_config()
        except Exception:
            pass
        # Fast mode for GUI tests: disable heavy pipeline
        fast = bool(payload.get('fast_mode')) or (
            bool(request) and (request.query_params.get('fast') in {'1','true','on'})
        )
        if fast:
            os.environ['DISABLE_RERANK'] = '1'
            os.environ['VECTOR_BACKEND'] = os.environ.get('VECTOR_BACKEND') or 'faiss'
            os.environ['MQ_REWRITES'] = '1'
            from retrieval.hybrid_search import search_routed
            import time as _t
            t0 = _t.time()
            sr = search_routed(payload.get('question',''), repo_override=payload.get('repo'), trace=trace_obj)
            fast_retrieve_ms = int((_t.time()-t0)*1000)
            lines = []
            retrieved = []
            for d in sr[:5]:
                fp = d.get('file_path','')
                sl = int(d.get('start_line',0) or 0)
                el = int(d.get('end_line',0) or 0)
                doc_id = f"{fp}:{sl}-{el}" if fp else ''
                lines.append(f"- {fp}:{sl}-{el}")
                if doc_id:
                    retrieved.append({"doc_id": doc_id, "score": float(d.get('rerank_score', 0.0) or 0.0)})
            trace_steps: List[Dict[str, Any]] = []
            try:
                if trace_obj and getattr(trace_obj, 'events', None):
                    for ev in trace_obj.events[-200:]:
                        kind = str(ev.get('kind') or '')
                        data = ev.get('data') if isinstance(ev.get('data'), dict) else {}
                        if kind in {'retriever.retrieve', 'vector_search', 'bm25_search', 'rrf_fusion', 'hydrate', 'rerank'}:
                            trace_steps.append({"step": kind, "duration": data.get('duration_ms'), "details": data})
            except Exception:
                trace_steps = []
            if not trace_steps:
                hydrated = sum(1 for d in sr if d.get('code'))
                trace_steps = [
                    {"step": "retrieve", "duration": fast_retrieve_ms, "details": {"results": len(sr)}},
                    {"step": "bm25_search", "duration": None, "details": {"results": len(sr)}},
                    {"step": "vector_search", "duration": None, "details": {"results": len(sr)}},
                    {"step": "rrf_fusion", "duration": None, "details": {"results": len(sr)}},
                    {"step": "hydrate", "duration": None, "details": {"hydrated": hydrated, "candidates": len(sr)}},
                ]
            citations = []
            for d in sr[:5]:
                fp = d.get('file_path','') or ''
                sl = int(d.get('start_line',0) or 0)
                el = int(d.get('end_line',0) or 0)
                if fp:
                    citations.append(f"{fp}:{sl}-{el}")
            answer_text = "Retrieval-only (fast mode)\n" + "\n".join(lines)
            event_id = (uuid.uuid4().hex if _is_test_request(request) else log_query_event(
                query_raw=payload.get('question',''),
                query_rewritten=None,
                retrieved=retrieved,
                answer_text=answer_text,
                route='chat/fast',
                client_ip=(request.client.host if request and request.client else None),
                user_agent=(request.headers.get('user-agent') if request else None),
            ))
            return JSONResponse({"answer": answer_text, "confidence": 0.0, "event_id": event_id, "trace": {"steps": trace_steps}, "citations": citations})

        g = _get_graph()
        if g is None:
            # Retrieval-only fallback: collect basic retrieval info for logging
            import time as _t
            t0 = _t.time()
            sr = do_search(payload.get('question',''), payload.get('repo'), None, request)
            top = sr.get('results', [])[:5]
            lines = []
            retrieved = []
            for d in top:
                fp = d.get('file_path', '') or ''
                sl = int(d.get('start_line', 0) or 0)
                el = int(d.get('end_line', 0) or 0)
                doc_id = f"{fp}:{sl}-{el}" if fp else ''
                lines.append(f"- {fp}:{sl}-{el}")
                if doc_id:
                    retrieved.append({"doc_id": doc_id, "score": float(d.get('rerank_score', 0.0) or 0.0)})
            citations = []
            for d in top:
                fp = d.get('file_path', '') or ''
                sl = int(d.get('start_line', 0) or 0)
                el = int(d.get('end_line', 0) or 0)
                if fp:
                    citations.append(f"{fp}:{sl}-{el}")
            answer_text = "Retrieval-only (no model available)\n" + "\n".join(lines)
            # Minimal local trace for UI panel
            trace = {"steps": [
                {"step": "retrieve", "duration": int((_t.time()-t0)*1000), "details": {"candidates": len(sr.get('results', []))}}
            ]}
            # Log event to enable feedback correlation
            if _is_test_request(request):
                event_id = uuid.uuid4().hex  # Do not write test traffic to training logs
            else:
                event_id = log_query_event(
                    query_raw=payload.get('question',''),
                    query_rewritten=None,
                    retrieved=retrieved,
                    answer_text=answer_text,
                    route='chat/fallback',
                    client_ip=(request.client.host if request and request.client else None),
                    user_agent=(request.headers.get('user-agent') if request else None),
                )
            return JSONResponse({"answer": answer_text, "confidence": 0.0, "event_id": event_id, "trace": trace, "citations": citations})

        state = {
            "question": payload.get('question',''),
            "documents": [],
            "generation": "",
            "iteration": 0,
            "confidence": 0.0,
            "repo": ((payload.get('repo') or '').strip() or None),
        }
        import time as _t
        t0 = _t.time()
        res = g.invoke(state, CFG)
        answer_text = res.get("generation", "")
        # Attempt to capture retrieval details if present on state/res
        retrieved = []
        try:
            docs = (res.get('documents') or state.get('documents') or [])
            for d in docs[:10]:
                fp = d.get('file_path') or d.get('path') or ''
                sl = int(d.get('start_line', 0) or 0)
                el = int(d.get('end_line', 0) or 0)
                doc_id = f"{fp}:{sl}-{el}" if fp else ''
                if doc_id:
                    retrieved.append({"doc_id": doc_id, "score": float(d.get('rerank_score', 0.0) or 0.0)})
        except Exception:
            pass
        dur = int((_t.time()-t0)*1000)
        citations: List[str] = []
        try:
            for d in docs[:5]:
                fp = d.get('file_path') or d.get('path') or ''
                sl = int(d.get('start_line', 0) or 0)
                el = int(d.get('end_line', 0) or 0)
                if fp:
                    citations.append(f"{fp}:{sl}-{el}")
        except Exception:
            citations = []
        # Build rich trace from in-memory Trace events when available
        trace_steps = []
        try:
            _tr = trace_obj
            if _tr is None:
                from server.tracing import get_trace as _gt
                _tr = _gt()
            if _tr and isinstance(getattr(_tr, 'events', None), list) and _tr.events:
                for ev in _tr.events[-200:]:  # cap to avoid huge payloads
                    kind = str(ev.get('kind') or '')
                    data = ev.get('data') if isinstance(ev.get('data'), dict) else {}
                    trace_steps.append({"step": kind, "duration": data.get('duration_ms'), "details": data})
        except Exception:
            pass
        if not trace_steps:
            trace_steps = [{"step": "graph.invoke", "duration": dur, "details": {}}]
        trace = {"steps": trace_steps}
        if _is_test_request(request):
            event_id = uuid.uuid4().hex  # avoid contaminating training logs with test queries
        else:
            event_id = log_query_event(
                query_raw=payload.get('question',''),
                query_rewritten=None,
                retrieved=retrieved,
                answer_text=answer_text,
                route='chat/graph',
                client_ip=(request.client.host if request and request.client else None),
                user_agent=(request.headers.get('user-agent') if request else None),
            )
        # Provider metadata if available (propagated via graph state)
        meta = res.get('gen_meta') if isinstance(res, dict) else None
        return JSONResponse({"answer": answer_text, "confidence": res.get("confidence",0.0), "event_id": event_id, "trace": trace, "meta": meta, "citations": citations})
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        # Reload again to restore caches to baseline values
        try:
            from server import env_model as _envm
            _envm.reload_config()
        except Exception:
            pass
        try:
            from retrieval import hybrid_search as _hs
            _hs.reload_config()
        except Exception:
            pass
        try:
            from retrieval import rerank as _rr
            _rr.reload_config()
        except Exception:
            pass
        try:
            from server import langgraph_app as _lg
            if hasattr(_lg, 'reload_config'):
                _lg.reload_config()
        except Exception:
            pass
def _is_test_request(request: Optional[Request]) -> bool:
    try:
        if not request:
            return False
        ua = (request.headers.get('user-agent') or '').lower()
        if 'playwright' in ua:
            return True
        if (request.headers.get('x-agro-test') or '').strip() in {'1','true','yes','on'}:
            return True
        ref = request.headers.get('referer') or ''
        if 'agro_test=1' in ref or '__test=1' in ref:
            return True
    except Exception:
        pass
    return False
