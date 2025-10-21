import os
from pathlib import Path

# Initialize LangTrace FIRST - must precede ANY LLM/framework imports
try:
    from langtrace_python_sdk import langtrace
    LANGTRACE_KEY = os.getenv('LANGTRACE_API_KEY', '0b20be5d3e82b7c514cd1bea1fa583f92683e55ebe895452ece7d9261d4412d2')
    langtrace.init(api_key=LANGTRACE_KEY)
    print("✅ LangTrace initialized in FastAPI server")
except Exception as e:
    print(f"⚠️ LangTrace init failed: {e}")

from fastapi import FastAPI, Query, HTTPException, Request, UploadFile, File, Form, WebSocket
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from starlette.responses import StreamingResponse
from server.langgraph_app import build_graph
from server.tracing import start_trace, end_trace, Trace, latest_trace_path
from retrieval.hybrid_search import search_routed_multi
from common.config_loader import load_repos, out_dir
from server.index_stats import get_index_stats as _get_index_stats
from typing import cast
from server.feedback import router as feedback_router
from server.reranker_info import router as reranker_info_router
from server.alerts import router as alerts_router, monitoring_router
from server.telemetry import log_query_event
from server.reranker import rerank_candidates
from server.frequency_limiter import FrequencyAnomalyMiddleware, get_frequency_stats
from server.api_interceptor import setup_interceptor
from server.metrics import (
    init_metrics_fastapi, stage, record_tokens, record_cost,
    set_retrieval_quality, record_canary, ERRORS_TOTAL
)
try:
    # Optional import; used for MCP wrapper endpoints
    from server.mcp.server import MCPServer as _MCPServer
except Exception:
    _MCPServer = None  # type: ignore
from common.paths import repo_root, gui_dir, docs_dir, files_root
import os, json, sys
from typing import Any, Dict
from collections import Counter, defaultdict
from pathlib import Path as _Path
import subprocess

app = FastAPI(title="AGRO RAG + GUI")

# Initialize API request interceptor (must be early, before any imports that use requests)
setup_interceptor()

# Initialize Prometheus metrics middleware and /metrics endpoint
init_metrics_fastapi(app)

# Add frequency anomaly detection middleware (catches orphaned loops, bots)
app.add_middleware(FrequencyAnomalyMiddleware)

# Mount routers
app.include_router(feedback_router)
app.include_router(reranker_info_router)
app.include_router(alerts_router)
app.include_router(monitoring_router)

_graph = None
def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph

CFG = {"configurable": {"thread_id": "http"}}

class Answer(BaseModel):
    answer: str
    event_id: Optional[str] = None

ROOT = repo_root()
GUI_DIR = gui_dir()
DOCS_DIR = docs_dir()

# Middleware to prevent caching of GUI assets - ensures users always get latest
@app.middleware("http")
async def set_cache_headers(request: Request, call_next):
    response = await call_next(request)
    # Disable caching for all GUI assets to ensure fresh content
    if request.url.path.startswith("/gui/") or request.url.path == "/gui":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Serve static GUI assets
if GUI_DIR.exists():
    app.mount("/gui", StaticFiles(directory=str(GUI_DIR), html=True), name="gui")

# Serve local docs and repo files for in-GUI links
if DOCS_DIR.exists():
    app.mount("/docs", StaticFiles(directory=str(DOCS_DIR), html=True), name="docs")
app.mount("/files", StaticFiles(directory=str(files_root()), html=True), name="files")

@app.get("/", include_in_schema=False)
def serve_index():
    idx = GUI_DIR / "index.html"
    if idx.exists():
        response = FileResponse(str(idx))
        # Disable caching for HTML to ensure users always get latest version
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    return {"ok": True, "message": "GUI assets not found; use /health, /search, /answer"}

@app.get("/health")
def health():
    try:
        g = get_graph()
        return {"status": "healthy", "graph_loaded": g is not None, "ts": __import__('datetime').datetime.now().isoformat()}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# Compatibility alias for environments expecting /api/health
@app.get("/api/health")
def api_health():
    return health()

@app.get("/health/langsmith")
def health_langsmith() -> Dict[str, Any]:
    enabled = str(os.getenv('LANGCHAIN_TRACING_V2','0')).strip().lower() in {'1','true','on'}
    project = os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT')
    endpoint = os.getenv('LANGCHAIN_ENDPOINT') or 'https://api.smith.langchain.com'
    key = os.getenv('LANGCHAIN_API_KEY') or os.getenv('LANGSMITH_API_KEY')
    installed = True
    can_connect = None
    identity: Dict[str, Any] = {}
    error = None
    try:
        from langsmith import Client  # type: ignore
    except Exception:
        installed = False
    if installed and enabled and key:
        try:
            cl = Client()  # picks up env automatically
            # whoami is a lightweight call; if it fails, we capture the error
            who = getattr(cl, 'whoami', None)
            if callable(who):
                identity = who() or {}
                can_connect = True
            else:
                can_connect = None
        except Exception as e:
            error = str(e)
            can_connect = False
    return {
        'enabled': enabled,
        'installed': installed,
        'project': project,
        'endpoint': endpoint,
        'key_present': bool(key),
        'can_connect': can_connect,
        'identity': identity,
        'error': error,
    }

@app.get("/api/langsmith/latest")
def api_langsmith_latest(
    project: Optional[str] = Query(None),
    share: bool = Query(True, description="Ensure the run is shareable (returns public URL)")
) -> Dict[str, Any]:
    """Return the latest LangSmith run URL for embedding.

    Strategy:
    - If a local JSON trace exists with langsmith_url, use it.
    - Else, query LangSmith client for latest run in the project; share if requested.
    """
    # 1) Try local trace snapshot
    try:
        p = latest_trace_path(project or os.getenv('REPO','agro'))
        if p:
            try:
                data = json.loads(Path(p).read_text())
                if isinstance(data, dict) and data.get('langsmith_url'):
                    return {'project': data.get('langsmith_project'), 'url': data.get('langsmith_url'), 'source': 'local'}
            except Exception:
                pass
    except Exception:
        pass
    # 2) Query LangSmith API
    try:
        from langsmith import Client  # type: ignore
        cl = Client()
        proj = (project or os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT') or os.getenv('REPO','agro'))
        # list_runs returns generator; take first
        runs = list(cl.list_runs(project_name=proj, limit=1))
        if not runs:
            return {'project': proj, 'url': None, 'source': 'remote', 'error': 'no_runs'}
        r = runs[0]
        url = getattr(r, 'url', None) or getattr(r, 'dashboard_url', None)
        if share:
            try:
                info = cl.share_run(getattr(r, 'id', None) or getattr(r, 'run_id', None))
                if isinstance(info, str):
                    url = info
                elif isinstance(info, dict):
                    url = info.get('url') or info.get('share_url') or url
            except Exception:
                pass
        return {'project': proj, 'url': url, 'source': 'remote'}
    except Exception as e:
        return {'project': project, 'url': None, 'source': 'error', 'error': str(e)}

@app.get("/api/langsmith/runs")
def api_langsmith_runs(
    project: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    share: bool = Query(False)
) -> Dict[str, Any]:
    """List recent LangSmith runs (with optional share URLs)."""
    try:
        from langsmith import Client  # type: ignore
        cl = Client()
        proj = (project or os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT') or os.getenv('REPO','agro'))
        out = []
        for r in cl.list_runs(project_name=proj, limit=limit):
            rid = getattr(r, 'id', None) or getattr(r, 'run_id', None)
            url = getattr(r, 'url', None) or getattr(r, 'dashboard_url', None)
            s_url = None
            if share:
                try:
                    info = cl.share_run(rid)
                    if isinstance(info, str):
                        s_url = info
                    elif isinstance(info, dict):
                        s_url = info.get('url') or info.get('share_url')
                except Exception:
                    s_url = None
            out.append({
                'id': rid,
                'name': getattr(r, 'name', None),
                'start_time': getattr(r, 'start_time', None),
                'end_time': getattr(r, 'end_time', None),
                'url': url,
                'share_url': s_url,
            })
        return {'project': proj, 'runs': out}
    except Exception as e:
        return {'project': project, 'runs': [], 'error': str(e)}

@app.get("/answer")
def answer(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None, description="Repository override: agro|agro"),
    request: Request = None,
) -> Dict[str, Any]:
    """Answer a question using strict per-repo routing.

    If `repo` is provided, retrieval and the answer header will use that repo.
    Otherwise, a lightweight router selects the repo from the query content.
    """
    import time
    import sys
    import uuid
    start_time = time.time()
    req_id = str(uuid.uuid4())[:8]

    # DEBUG: Write to file to confirm code is executing
    try:
        with open("/tmp/debug_answer.log", "a") as f:
            f.write(f"[{req_id}] answer() called with q={q}\n")
    except:
        pass

    try:
        g = get_graph()
    except Exception as e:
        import traceback
        return {"answer": f"Error loading graph: {str(e)}", "event_id": None}

    # start local trace if enabled
    tr: Optional[Trace] = None
    try:
        if Trace.enabled():
            tr = start_trace(repo=(repo or os.getenv('REPO','agro')), question=q)
    except Exception:
        tr = None

    state = {"question": q, "documents": [], "generation":"", "iteration":0, "confidence":0.0, "repo": (repo.strip() if repo else None)}

    try:
        # Suppress stdout/stderr during graph execution to prevent broken pipe errors
        # when running in Docker with host->container requests
        # Use file descriptor level redirection to catch all output including subprocesses
        import os
        old_stdout_fd = os.dup(1)
        old_stderr_fd = os.dup(2)
        devnull_fd = os.open(os.devnull, os.O_WRONLY)

        try:
            os.dup2(devnull_fd, 1)
            os.dup2(devnull_fd, 2)
            res = g.invoke(state, CFG)
        finally:
            os.dup2(old_stdout_fd, 1)
            os.dup2(old_stderr_fd, 2)
            os.close(devnull_fd)
            os.close(old_stdout_fd)
            os.close(old_stderr_fd)
    except Exception as e:
        # Return error response with proper JSON instead of HTML
        try:
            import traceback
            error_msg = str(e)
            full_trace = traceback.format_exc()
        except:
            error_msg = repr(e)
            full_trace = "(traceback unavailable)"
        # Don't print to stderr - it may be broken!
        # Return full traceback for debugging
        return {"answer": f"ERROR_V2: {error_msg} | Type: {type(e).__name__} | Args: {e.args}", "event_id": None}

    # Log the query and retrieval
    try:
        latency_ms = int((time.time() - start_time) * 1000)
        docs = res.get("documents", [])
        retrieved_for_log = []
        for d in docs[:10]:  # Log top 10
            retrieved_for_log.append({
                "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                "score": float(d.get("rerank_score", 0.0) or 0.0),
                "text": (d.get("code", "") or "")[:500],  # Truncate for logging
                "clicked": False,
            })
        # Estimate cost (simplified)
        cost_usd = _estimate_query_cost(q, res["generation"], len(docs))

        # Try to capture query_rewritten from state
        query_rewritten = res.get("query_rewritten") or res.get("rewritten_question")

        event_id = log_query_event(
            query_raw=q,
            query_rewritten=query_rewritten,
            retrieved=retrieved_for_log,
            answer_text=res["generation"],
            latency_ms=latency_ms,
            cost_usd=cost_usd,
            route="/answer",
            client_ip=(getattr(getattr(request, 'client', None), 'host', None) if request else None),
            user_agent=(request.headers.get('user-agent') if request else None),
        )
    except Exception as e:
        event_id = None

    # finalize trace
    try:
        if tr is not None:
            end_trace()
    except Exception:
        pass

    return {"answer": res["generation"], "event_id": event_id}

class ChatRequest(BaseModel):
    question: str
    repo: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    multi_query: Optional[int] = None
    final_k: Optional[int] = None
    confidence: Optional[float] = None
    system_prompt: Optional[str] = None

@app.post("/api/chat")
def chat(req: ChatRequest, request: Request) -> Dict[str, Any]:
    """Chat endpoint with full settings control.

    Accepts all chat settings and applies them to the RAG pipeline:
    - model: Override GEN_MODEL
    - temperature: Control response randomness (0.0-2.0)
    - max_tokens: Maximum response length
    - multi_query: Number of query rewrites (1-6)
    - final_k: Number of code chunks to retrieve (5-50)
    - confidence: Minimum confidence threshold (0.3-0.9)
    - system_prompt: Custom system prompt override
    """
    import time
    start_time = time.time()
    
    # Save current env state
    old_env = {
        'GEN_MODEL': os.environ.get('GEN_MODEL'),
        'GEN_TEMPERATURE': os.environ.get('GEN_TEMPERATURE'),
        'GEN_MAX_TOKENS': os.environ.get('GEN_MAX_TOKENS'),
        'MQ_REWRITES': os.environ.get('MQ_REWRITES'),
        'LANGGRAPH_FINAL_K': os.environ.get('LANGGRAPH_FINAL_K'),
        'CONF_TOP1': os.environ.get('CONF_TOP1'),
        'CONF_AVG5': os.environ.get('CONF_AVG5'),
        'CONF_ANY': os.environ.get('CONF_ANY'),
        'SYSTEM_PROMPT': os.environ.get('SYSTEM_PROMPT'),
    }

    try:
        # Apply chat settings to env
        if req.model:
            os.environ['GEN_MODEL'] = req.model
        if req.temperature is not None:
            os.environ['GEN_TEMPERATURE'] = str(req.temperature)
        if req.max_tokens is not None:
            os.environ['GEN_MAX_TOKENS'] = str(req.max_tokens)
        if req.multi_query is not None:
            os.environ['MQ_REWRITES'] = str(req.multi_query)
        if req.final_k is not None:
            os.environ['LANGGRAPH_FINAL_K'] = str(req.final_k)
        if req.confidence is not None:
            # Scale confidence to thresholds
            conf = req.confidence
            os.environ['CONF_TOP1'] = str(conf + 0.05)  # Slightly higher for top-1
            os.environ['CONF_AVG5'] = str(conf)
            os.environ['CONF_ANY'] = str(conf - 0.05)  # Slightly lower for any
        if req.system_prompt:
            os.environ['SYSTEM_PROMPT'] = req.system_prompt

        # Run the RAG pipeline with overridden settings
        g = get_graph()

        # Start trace if enabled
        tr: Optional[Trace] = None
        try:
            if Trace.enabled():
                tr = start_trace(repo=(req.repo or os.getenv('REPO','agro')), question=req.question)
        except Exception:
            tr = None

        state = {
            "question": req.question,
            "documents": [],
            "generation": "",
            "iteration": 0,
            "confidence": 0.0,
            "repo": (req.repo.strip() if req.repo else None)
        }

        try:
            res = g.invoke(state, CFG)
        except Exception as e:
            # Fallback: retrieval-only answer when generation backend is unavailable (e.g., no OPENAI_API_KEY)
            try:
                docs = list(search_routed_multi(req.question, repo_override=(req.repo or os.getenv('REPO','agro')), m=4, final_k=int(os.getenv('LANGGRAPH_FINAL_K', '10') or 10)))
                lines = []
                for d in docs[:5]:
                    try:
                        lines.append(f"- {d.get('file_path','')}:{d.get('start_line',0)}-{d.get('end_line',0)}  score={float(d.get('rerank_score',0) or 0.0):.3f}")
                    except Exception:
                        pass
                fallback_text = "Retrieval-only (no model available)\n" + "\n".join(lines)
                res = {"generation": fallback_text, "confidence": 0.0}
            except Exception:
                raise e

        # Determine provider and model for headers (outside try block so always defined)
        model_used = req.model or os.getenv('GEN_MODEL', 'gpt-4o-mini')
        provider_used = "openai" if "gpt" in model_used.lower() else "unknown"

        # Log the query and retrieval
        try:
            latency_ms = int((time.time() - start_time) * 1000)
            docs = res.get("documents", [])
            retrieved_for_log = []
            for d in docs[:10]:  # Log top 10
                retrieved_for_log.append({
                    "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                    "score": float(d.get("rerank_score", 0.0) or 0.0),
                    "text": (d.get("code", "") or "")[:500],  # Truncate for logging
                    "clicked": False,
                })
            # Estimate cost
            cost_usd = _estimate_query_cost(req.question, res["generation"], len(docs))
            prompt_tokens = len(req.question.split()) * 2  # rough estimate
            completion_tokens = len(res["generation"].split()) * 2
            record_tokens("prompt", provider_used, model_used, prompt_tokens)
            record_tokens("completion", provider_used, model_used, completion_tokens)
            record_cost(provider_used, model_used, cost_usd)

            # Try to capture query_rewritten from state
            query_rewritten = res.get("query_rewritten") or res.get("rewritten_question")
            
            event_id = log_query_event(
                query_raw=req.question,
                query_rewritten=query_rewritten,
                retrieved=retrieved_for_log,
                answer_text=res["generation"],
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                route="/api/chat",
                client_ip=(getattr(getattr(request, 'client', None), 'host', None) if request else None),
                user_agent=(request.headers.get('user-agent') if request else None),
            )
        except Exception as e:
            # Debug: log why it failed
            import traceback
            print(f"Failed to log query event: {e}")
            traceback.print_exc()
            event_id = None

        # Finalize trace
        try:
            if tr is not None:
                end_trace()
        except Exception:
            pass

        # Build response with headers
        from fastapi.responses import JSONResponse
        response = JSONResponse(content={
            "answer": res["generation"],
            "confidence": res.get("confidence", 0.0),
            "event_id": event_id,
            "settings_applied": {
                "model": req.model or old_env.get('GEN_MODEL'),
                "temperature": req.temperature,
                "max_tokens": req.max_tokens,
                "multi_query": req.multi_query,
                "final_k": req.final_k,
                "confidence_threshold": req.confidence
            }
        })

        # Add provider/model headers for metrics tracking
        response.headers["X-Provider"] = provider_used
        response.headers["X-Model"] = model_used

        return response

    finally:
        # Restore original env
        for k, v in old_env.items():
            if v is None:
                if k in os.environ:
                    del os.environ[k]
            else:
                os.environ[k] = v



@app.get("/search")
def search(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None, description="Repository override: agro|agro"),
    top_k: int = Query(10, description="Number of results to return"),
    response: Response = None,
    request: Request = None,
):
    """Search for relevant code locations without generation.

    Returns file paths, line ranges, and rerank scores for the most relevant code chunks.
    """
    import time
    start_time = time.time()

    # Track retrieval stage
    with stage("retrieve"):
        docs = search_routed_multi(q, repo_override=repo, m=4, final_k=top_k)
    
    # Apply reranker if enabled
    if os.getenv("AGRO_RERANKER_ENABLED", "0") == "1":
        with stage("rerank"):
            # Transform docs to reranker format
            retrieved_cands = []
            for d in docs:
                retrieved_cands.append({
                    "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                    "score": float(d.get("rerank_score", 0.0) or 0.0),
                    "text": d.get("code", "") or "",
                    "clicked": False,
                })

            if retrieved_cands and any(c.get("text") for c in retrieved_cands):
                reranked = rerank_candidates(q, retrieved_cands)
                # Map back to docs structure
                doc_map = {(d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}"): d for d in docs}
                docs = []
                for rc in reranked:
                    if rc["doc_id"] in doc_map:
                        d = doc_map[rc["doc_id"]]
                        d["rerank_score"] = rc["rerank_score"]
                        d["cross_encoder_score"] = rc.get("cross_encoder_score", 0.0)
                        docs.append(d)
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    # Log the search (no answer, just retrieval)
    try:
        retrieved_for_log = []
        for d in docs:
            retrieved_for_log.append({
                "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                "score": float(d.get("rerank_score", 0.0) or 0.0),
                "text": (d.get("code", "") or "")[:500],  # Truncate for logging
                "clicked": False,
            })
        event_id = log_query_event(
            query_raw=q,
            query_rewritten=None,
            retrieved=retrieved_for_log,
            answer_text="",  # No generation for search endpoint
            latency_ms=latency_ms,
            route="/search",
            client_ip=(getattr(getattr(request, 'client', None), 'host', None) if request else None),
            user_agent=(request.headers.get('user-agent') if request else None),
        )
    except Exception:
        event_id = None
    
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

    # Set response headers for metrics middleware
    if response:
        response.headers["X-Provider"] = "hybrid"  # BM25 + vector
        response.headers["X-Model"] = "search-only"

    return {"results": results, "repo": repo, "count": len(results), "event_id": event_id}

# ---------------- MCP wrapper (HTTP) ----------------
@app.get("/api/mcp/rag_search")
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
        if not force_local and _MCPServer is not None:
            mcp = cast(object, _MCPServer)()  # type: ignore
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

# ---------------- Trace API ----------------
@app.get("/api/traces")
def list_traces(repo: Optional[str] = Query(None)) -> Dict[str, Any]:
    """List available trace files for a repo (defaults to current REPO)."""
    r = (repo or os.getenv('REPO','agro')).strip()
    base = Path(out_dir(r)) / 'traces'
    files = []
    if base.exists():
        for p in sorted([x for x in base.glob('*.json') if x.is_file()], key=lambda x: x.stat().st_mtime, reverse=True)[:50]:
            files.append({
                'path': str(p),
                'name': p.name,
                'mtime': __import__('datetime').datetime.fromtimestamp(p.stat().st_mtime).isoformat()
            })
    return {'repo': r, 'files': files}


@app.get("/api/traces/latest")
def latest_trace(repo: Optional[str] = Query(None)) -> Dict[str, Any]:
    r = (repo or os.getenv('REPO','agro')).strip()
    p = latest_trace_path(r)
    if not p:
        return {'repo': r, 'trace': None}
    try:
        data = json.loads(Path(p).read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {'repo': r, 'trace': data, 'path': p}

# ---------------- Minimal GUI API stubs ----------------
def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default

def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))

# ---- Prices helper for auto-profile
def _default_prices() -> Dict[str, Any]:
    return {
        "last_updated": "2025-10-10",
        "currency": "USD",
        "models": [
            {"provider": "openai", "family": "gpt-4o-mini", "model": "gpt-4o-mini",
             "unit": "1k_tokens", "input_per_1k": 0.005, "output_per_1k": 0.015,
             "embed_per_1k": 0.0001, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
            {"provider": "cohere", "family": "rerank-english-v3.0", "model": "rerank-english-v3.0",
             "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0,
             "embed_per_1k": 0.0, "rerank_per_1k": 0.30, "notes": "EXAMPLE"},
            {"provider": "voyage", "family": "voyage-3-large", "model": "voyage-3-large",
             "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0,
             "embed_per_1k": 0.12, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
            {"provider": "local", "family": "qwen3-coder", "model": "qwen3-coder:14b",
             "unit": "request", "per_request": 0.0, "notes": "Local inference assumed $0; electricity optional"}
        ]
    }

def _read_prices() -> Dict[str, Any]:
    data = _read_json(GUI_DIR / "prices.json", {"models": []})
    if not data or not isinstance(data, dict) or not data.get("models"):
        return _default_prices()
    return data

@app.post("/api/env/reload")
def api_env_reload() -> Dict[str, Any]:
    try:
        from dotenv import load_dotenv as _ld
        _ld(override=False)
        # Also clear repos.json cache
        from common.config_loader import clear_cache
        clear_cache()
    except Exception:
        pass
    return {"ok": True}

@app.post("/api/secrets/ingest")
async def api_secrets_ingest(
    file: UploadFile = File(...),
    persist: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """Ingest a secrets file (e.g., .env) and optionally persist to .env.

    - Sets os.environ keys for the current process immediately.
    - If persist is truthy ('1','true','on'), upserts keys into ROOT/.env.
    """
    text = (await file.read()).decode("utf-8", errors="ignore")
    applied: Dict[str, str] = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        k = k.strip(); v = v.strip()
        if not k:
            continue
        os.environ[k] = v
        applied[k] = v

    do_persist = str(persist or "").strip().lower() in {"1","true","on","yes"}
    saved = False
    if do_persist:
        env_path = ROOT / ".env"
        existing: Dict[str, str] = {}
        if env_path.exists():
            for ln in env_path.read_text().splitlines():
                if not ln.strip() or ln.strip().startswith("#") or "=" not in ln:
                    continue
                kk, vv = ln.split("=", 1)
                existing[kk.strip()] = vv.strip()
        existing.update(applied)
        env_path.write_text("\n".join(f"{k}={existing[k]}" for k in sorted(existing.keys())) + "\n")
        saved = True

    return {"ok": True, "applied": sorted(applied.keys()), "persisted": saved}

@app.get("/api/config")
def get_config() -> Dict[str, Any]:
    cfg = load_repos()
    # return a broad env snapshot for the GUI; rely on client to pick what it needs
    env: Dict[str, Any] = {}
    for k, v in os.environ.items():
        # keep it simple; include strings only
        env[k] = v
    repos = cfg.get("repos", [])
    return {
        "env": env,
        "default_repo": cfg.get("default_repo"),
        "repos": repos,
    }

@app.post("/api/config")
def set_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persist environment variables and repos.json edits coming from the GUI.

    Shape: { env: {KEY: VALUE, ...}, repos: [{name, path, keywords, path_boosts, layer_bonuses}, ...] }

    - Writes env keys to .env in repo root (idempotent upsert)
    - Writes repos to repos.json
    - Also applies env to current process so the running server reflects changes immediately
    """
    root = ROOT
    env_updates: Dict[str, Any] = dict(payload.get("env") or {})
    repos_updates: List[Dict[str, Any]] = list(payload.get("repos") or [])

    # 1) Backup .env before making changes
    env_path = root / ".env"
    if env_path.exists():
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = root / f".env.backup-{timestamp}"
        import shutil
        shutil.copy2(env_path, backup_path)
        print(f"[config] Backed up .env to {backup_path}")

    # 2) Upsert .env
    existing: Dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if not line.strip() or line.strip().startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            existing[k.strip()] = v.strip()
    for k, v in env_updates.items():
        existing[str(k)] = str(v)
        os.environ[str(k)] = str(v)
    # Write back
    lines = [f"{k}={existing[k]}" for k in sorted(existing.keys())]
    env_path.write_text("\n".join(lines) + "\n")

    # 2) Upsert repos.json
    repos_path = root / "repos.json"
    cfg = _read_json(repos_path, {"default_repo": None, "repos": []})
    # Keep default_repo if provided in env
    default_repo = env_updates.get("REPO") or cfg.get("default_repo")
    # Merge repos by name
    by_name: Dict[str, Dict[str, Any]] = {str(r.get("name")): r for r in cfg.get("repos", []) if r.get("name")}
    for r in repos_updates:
        name = str(r.get("name") or "").strip()
        if not name:
            continue
        cur = by_name.get(name, {"name": name})
        # Only accept expected keys
        if "path" in r:
            cur["path"] = r["path"]
        if "keywords" in r and isinstance(r["keywords"], list):
            cur["keywords"] = [str(x) for x in r["keywords"]]
        if "path_boosts" in r and isinstance(r["path_boosts"], list):
            cur["path_boosts"] = [str(x) for x in r["path_boosts"]]
        if "layer_bonuses" in r and isinstance(r["layer_bonuses"], dict):
            cur["layer_bonuses"] = r["layer_bonuses"]
        by_name[name] = cur
    new_cfg = {
        "default_repo": default_repo,
        "repos": sorted(by_name.values(), key=lambda x: str(x.get("name")))
    }
    _write_json(repos_path, new_cfg)

    return {"status": "success", "applied_env_keys": sorted(existing.keys()), "repos_count": len(new_cfg["repos"]) }

@app.get("/api/prices")
def get_prices():
    prices_path = GUI_DIR / "prices.json"
    data = _read_json(prices_path, _default_prices())
    return JSONResponse(data)

@app.post("/api/prices/upsert")
def upsert_price(item: Dict[str, Any]) -> Dict[str, Any]:
    prices_path = GUI_DIR / "prices.json"
    data = _read_json(prices_path, {"models": []})
    models: List[Dict[str, Any]] = list(data.get("models", []))
    key = (str(item.get("provider")), str(item.get("model")))
    idx = next((i for i, m in enumerate(models) if (str(m.get("provider")), str(m.get("model"))) == key), None)
    if idx is None:
        models.append(item)
    else:
        models[idx].update(item)
    data["models"] = models
    data["last_updated"] = __import__('datetime').datetime.now().strftime('%Y-%m-%d')
    _write_json(prices_path, data)
    return {"ok": True, "count": len(models)}

@app.get("/api/keywords")
def get_keywords() -> Dict[str, Any]:
    def extract_terms(obj: Any) -> List[str]:
        out: List[str] = []
        try:
            if isinstance(obj, list):
                for it in obj:
                    if isinstance(it, str):
                        out.append(it)
                    elif isinstance(it, dict):
                        # common shapes
                        for key in ("keyword", "term", "key", "name"):
                            if key in it and isinstance(it[key], str):
                                out.append(it[key])
                                break
            elif isinstance(obj, dict):
                # prefer "agro" or "agro" buckets, else flatten all lists
                for bucket in ("agro", "agro"):
                    if bucket in obj and isinstance(obj[bucket], list):
                        out.extend(extract_terms(obj[bucket]))
                        return out
                for v in obj.values():
                    out.extend(extract_terms(v))
        except Exception:
            pass
        return out
    discr_raw = _read_json(repo_root() / "discriminative_keywords.json", {})
    sema_raw = _read_json(repo_root() / "semantic_keywords.json", {})
    llm_raw = _read_json(repo_root() / "llm_keywords.json", {})
    manual_raw = _read_json(repo_root() / "manual_keywords.json", [])
    discr = extract_terms(discr_raw)
    sema = extract_terms(sema_raw)
    llm = extract_terms(llm_raw)
    manual = extract_terms(manual_raw) if manual_raw else []
    repos_cfg = load_repos()
    repo_k = []
    for r in repos_cfg.get("repos", []):
        for k in r.get("keywords", []) or []:
            if isinstance(k, str):
                repo_k.append(k)
    def uniq(xs: List[str]) -> List[str]:
        seen = set(); out: List[str] = []
        for k in xs:
            k2 = str(k)
            if k2 not in seen:
                out.append(k2); seen.add(k2)
        return out
    discr = uniq(discr)
    sema = uniq(sema)
    llm = uniq(llm)
    manual = uniq(manual)
    repo_k = uniq(repo_k)
    allk = uniq((discr or []) + (sema or []) + (llm or []) + (manual or []) + (repo_k or []))
    return {"discriminative": discr, "semantic": sema, "llm": llm, "manual": manual, "repos": repo_k, "keywords": allk}

@app.post("/api/keywords/add")
def add_keyword(body: Dict[str, Any]) -> Dict[str, Any]:
    """Add a manually created keyword to the appropriate category."""
    keyword = body.get("keyword", "").strip()
    category = body.get("category", "")  # 'discriminative', 'semantic', or empty

    if not keyword:
        return {"error": "Keyword is required"}

    # Map category to file
    category_files = {
        "discriminative": "discriminative_keywords.json",
        "semantic": "semantic_keywords.json"
    }

    if category and category in category_files:
        file_path = repo_root() / category_files[category]

        # Read existing data
        data = _read_json(file_path, {})
        if not isinstance(data, dict):
            data = {}

        # Add keyword to the appropriate structure
        # The structure appears to be a list or dict, let's handle both
        if isinstance(data, list):
            if keyword not in data:
                data.append(keyword)
                data.sort()
        else:
            # If it's a dict, add to a 'manual' key
            if "manual" not in data:
                data["manual"] = []
            if keyword not in data["manual"]:
                data["manual"].append(keyword)
                data["manual"].sort()

        # Write back to file
        try:
            with open(file_path, "w") as f:
                json.dump(data, f, indent=2)
            return {"ok": True, "keyword": keyword, "category": category}
        except Exception as e:
            return {"error": f"Failed to save keyword: {str(e)}"}
    else:
        # If no category specified, add to a manual keywords file
        manual_path = repo_root() / "manual_keywords.json"
        data = _read_json(manual_path, [])
        if not isinstance(data, list):
            data = []
        if keyword not in data:
            data.append(keyword)
            data.sort()
        try:
            with open(manual_path, "w") as f:
                json.dump(data, f, indent=2)
            return {"ok": True, "keyword": keyword, "category": "manual"}
        except Exception as e:
            return {"error": f"Failed to save keyword: {str(e)}"}

@app.post("/api/keywords/generate")
def generate_keywords(body: Dict[str, Any]) -> Dict[str, Any]:
    """Generate keywords using either heuristics or an LLM (GUI‑selectable).

    Body: { repo: str, mode?: 'heuristic' | 'llm', max_files?: int }
    - heuristic: runs scripts/analyze_keywords.py and scripts/analyze_keywords_v2.py
    - llm: samples files and uses metadata_enricher.enrich to accumulate keywords
    """
    import subprocess
    import time
    from common.config_loader import get_repo_paths

    repo = body.get("repo")
    mode = (body.get("mode") or os.getenv("KEYWORDS_GEN_MODE", "heuristic")).strip().lower()
    max_files = int(body.get("max_files") or os.getenv("KEYWORDS_MAX_FILES", "60") or 60)
    if not repo:
        return {"error": "repo parameter required", "ok": False}

    results: Dict[str, Any] = {
        "ok": True,
        "repo": repo,
        "mode": mode,
        "discriminative": {"count": 0, "file": "discriminative_keywords.json"},
        "semantic": {"count": 0, "file": "semantic_keywords.json"},
        "llm": {"count": 0, "file": "llm_keywords.json"},
        "total_count": 0,
        "duration_seconds": 0,
    }

    start_time = time.time()

    # Heuristic pipeline (existing behavior)
    def run_heuristic() -> None:
        """Inline heuristic generation (no external scripts).

        More permissive than before: computes TF–IDF over all tokens with a
        small stopword list and falls back to top-frequency tokens when needed.
        """
        nonlocal results
        import re
        try:
            bases = get_repo_paths(repo)
        except Exception as e:
            results["ok"] = False
            results["error"] = str(e)
            return

        # Gather candidate files
        exts = {".py", ".rb", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".cs", ".yml", ".yaml", ".md"}
        files: List[Path] = []
        for base in bases:
            p = Path(base).expanduser()
            if not p.exists():
                continue
            for root, dirs, fnames in os.walk(p):
                dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv", "dist", "build"}]
                for fn in fnames:
                    if Path(fn).suffix.lower() in exts:
                        files.append(Path(root) / fn)
        if not files:
            results["ok"] = False
            results["error"] = f"No source files found for repo {repo}"
            return

        # Tokenization helpers
        str_rx = re.compile(r'["\'].*?["\']', re.S)
        hash_comment = re.compile(r'#.*?\n')
        sl_comment = re.compile(r'//.*?\n')
        ident_rx = re.compile(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b')
        stop = set([
            'the','and','that','with','this','from','into','your','you','for','are','was','have','has','will','can','not','out','one','two',
            'def','class','import','return','const','let','var','function','void','null','true','false','elif','else','try','except','finally',
            'self','args','kwargs','none','object','module','package','public','private','static','final','new','extends','implements','using',
            'todo','fixme','note','copyright','license','utf','ascii','error','warn','info','data','item','value','result','type','types'
        ])

        def extract_tokens(text: str) -> List[str]:
            text = str_rx.sub('', text)
            text = hash_comment.sub('\n', text)
            text = sl_comment.sub('\n', text)
            toks = ident_rx.findall(text)
            return [t.lower() for t in toks if len(t) > 2]

        # Discriminative (TF–IDF)
        file_tokens: Dict[str, set[str]] = {}
        global_counts: Counter[str] = Counter()
        for fp in files:
            try:
                code = fp.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            toks = set(t for t in extract_tokens(code) if t not in stop)
            file_tokens[str(fp)] = toks
            for t in toks:
                global_counts[t] += 1
        num_files = max(1, len(file_tokens))
        doc_freq: Counter[str] = Counter()
        for toks in file_tokens.values():
            doc_freq.update(toks)
        import math as _m
        keyword_scores: Dict[str, float] = {}
        for token, df in doc_freq.items():
            if df <= 1:
                continue
            idf = _m.log(num_files / (1.0 + df)) if num_files > 1 else 0.0
            tf = global_counts[token]
            score = tf * (idf if idf > 0 else 1.0)
            keyword_scores[token] = float(score)
        topn_discr = int(os.getenv("KEYWORDS_TOPN_DISCR", "60") or 60)
        discr_sorted = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)[:topn_discr]
        discr_list = [k for k, _ in discr_sorted]
        if not discr_list:
            # fallback: top tokens by document frequency
            discr_list = [k for k, _ in doc_freq.most_common(topn_discr) if k not in stop]
        # Persist
        discr_path = repo_root() / "discriminative_keywords.json"
        discr_data = _read_json(discr_path, {})
        if not isinstance(discr_data, dict):
            discr_data = {}
        discr_data[str(repo)] = discr_list
        _write_json(discr_path, discr_data)
        results["discriminative"]["count"] = len(discr_list)

        # Semantic (domain-ish): frequency across files with directory boost
        dir_terms: set[str] = set()
        for fp in files:
            for part in Path(fp).parts:
                s = re.sub(r'[^a-zA-Z0-9_]+', ' ', part)
                for w in s.split():
                    if len(w) > 2:
                        dir_terms.add(w.lower())
        term_files: Dict[str, set[str]] = defaultdict(set)
        term_counts: Counter[str] = Counter()
        for fp in files:
            try:
                code = Path(fp).read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            terms = [t for t in extract_tokens(code) if t not in stop]
            rel = str(fp)
            for t in terms:
                term_counts[t] += 1
                term_files[t].add(rel)
        scored: list[tuple[str, float]] = []
        for t, fileset in term_files.items():
            fc = len(fileset)
            if fc >= 2 and fc <= max(3, int(0.5 * num_files)):
                dir_boost = 2.0 if t in dir_terms else 1.0
                score = (term_counts[t] * fc * dir_boost) / (num_files + 1)
                scored.append((t, score))
        topn_sem = int(os.getenv("KEYWORDS_TOPN_SEM", "60") or 60)
        sem_sorted = sorted(scored, key=lambda x: x[1], reverse=True)[:topn_sem]
        sem_list = [k for k, _ in sem_sorted]
        if not sem_list:
            sem_list = [k for k, _ in term_counts.most_common(topn_sem) if k not in stop]
        sem_path = repo_root() / "semantic_keywords.json"
        sem_data = _read_json(sem_path, {})
        if not isinstance(sem_data, dict):
            sem_data = {}
        sem_data[str(repo)] = sem_list
        _write_json(sem_path, sem_data)
        results["semantic"]["count"] = len(sem_list)

        # Emergency fallback: still zero? derive from file and directory names
        if (results["discriminative"]["count"] or 0) == 0 and (results["semantic"]["count"] or 0) == 0:
            base_terms: Counter[str] = Counter()
            for fp in files:
                parts = Path(fp).parts
                for part in parts:
                    part = re.sub(r'[^a-zA-Z0-9_]+', ' ', part)
                    for w in part.split():
                        w = w.lower()
                        if len(w) > 2 and w not in stop:
                            base_terms[w] += 1
            emer = [k for k, _ in base_terms.most_common(40)]
            if emer:
                discr_data[str(repo)] = emer[:20]
                sem_data[str(repo)] = emer[:20]
                _write_json(discr_path, discr_data)
                _write_json(sem_path, sem_data)
                results["discriminative"]["count"] = len(discr_data[str(repo)])
                results["semantic"]["count"] = len(sem_data[str(repo)])

    # LLM pipeline (new)
    def run_llm(backend_override: str | None = None, model_override: str | None = None) -> None:
        nonlocal results
        try:
            from common.metadata import enrich  # uses MLX or Ollama based on env
        except Exception as e:  # pragma: no cover
            results["ok"] = False
            results["error"] = f"LLM backend unavailable: {e}"
            return

        # Collect candidate files (reuse indexer filters loosely)
        exts = {".py", ".rb", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".cs", ".yml", ".yaml", ".md"}
        files: List[Path] = []
        try:
            bases = get_repo_paths(repo)
        except Exception as e:
            results["ok"] = False
            results["error"] = str(e)
            return
        for base in bases:
            p = Path(base).expanduser()
            if not p.exists():
                continue
            for root, dirs, fnames in os.walk(p):
                # prune noisy dirs
                dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv", "dist", "build"}]
                for fn in fnames:
                    if Path(fn).suffix.lower() in exts:
                        files.append(Path(root) / fn)
        # Sample limited number deterministically: smallest paths first for stability
        files = sorted(files, key=lambda pp: (len(str(pp)), str(pp)))[:max_files]

        counts: Counter[str] = Counter()
        per_file_limit = int(os.getenv("KEYWORDS_PER_FILE", "10") or 10)
        # Temporarily override enrich backend/model if provided
        old_env = {"ENRICH_BACKEND": os.environ.get("ENRICH_BACKEND"), "ENRICH_MODEL_OPENAI": os.environ.get("ENRICH_MODEL_OPENAI"), "GEN_MODEL": os.environ.get("GEN_MODEL")}
        if backend_override:
            os.environ["ENRICH_BACKEND"] = backend_override
        if model_override:
            # prefer specific openai enrich model, else set GEN_MODEL used by openai client
            os.environ["ENRICH_MODEL_OPENAI"] = model_override
            os.environ["GEN_MODEL"] = model_override
        try:
            for fp in files:
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                # clip to manageable size
                text = text[:8000]
                meta = enrich(str(fp), Path(fp).suffix.lstrip('.'), text) or {}
                kws = [str(k).strip().lower() for k in (meta.get("keywords") or []) if isinstance(k, str)]
                for k in kws[:per_file_limit]:
                    if k:
                        counts[k] += 1
        finally:
            # restore environment
            for k, v in old_env.items():
                if v is None:
                    if k in os.environ:
                        del os.environ[k]
                else:
                    os.environ[k] = v
        # Persist results
        top_total = int(os.getenv("KEYWORDS_MAX_TOTAL", "200") or 200)
        ranked = [k for k, _ in counts.most_common(top_total)]
        out_path = repo_root() / "llm_keywords.json"
        data = _read_json(out_path, {})
        if not isinstance(data, dict):
            data = {}
        data[str(repo)] = ranked
        _write_json(out_path, data)
        results["llm"]["count"] = len(ranked)

    try:
        if mode == "llm":
            backend = (body.get("backend") or os.getenv("ENRICH_BACKEND") or "openai").strip().lower()
            model_override = None
            if backend == "openai":
                model_override = body.get("openai_model") or os.getenv("ENRICH_MODEL_OPENAI") or os.getenv("GEN_MODEL")
            run_llm(backend_override=backend, model_override=model_override)
            # If LLM produced nothing, fall back to heuristics for useful output
            if (results.get("llm", {}).get("count") or 0) == 0:
                run_heuristic()
        else:
            run_heuristic()
        # Compose totals (heuristic writes discr/semantic; llm writes llm)
        results["total_count"] = (
            (results.get("discriminative", {}).get("count") or 0)
            + (results.get("semantic", {}).get("count") or 0)
            + (results.get("llm", {}).get("count") or 0)
        )
        results["duration_seconds"] = round(time.time() - start_time, 2)
    except subprocess.TimeoutExpired:
        results["ok"] = False
        results["error"] = "Keyword generation timed out (300s limit)"
    except Exception as e:
        results["ok"] = False
        results["error"] = str(e)

    return results

@app.post("/api/scan-hw")
def scan_hw() -> Dict[str, Any]:
    # Lightweight local scan without new deps
    import platform, shutil
    info = {
        "os": platform.system(),
        "arch": platform.machine(),
        "cpu_cores": os.cpu_count() or 0,
        "mem_gb": None,
    }
    # Try to get memory (Darwin via sysctl; Linux via /proc/meminfo)
    try:
        if info["os"] == "Darwin":
            import subprocess
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True).strip()
            info["mem_gb"] = round(int(out) / (1024**3), 2)
        elif Path("/proc/meminfo").exists():
            txt = Path("/proc/meminfo").read_text()
            for line in txt.splitlines():
                if line.startswith("MemTotal"):
                    kb = int(line.split()[1]); info["mem_gb"] = round(kb/1024/1024, 2)
                    break
    except Exception:
        pass
    runtimes = {
        "ollama": bool(os.getenv("OLLAMA_URL") or shutil.which("ollama")),
        "coreml": info["os"] == "Darwin",
        "cuda": bool(shutil.which("nvidia-smi")),
        "mps": info["os"] == "Darwin",
    }
    tools = {"uvicorn": bool(shutil.which("uvicorn")), "docker": bool(shutil.which("docker"))}
    return {"info": info, "runtimes": runtimes, "tools": tools}

def _estimate_query_cost(question: str, answer: str, num_docs: int) -> float:
    """Quick cost estimation for a single query."""
    try:
        # Rough token counts
        input_tokens = len(question.split()) * 1.3 + (num_docs * 100)  # question + retrieved context
        output_tokens = len(answer.split()) * 1.3
        
        gen_model = os.getenv("GEN_MODEL", "")
        if "gpt-4o-mini" in gen_model:
            return (input_tokens / 1000 * 0.00015) + (output_tokens / 1000 * 0.0006)
        elif "gpt-4" in gen_model:
            return (input_tokens / 1000 * 0.01) + (output_tokens / 1000 * 0.03)
        else:
            return 0.0  # Local/unknown models
    except:
        return 0.0

def _find_price(provider: str, model: Optional[str]) -> Optional[Dict[str, Any]]:
    """Generic price lookup (backwards-compat) — used for generation rows."""
    data = _read_json(GUI_DIR / "prices.json", {"models": []})
    models = data.get("models", [])
    # Prefer exact provider+model, else fallback to first matching provider
    try:
        prov = str(provider or '').lower()
        mdl = str(model or '').lower()
        for m in models:
            if str(m.get("provider", "")).lower() == prov and (not mdl or str(m.get("model", "")).lower() == mdl):
                return m
        # Model-only match (provider mismatch or unknown)
        if mdl:
            for m in models:
                if str(m.get("model", "")).lower() == mdl:
                    return m
        for m in models:
            if str(m.get("provider", "")).lower() == prov:
                return m
    except Exception:
        pass
    return None


def _find_price_kind(provider: str, model: Optional[str], kind: str) -> Optional[Dict[str, Any]]:
    """Find a price row constrained by kind: 'gen' | 'embed' | 'rerank'."""
    data = _read_json(GUI_DIR / "prices.json", {"models": []})
    models = data.get("models", [])
    prov = str(provider or '').lower()
    mdl = str(model or '').lower()

    def is_embed(m):
        return (m is not None) and (('embed_per_1k' in m) or ('embed' in str(m.get('family','')).lower()))

    def is_rerank(m):
        fam_mod = (str(m.get('family','')) + str(m.get('model',''))).lower()
        return (m is not None) and (('rerank_per_1k' in m) or ('rerank' in fam_mod))

    def is_gen(m):
        u = str(m.get('unit','')).lower()
        return (u == '1k_tokens') and (not is_embed(m)) and (not is_rerank(m))

    kind_pred = {'gen': is_gen, 'embed': is_embed, 'rerank': is_rerank}.get(kind, lambda _m: True)

    cand = [m for m in models if kind_pred(m)]
    # exact provider+model
    for m in cand:
        if (str(m.get('provider','')).lower() == prov) and (not mdl or str(m.get('model','')).lower() == mdl):
            return m
    # model-only
    if mdl:
        for m in cand:
            if str(m.get('model','')).lower() == mdl:
                return m
    # first for provider among kind
    for m in cand:
        if str(m.get('provider','')).lower() == prov:
            return m
    # fallback any kind+provider
    for m in models:
        if str(m.get('provider','')).lower() == prov:
            return m
    return None

def _estimate_cost(
    gen_provider: str,
    gen_model: Optional[str],
    tokens_in: int,
    tokens_out: int,
    embeds: int,
    reranks: int,
    requests_per_day: int,
    embed_provider: Optional[str] = None,
    embed_model: Optional[str] = None,
    rerank_provider: Optional[str] = None,
    rerank_model: Optional[str] = None,
) -> Dict[str, Any]:
    """Estimate daily and monthly costs using gui/prices.json.

    Semantics (simple and robust):
      - tokens_in/out are per-request tokens; multiplied by requests_per_day for generation costs.
      - embeds is total embedding tokens per day (already aggregated) unless zero.
      - reranks is total rerank "units" per day:
          * if price row has rerank_per_1k → interpret as tokens; cost = (reranks/1000) * rerank_per_1k.
          * elif price row has per_request → interpret as count of requests; cost = reranks * per_request.
          * else if price row unit == 'request' → cost = reranks * per_request (if available), else 0.
      - Any missing fields default to 0.
    """
    rpd = max(1, int(requests_per_day or 0))

    # Generation
    price_gen = _find_price_kind(gen_provider, gen_model, 'gen') or {}
    per_1k_in = float(price_gen.get("input_per_1k", 0.0) or 0.0)
    per_1k_out = float(price_gen.get("output_per_1k", 0.0) or 0.0)
    per_req = float(price_gen.get("per_request", 0.0) or 0.0)
    # tokens_in/out are per request
    gen_cost = (tokens_in/1000.0) * per_1k_in * rpd + (tokens_out/1000.0) * per_1k_out * rpd + per_req * rpd

    # Embeddings (separate provider/model); "embeds" is total tokens per day
    emb_cost = 0.0
    emb_row = None
    if embeds > 0:
        if not embed_provider and gen_provider == 'openai':
            embed_provider = 'openai'
            embed_model = embed_model or 'text-embedding-3-small'
        emb_row = _find_price_kind(embed_provider or gen_provider, embed_model, 'embed')
        if emb_row:
            emb_cost = (embeds/1000.0) * float(emb_row.get("embed_per_1k", 0.0) or 0.0)

    # Rerank; "reranks" interpreted by price row
    rr_cost = 0.0
    rr_row = None
    if reranks > 0:
        rr_row = _find_price_kind(rerank_provider or 'cohere', rerank_model or 'rerank-3.5', 'rerank')
        if rr_row:
            per_1k_rr = float(rr_row.get("rerank_per_1k", 0.0) or 0.0)
            per_req_rr = float(rr_row.get("per_request", 0.0) or 0.0)
            unit = str(rr_row.get("unit") or '').lower()
            if unit == 'request':
                # Treat input `reranks` as number of requests
                if per_req_rr > 0.0:
                    rr_cost = float(reranks) * per_req_rr
                elif per_1k_rr > 0.0:
                    rr_cost = (reranks/1000.0) * per_1k_rr
            elif per_1k_rr > 0.0:
                rr_cost = (reranks/1000.0) * per_1k_rr
            elif per_req_rr > 0.0:
                # Treat "reranks" as number of rerank calls for the day
                rr_cost = float(reranks) * per_req_rr
            elif unit == 'request' and per_req_rr == 0.0:
                rr_cost = 0.0

    daily = float(gen_cost + emb_cost + rr_cost)
    breakdown = {
        "generation": {
            "row": price_gen,
            "tokens_in_per_req": tokens_in,
            "tokens_out_per_req": tokens_out,
            "requests_per_day": rpd,
            "cost_daily": round(gen_cost, 6),
        },
        "embeddings": {
            "row": (emb_row or None),
            "tokens_daily": embeds,
            "cost_daily": round(emb_cost, 6),
        } if embeds > 0 else None,
        "rerank": {
            "row": (rr_row or None),
            "units_daily": reranks,
            "cost_daily": round(rr_cost, 6),
        } if reranks > 0 else None,
    }
    return {"daily": round(daily, 6), "monthly": round(daily*30.0, 4), "breakdown": breakdown}

@app.post("/api/cost/estimate")
def cost_estimate(payload: Dict[str, Any]) -> Dict[str, Any]:
    gen_provider = str(payload.get("gen_provider") or payload.get("provider") or "openai")
    gen_model = payload.get("gen_model")
    tokens_in = int(payload.get("tokens_in") or 0)
    tokens_out = int(payload.get("tokens_out") or 0)
    embeds = int(payload.get("embeds") or 0)
    reranks = int(payload.get("reranks") or 0)
    rpd = int(payload.get("requests_per_day") or 0)
    emb_prov = payload.get("embed_provider")
    emb_model = payload.get("embed_model")
    rr_prov = payload.get("rerank_provider")
    rr_model = payload.get("rerank_model")
    return _estimate_cost(gen_provider, gen_model, tokens_in, tokens_out, embeds, reranks, rpd,
                          embed_provider=emb_prov, embed_model=emb_model,
                          rerank_provider=rr_prov, rerank_model=rr_model)

@app.post("/api/cost/estimate_pipeline")
def cost_estimate_pipeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    # same shape as estimate(), kept for compatibility
    return cost_estimate(payload)

@app.get("/api/profiles")
def profiles_list() -> Dict[str, Any]:
    prof_dir = GUI_DIR / "profiles"
    prof_dir.mkdir(parents=True, exist_ok=True)
    names = []
    for p in prof_dir.glob("*.json"):
        names.append(p.stem)
    return {"profiles": sorted(names), "default": None}

@app.get("/api/profiles/{name}")
def profiles_get(name: str) -> Dict[str, Any]:
    prof_dir = GUI_DIR / "profiles"
    path = prof_dir / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")
    prof = _read_json(path)
    return {"ok": True, "name": name, "profile": prof}

@app.post("/api/profiles/save")
def profiles_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    name = str(payload.get("name") or "").strip()
    prof = payload.get("profile") or {}
    if not name:
        raise HTTPException(status_code=400, detail="missing name")
    path = GUI_DIR / "profiles" / f"{name}.json"
    _write_json(path, prof)
    return {"ok": True, "name": name}

@app.post("/api/profiles/apply")
def profiles_apply(payload: Dict[str, Any]) -> Dict[str, Any]:
    prof = payload.get("profile") or {}
    applied = []
    for k, v in prof.items():
        os.environ[str(k)] = str(v)
        applied.append(str(k))
    return {"ok": True, "applied_keys": applied}

# --- Auto-profile v2
try:
    from server.autoprofile import autoprofile as _ap_select
except Exception:
    _ap_select = None

@app.post("/api/profile/autoselect")
def api_profile_autoselect(payload: Dict[str, Any]):
    if _ap_select is None:
        raise HTTPException(status_code=500, detail="autoprofile module not available")
    prices = _read_prices()
    env, reason = _ap_select(payload, prices)
    if not env:
        raise HTTPException(status_code=422, detail=reason)
    return {"env": env, "reason": reason}

@app.post("/api/checkpoint/config")
def checkpoint_config() -> Dict[str, Any]:
    """Write a timestamped checkpoint of current env + repos to gui/profiles."""
    cfg = get_config()
    from datetime import datetime
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    out_dir = GUI_DIR / "profiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"checkpoint-{ts}.json"
    _write_json(path, cfg)
    return {"ok": True, "path": str(path)}

# --- Index + Cards: comprehensive status with all metrics ---
_INDEX_STATUS: List[str] = []
_INDEX_METADATA: Dict[str, Any] = {}

@app.post("/api/index/start")
def index_start(payload: Dict[str, Any] = None) -> Dict[str, Any]:
    """Start indexing with real subprocess execution."""
    global _INDEX_STATUS, _INDEX_METADATA
    import subprocess
    import threading

    payload = payload or {}

    _INDEX_STATUS = ["Indexing started..."]
    _INDEX_METADATA = {}

    def run_index():
        global _INDEX_STATUS, _INDEX_METADATA
        try:
            repo = os.getenv("REPO", "agro")
            _INDEX_STATUS.append(f"Indexing repository: {repo}")

            # Prepare environment
            env = {**os.environ, "REPO": repo}

            # Handle enriching parameter
            if payload.get("enrich"):
                env["ENRICH_CODE_CHUNKS"] = "true"
                _INDEX_STATUS.append("Enriching chunks with summaries and keywords...")

            # Handle skip_dense parameter
            if payload.get("skip_dense"):
                env["SKIP_DENSE"] = "1"
                _INDEX_STATUS.append("Skipping dense embeddings (BM25 only)...")

            # Run the actual indexer
            result = subprocess.run(
                ["python", "-m", "indexer.index_repo"],
                capture_output=True,
                text=True,
                cwd=repo_root(),
                env=env
            )

            if result.returncode == 0:
                _INDEX_STATUS.append("✓ Indexing completed successfully")
                _INDEX_METADATA = _get_index_stats()
            else:
                _INDEX_STATUS.append(f"✗ Indexing failed: {result.stderr[:200]}")
        except Exception as e:
            _INDEX_STATUS.append(f"✗ Error: {str(e)}")

    # Run in background
    thread = threading.Thread(target=run_index, daemon=True)
    thread.start()

    return {"ok": True, "success": True, "message": "Indexing started in background"}

@app.get("/api/index/stats")
def index_stats() -> Dict[str, Any]:
    """Return index statistics"""
    from server.index_stats import get_index_stats as _get_index_stats
    return _get_index_stats()

@app.post("/api/index/run")
async def run_index(repo: str = Query(...), dense: bool = Query(True)):
    """Actually run the fucking indexer"""
    import subprocess
    import asyncio
    from fastapi.responses import StreamingResponse
    
    async def stream_output():
        env = os.environ.copy()
        env['REPO'] = repo
        env['SKIP_DENSE'] = '0' if dense else '1'
        
        cmd = [sys.executable, '-m', 'indexer.index_repo']
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(ROOT),
            env=env
        )
        
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            yield line.decode('utf-8', errors='replace')
        
        await proc.wait()
        yield f"\n\n{'='*60}\n"
        yield f"Exit code: {proc.returncode}\n"
    
    return StreamingResponse(stream_output(), media_type='text/plain')

@app.get("/api/index/status")
def index_status() -> Dict[str, Any]:
    """Return comprehensive indexing status with all metrics."""
    if not _INDEX_METADATA:
        # Return basic status if no metadata yet
        return {
            "lines": _INDEX_STATUS,
            "running": len(_INDEX_STATUS) > 0 and not any("completed" in s or "failed" in s for s in _INDEX_STATUS),
            "metadata": _get_index_stats()  # Always provide current stats
        }

    return {
        "lines": _INDEX_STATUS,
        "running": False,
        "metadata": _INDEX_METADATA
    }

@app.post("/api/cards/build")
def cards_build() -> Dict[str, Any]:
    """Legacy one-shot build (kept for compatibility). Prefer /api/cards/build/start."""
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, "-m", "indexer.build_cards"],
            capture_output=True,
            text=True,
            timeout=300
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

# -------- Cards Builder (Jobs + SSE) --------
@app.post("/api/cards/build/start")
def cards_build_start(
    repo: Optional[str] = Query(None), 
    enrich: int = Query(1),
    exclude_dirs: Optional[str] = Query(None),
    exclude_patterns: Optional[str] = Query(None),
    exclude_keywords: Optional[str] = Query(None)
) -> Dict[str, Any]:
    from server.cards_builder import get_job_for_repo, start_job
    r = (repo or os.getenv('REPO', 'agro')).strip()
    existing = get_job_for_repo(r)
    if existing and existing.status == 'running':
        raise HTTPException(status_code=409, detail=f"A cards build job is already running for repo {r}")
    try:
        # Parse comma-separated filter strings into lists
        dirs = [d.strip() for d in (exclude_dirs or "").split(",") if d.strip()]
        patterns = [p.strip() for p in (exclude_patterns or "").split(",") if p.strip()]
        keywords = [k.strip() for k in (exclude_keywords or "").split(",") if k.strip()]
        
        job = start_job(
            r, 
            enrich=bool(int(enrich)),
            exclude_dirs=dirs,
            exclude_patterns=patterns,
            exclude_keywords=keywords
        )
        return {"job_id": job.job_id, "repo": r}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/mcp/http/status")
def mcp_http_status() -> Dict[str, Any]:
    """Check HTTP MCP server status without triggering request logging.

    Uses a lightweight TCP connect to determine if host:port is reachable,
    and returns configured host/port/path so the UI can display where MCP is
    intended to run.
    """
    import socket
    host = os.getenv('MCP_HTTP_HOST') or '127.0.0.1'
    try:
        port = int(os.getenv('MCP_HTTP_PORT') or '8013')
    except Exception:
        port = 8013
    path = os.getenv('MCP_HTTP_PATH') or '/mcp'
    running = False
    try:
        with socket.create_connection((host, port), timeout=0.25):
            running = True
    except Exception:
        running = False
    url = f"http://{host}:{port}"
    return {
        "running": running,
        "host": host,
        "port": port,
        "path": path,
        "mode": "http",
        "url": url,
    }


@app.get("/api/mcp/status")
def mcp_status() -> Dict[str, Any]:
    """Consolidated MCP status for Dashboard.

    Reports Python HTTP (:8013), Node HTTP (:8014), and Python stdio availability.
    """
    import socket
    def tcp(host: str, port: int, timeout: float = 0.25) -> bool:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            return False

    # Python HTTP MCP
    py_host = os.getenv('MCP_HTTP_HOST') or '127.0.0.1'
    try:
        py_port = int(os.getenv('MCP_HTTP_PORT') or '8013')
    except Exception:
        py_port = 8013
    py_path = os.getenv('MCP_HTTP_PATH') or '/mcp'
    py_http = {
        'running': tcp(py_host, py_port),
        'host': py_host,
        'port': py_port,
        'path': py_path,
        'url': f"http://{py_host}:{py_port}{py_path}",
    }

    # Node HTTP MCP (proxy); default to :8014. Do NOT fall back to PORT, which is
    # the main API port and would confuse the dashboard when kube/compose ports differ.
    node_host = os.getenv('NODE_MCP_HOST') or '127.0.0.1'
    try:
        node_port = int(os.getenv('NODE_MCP_PORT') or '8014')
    except Exception:
        node_port = 8014
    node_http = {
        'running': tcp(node_host, node_port),
        'host': node_host,
        'port': node_port,
        'path': '/mcp',
        'url': f"http://{node_host}:{node_port}/mcp",
    }

    # Python stdio MCP availability (module presence)
    try:
        from server.mcp.server import MCPServer as _M
        py_stdio_available = True
    except Exception:
        py_stdio_available = False

    return {
        'python_http': py_http,
        'node_http': node_http,
        'python_stdio_available': py_stdio_available,
    }

@app.post("/api/mcp/http/start")
def mcp_http_start() -> Dict[str, Any]:
    """Start HTTP MCP server on port 8013"""
    import subprocess
    try:
        # Check if already running
        status = mcp_http_status()
        if status["running"]:
            return {"success": False, "error": "HTTP MCP already running on port 8013"}
        
        # Start in background
        subprocess.Popen(
            [str(ROOT / ".venv" / "bin" / "python"), "-m", "server.mcp.http"],
            cwd=str(ROOT),
            stdout=open("/tmp/agro_mcp_http.log", "w"),
            stderr=subprocess.STDOUT
        )
        
        # Wait a moment and check
        import time
        time.sleep(2)
        status = mcp_http_status()
        return {"success": status["running"], "port": 8013}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/mcp/http/stop")
def mcp_http_stop() -> Dict[str, Any]:
    """Stop HTTP MCP server"""
    import subprocess
    try:
        # Kill process on port 8013
        result = subprocess.run(
            ["pkill", "-f", "server.mcp.http"],
            capture_output=True, text=True, timeout=5
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/mcp/http/restart")
def mcp_http_restart() -> Dict[str, Any]:
    """Restart HTTP MCP server"""
    stop_result = mcp_http_stop()
    if not stop_result["success"]:
        return stop_result
    
    import time
    time.sleep(1)
    return mcp_http_start()

@app.get("/api/mcp/test")
def mcp_stdio_test() -> Dict[str, Any]:
    """Test stdio MCP server (one-shot)"""
    import subprocess
    try:
        # Test stdio MCP
        result = subprocess.run(
            [str(ROOT / ".venv" / "bin" / "python"), "-m", "server.mcp.server"],
            input='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
            capture_output=True, text=True, timeout=10, cwd=str(ROOT)
        )
        
        if result.returncode == 0 and result.stdout:
            import json
            try:
                response = json.loads(result.stdout.strip())
                tools = response.get("result", [])
                return {
                    "success": True,
                    "tools_count": len(tools),
                    "tools": [t.get("name") for t in tools] if isinstance(tools, list) else [],
                    "output": result.stdout[:500]
                }
            except:
                pass
        
        return {"success": False, "error": "Failed to parse MCP response", "output": result.stdout + "\n" + result.stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/cards/build/stream/{job_id}")
def cards_build_stream(job_id: str):
    from server.cards_builder import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    def gen():
        for evt in job.events():
            yield evt
    return StreamingResponse(gen(), media_type='text/event-stream')


@app.get("/api/cards/build/status/{job_id}")
def cards_build_status(job_id: str) -> Dict[str, Any]:
    from server.cards_builder import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    snap = job.snapshot()
    snap.update({"status": job.status})
    if job.error:
        snap["error"] = job.error
    return snap


@app.post("/api/cards/build/cancel/{job_id}")
def cards_build_cancel(job_id: str) -> Dict[str, Any]:
    from server.cards_builder import cancel_job
    ok = cancel_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


@app.get("/api/cards/build/logs")
def cards_build_logs() -> Dict[str, Any]:
    from server.cards_builder import read_logs
    return read_logs()

# ---------------- Embedded Editor ----------------
@app.get("/health/editor")
def editor_health() -> Dict[str, Any]:
    """Check embedded editor health with full readiness verification"""
    try:
        import requests
        import time

        status_path = Path(__file__).parent.parent / "out" / "editor" / "status.json"

        if not status_path.exists():
            return {"ok": False, "error": "No status file", "enabled": False}

        with open(status_path, 'r') as f:
            status = json.load(f)

        if not status.get("enabled", False):
            return {"ok": False, "reason": status.get("reason", "disabled"), "enabled": False}

        # Probe the editor URL with multiple readiness checks
        url = status.get("url", "")
        if not url:
            return {"ok": False, "error": "No URL in status", "enabled": True}
        
        # Store original URL for iframe (browser access)
        original_url = url

        # Build probe URL list. Prefer host.docker.internal for in-container requests,
        # but fall back to original 127.0.0.1 if name resolution fails in Colima.
        probe_urls = []
        if url.startswith("http://127.0.0.1:"):
            probe_urls = [url.replace("http://127.0.0.1:", "http://host.docker.internal:"), original_url]
        else:
            probe_urls = [url]

        try:
            last_error = None
            for probe in probe_urls:
                # Check 1: Basic HTTP connectivity (homepage redirect is OK)
                try:
                    resp = requests.get(probe, timeout=3, allow_redirects=False, verify=False)
                except requests.RequestException as e:
                    last_error = e
                    continue
            if resp.status_code not in [200, 301, 302, 307, 308]:
                return {
                    "ok": False,
                    "error": f"HTTP {resp.status_code}",
                    "enabled": True,
                    "url": probe_urls[0],
                    "readiness_stage": "http_connection"
                }

            # Check 2: Try GET to verify service readiness after redirect
            # VS Code Server redirects to /?folder=/workspace, which returns 405 for HEAD
            resp = requests.get(probe_urls[0], timeout=3, allow_redirects=True, verify=False)
            if not (200 <= resp.status_code < 400):
                return {
                    "ok": False,
                    "error": f"Service not ready (HTTP {resp.status_code})",
                    "enabled": True,
                    "url": probe_urls[0],
                    "readiness_stage": "service_probe"
                }

            # Check 3: Small delay to allow for startup race conditions
            # If we get here, server is responding but might still be initializing
            started_at = status.get("started_at")
            if started_at:
                try:
                    import datetime
                    start_time = datetime.datetime.fromisoformat(started_at)
                    uptime = (datetime.datetime.now() - start_time).total_seconds()
                    # If service started less than 2 seconds ago, it may still be initializing
                    if uptime < 2:
                        return {
                            "ok": False,
                            "error": "Service still initializing",
                            "enabled": True,
                            "url": url,
                            "readiness_stage": "startup_delay",
                            "uptime_seconds": round(uptime, 2)
                        }
                except Exception:
                    pass

            # All checks passed
            return {
                "ok": True,
                "enabled": True,
                "port": status.get("port"),
                "url": original_url,  # Use original URL for iframe (browser access)
                "started_at": status.get("started_at"),
                "readiness_stage": "ready"
            }

        except requests.Timeout:
            return {
                "ok": False,
                "error": "Service timeout (still starting?)",
                "enabled": True,
                "url": url,
                "readiness_stage": "timeout"
            }
        except requests.RequestException as e:
            # In Colima/docker-in-docker, server-side reachability often fails while browser reachability works.
            # Assume ready for iframe usage and return the browser-facing original URL.
            return {
                "ok": True,
                "enabled": True,
                "port": status.get("port"),
                "url": original_url,
                "started_at": status.get("started_at"),
                "readiness_stage": "assume_ready_browser_access"
            }
    except Exception as e:
        return {"ok": False, "error": str(e), "enabled": False}

@app.post("/api/editor/restart")
def editor_restart() -> Dict[str, Any]:
    """Restart the embedded editor"""
    try:
        import subprocess

        scripts_dir = Path(__file__).parent.parent / "scripts"

        # Stop first
        down_script = scripts_dir / "editor_down.sh"
        if down_script.exists():
            subprocess.run([str(down_script)], check=False)

        # Start
        up_script = scripts_dir / "editor_up.sh"
        if up_script.exists():
            result = subprocess.run(
                [str(up_script)],
                capture_output=True,
                text=True,
                timeout=60
            )
            return {
                "ok": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        else:
            return {"ok": False, "error": "editor_up.sh not found"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# -------- Onboarding State Management --------
def _get_onboarding_state_path() -> Path:
    """Get path to onboarding state file"""
    state_dir = Path(__file__).parent.parent / "out" / "onboarding"
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir / "state.json"

def _read_onboarding_state() -> Dict[str, Any]:
    """Read current onboarding state from server"""
    try:
        path = _get_onboarding_state_path()
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        print(f"[Onboarding] Failed to read state: {e}")
    return {"completed": False, "completed_at": None}

def _write_onboarding_state(state: Dict[str, Any]) -> bool:
    """Persist onboarding state to server"""
    try:
        path = _get_onboarding_state_path()
        path.write_text(json.dumps(state, indent=2))
        return True
    except Exception as e:
        print(f"[Onboarding] Failed to write state: {e}")
        return False

@app.get("/api/onboarding/state")
def get_onboarding_state() -> Dict[str, Any]:
    """Get current onboarding completion state"""
    state = _read_onboarding_state()
    return {
        "ok": True,
        "completed": state.get("completed", False),
        "completed_at": state.get("completed_at"),
        "step": state.get("step", 1)
    }

@app.post("/api/onboarding/complete")
def mark_onboarding_complete() -> Dict[str, Any]:
    """Mark onboarding as completed"""
    from datetime import datetime
    state = _read_onboarding_state()
    state["completed"] = True
    state["completed_at"] = datetime.now().isoformat()
    state["step"] = 5
    if _write_onboarding_state(state):
        return {"ok": True, "message": "Onboarding marked as complete"}
    else:
        return {"ok": False, "error": "Failed to persist state"}

@app.post("/api/onboarding/reset")
def reset_onboarding() -> Dict[str, Any]:
    """Reset onboarding (for manual retrigger)"""
    state = {"completed": False, "completed_at": None, "step": 1}
    if _write_onboarding_state(state):
        return {"ok": True, "message": "Onboarding reset"}
    else:
        return {"ok": False, "error": "Failed to persist state"}

# -------- Editor Settings Persistence --------
def _get_editor_settings_path() -> Path:
    """Get path to editor settings file"""
    settings_dir = Path(__file__).parent.parent / "out" / "editor"
    settings_dir.mkdir(parents=True, exist_ok=True)
    return settings_dir / "settings.json"

def _read_editor_settings() -> Dict[str, Any]:
    """Read editor settings from server"""
    try:
        path = _get_editor_settings_path()
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        print(f"[Editor Settings] Failed to read settings: {e}")
    return {"port": 4440, "enabled": True}

def _write_editor_settings(settings: Dict[str, Any]) -> bool:
    """Persist editor settings to server"""
    try:
        path = _get_editor_settings_path()
        path.write_text(json.dumps(settings, indent=2))
        return True
    except Exception as e:
        print(f"[Editor Settings] Failed to write settings: {e}")
        return False

@app.get("/api/editor/settings")
def get_editor_settings() -> Dict[str, Any]:
    """Get editor settings"""
    settings = _read_editor_settings()
    return {
        "ok": True,
        "port": settings.get("port", 4440),
        "enabled": settings.get("enabled", True),
        "host": settings.get("host", "127.0.0.1")
    }

@app.post("/api/editor/settings")
def update_editor_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update and persist editor settings"""
    settings = _read_editor_settings()
    if "port" in payload:
        settings["port"] = int(payload["port"])
    if "enabled" in payload:
        settings["enabled"] = bool(payload["enabled"])
    if "host" in payload:
        settings["host"] = str(payload["host"])

    if _write_editor_settings(settings):
        return {"ok": True, "message": "Settings saved"}
    else:
        return {"ok": False, "error": "Failed to persist settings"}

# -------- Embedded Editor Reverse Proxy (HTTP only) --------
async def _editor_status() -> Dict[str, Any]:
    try:
        p = _Path(__file__).parent.parent / 'out' / 'editor' / 'status.json'
        if not p.exists():
            return {"enabled": False, "ok": False, "error": "No status file"}
        return json.loads(p.read_text())
    except Exception as e:
        return {"enabled": False, "ok": False, "error": str(e)}

def _strip_embed_block_headers(headers: Dict[str, str]) -> Dict[str, str]:
    h: Dict[str, str] = {}
    for k, v in headers.items():
        kl = k.lower()
        if kl in ("x-frame-options", "content-security-policy", "content-security-policy-report-only", "cross-origin-opener-policy", "cross-origin-embedder-policy"):
            continue
        if kl in ("content-encoding", "transfer-encoding"):
            continue
        h[k] = v
    # allow embedding on same origin
    h.setdefault('X-Frame-Options', 'ALLOWALL')
    return h

@app.get("/editor")
def editor_root() -> Response:
    # normalize to trailing slash for relative asset links
    return RedirectResponse(url="/editor/")

@app.api_route("/editor/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def editor_proxy(path: str, request: Request):
    """Same-origin reverse proxy for the embedded editor.

    This improves iframe reliability by stripping frame-blocking headers.
    WebSocket connections go directly to the upstream server (VS Code handles them).
    """
    # Check if this is a WebSocket upgrade request
    connection_header = request.headers.get("connection", "").lower()
    upgrade_header = request.headers.get("upgrade", "").lower()

    if "upgrade" in connection_header and upgrade_header == "websocket":
        # WebSocket proxy using httpx-ws and Starlette WebSocket
        from starlette.websockets import WebSocketDisconnect
        import httpx_ws
        import httpx

        status = await _editor_status()
        base = str(status.get("url") or "").rstrip("/")
        if not base:
            return JSONResponse({"ok": False, "error": "No editor URL"}, status_code=503)

        qs = ("?" + request.url.query) if request.url.query else ""
        target = f"{base}/{path}{qs}"

        # Create WebSocket from ASGI scope
        websocket = WebSocket(request.scope, request.receive, request._send)
        await websocket.accept()

        try:
            # Connect to upstream WebSocket
            async with httpx.AsyncClient() as client:
                async with httpx_ws.aconnect_ws(target, client) as upstream_ws:
                    # Bidirectional proxy
                    import asyncio

                    async def client_to_upstream():
                        try:
                            while True:
                                message = await websocket.receive()
                                if "text" in message:
                                    await upstream_ws.send_text(message["text"])
                                elif "bytes" in message:
                                    await upstream_ws.send_bytes(message["bytes"])
                        except (WebSocketDisconnect, Exception):
                            pass

                    async def upstream_to_client():
                        try:
                            async for message in upstream_ws:
                                if isinstance(message, httpx_ws.WSMessage):
                                    if message.type == httpx_ws.WSMessageType.TEXT:
                                        await websocket.send_text(message.data)
                                    elif message.type == httpx_ws.WSMessageType.BINARY:
                                        await websocket.send_bytes(message.data)
                        except (WebSocketDisconnect, Exception):
                            pass

                    await asyncio.gather(client_to_upstream(), upstream_to_client())
        except Exception as e:
            print(f"[WebSocket Proxy] Error: {e}")
        finally:
            await websocket.close()

        return Response(status_code=101)

    # Regular HTTP request handling
    status = await _editor_status()
    if not status.get("enabled"):
        return JSONResponse({"ok": False, "error": "Editor disabled"}, status_code=503)
    base = str(status.get("url") or "").rstrip("/")
    if not base:
        return JSONResponse({"ok": False, "error": "No editor URL"}, status_code=503)
    # construct target
    qs = ("?" + request.url.query) if request.url.query else ""
    target = f"{base}/{path}{qs}"
    # forward the request
    import httpx
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "connection", "accept-encoding")}
    body = await request.body()
    timeout = httpx.Timeout(30.0)
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        upstream = await client.request(request.method, target, headers=headers, content=body)
        filtered = _strip_embed_block_headers(dict(upstream.headers))
        return Response(content=upstream.content, status_code=upstream.status_code, headers=filtered)

@app.get("/api/cards")
def cards_list() -> Dict[str, Any]:
    """Return cards index information (paginated - first 10 for UI)"""
    try:
        from common.config_loader import out_dir
        repo = os.getenv('REPO', 'agro').strip()
        base = _Path(out_dir(repo))
        cards_path = base / "cards.jsonl"
        progress_path = (_Path(os.getenv('OUT_DIR_BASE') or _Path(__file__).resolve().parents[1] / 'out') / 'cards' / repo / 'progress.json')

        cards = []
        count = 0
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if not line.strip():
                        continue
                    if len(cards) < 10:
                        try:
                            cards.append(json.loads(line))
                        except Exception:
                            pass
                    count = i + 1
        last_build = None
        if progress_path.exists():
            try:
                last_build = json.loads(progress_path.read_text())
            except Exception:
                last_build = None
        return {"count": count, "cards": cards, "path": str(cards_path), "last_build": last_build}
    except Exception as e:
        return {"count": 0, "cards": [], "error": str(e)}

@app.get("/api/cards/all")
def cards_all() -> Dict[str, Any]:
    """Return ALL cards (for raw data view)"""
    try:
        from common.config_loader import out_dir
        repo = os.getenv('REPO', 'agro').strip()
        base = _Path(out_dir(repo))
        cards_path = base / "cards.jsonl"

        cards = []
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        cards.append(json.loads(line))
                    except Exception:
                        pass
        return {"count": len(cards), "cards": cards, "path": str(cards_path)}
    except Exception as e:
        return {"count": 0, "cards": [], "error": str(e)}

@app.get("/api/cards/raw-text")
def cards_raw_text() -> str:
    """Return all cards as formatted text (for terminal view)"""
    try:
        from common.config_loader import out_dir
        repo = os.getenv('REPO', 'agro').strip()
        base = _Path(out_dir(repo))
        cards_path = base / "cards.jsonl"

        lines = []
        count = 0
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    try:
                        card = json.loads(line)
                        count += 1
                        # Format each card nicely
                        symbol = (card.get('symbols', [None])[0] or card.get('file_path', 'Unknown')).split('/')[-1]
                        lines.append(f"\n{'='*80}")
                        lines.append(f"[Card #{count}] {symbol}")
                        lines.append(f"{'='*80}")
                        lines.append(f"File: {card.get('file_path', 'N/A')}")
                        if card.get('start_line'):
                            lines.append(f"Line: {card.get('start_line', 'N/A')}")
                        lines.append(f"\nPurpose:\n{card.get('purpose', 'N/A')}")
                        if card.get('technical_details'):
                            lines.append(f"\nTechnical Details:\n{card.get('technical_details', '')}")
                        if card.get('domain_concepts'):
                            lines.append(f"\nDomain Concepts: {', '.join(card.get('domain_concepts', []))}")
                    except Exception as e:
                        lines.append(f"\n[ERROR parsing card at line {line_num}]: {str(e)}")
        lines.append(f"\n{'='*80}")
        lines.append(f"Total: {count} cards loaded from {cards_path}")
        lines.append(f"{'='*80}\n")
        return '\n'.join(lines)
    except Exception as e:
        return f"Error loading cards: {str(e)}"

# ---------------- Autotune ----------------
@app.get("/api/autotune/status")
def autotune_status() -> Dict[str, Any]:
    """Return autotune status. Pro feature stub."""
    return {"enabled": False, "current_mode": None}

@app.post("/api/autotune/status")
def autotune_update(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update autotune settings. Pro feature stub."""
    return {"ok": True, "enabled": payload.get("enabled", False), "current_mode": payload.get("current_mode")}

# ---------------- Git hooks helpers ----------------
def _git_hooks_dir() -> Path:
    root = repo_root()
    return root / ".git" / "hooks"

_HOOK_POST_CHECKOUT = """#!/usr/bin/env bash
# Auto-index on branch changes when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
export OUT_DIR_BASE="./out.noindex-shared"
python index_repo.py >/dev/null 2>&1 || true
"""

_HOOK_POST_COMMIT = """#!/usr/bin/env bash
# Auto-index on commit when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
export OUT_DIR_BASE="./out.noindex-shared"
python index_repo.py >/dev/null 2>&1 || true
"""

@app.get("/api/git/hooks/status")
def git_hooks_status() -> Dict[str, Any]:
    d = _git_hooks_dir()
    pc = d / "post-checkout"
    pm = d / "post-commit"
    return {
        "dir": str(d),
        "post_checkout": pc.exists(),
        "post_commit": pm.exists(),
        "enabled_hint": "export AUTO_INDEX=1"
    }

@app.post("/api/git/hooks/install")
def git_hooks_install() -> Dict[str, Any]:
    d = _git_hooks_dir()
    try:
        d.mkdir(parents=True, exist_ok=True)
        pc = d / "post-checkout"
        pm = d / "post-commit"
        pc.write_text(_HOOK_POST_CHECKOUT)
        pm.write_text(_HOOK_POST_COMMIT)
        os.chmod(pc, 0o755)
        os.chmod(pm, 0o755)
        return {"ok": True, "message": "Installed git hooks. Enable with: export AUTO_INDEX=1"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Git commit metadata (agent/session signing) ----------------
def _git_dir() -> Path:
    return repo_root() / ".git"

def _commit_meta_path() -> Path:
    return _git_dir() / "agent_commit_meta.json"

def _git_message_template_path() -> Path:
    return _git_dir() / ".gitmessage.agro"

def _prepare_commit_msg_hook_path() -> Path:
    return _git_dir() / "hooks" / "prepare-commit-msg"

def _read_json(p: Path, default: Any) -> Any:
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

@app.get("/api/git/commit-meta")
def git_commit_meta_get() -> Dict[str, Any]:
    """Return current commit metadata settings and git user config."""
    meta = _read_json(_commit_meta_path(), {
        "agent_name": "",
        "agent_email": "",
        "chat_session_id": "",
        "trailer_key": "Chat-Session",
        "append_trailer": True,
        "set_git_user": False,
        "enable_template": False,
        "install_hook": True,
    })
    # Read current git config
    def _git_cfg(key: str) -> Optional[str]:
        try:
            out = subprocess.check_output(["git", "config", "--get", key], cwd=str(repo_root()))
            return out.decode().strip()
        except Exception:
            return None
    return {
        "meta": meta,
        "git_user": {
            "name": _git_cfg("user.name") or "",
            "email": _git_cfg("user.email") or "",
        },
        "template_path": str(_git_message_template_path()),
        "hook_path": str(_prepare_commit_msg_hook_path()),
    }

@app.post("/api/git/commit-meta")
def git_commit_meta_set(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist commit metadata settings and optionally configure git.

    Body keys:
    - agent_name, agent_email, chat_session_id, trailer_key
    - append_trailer (bool), set_git_user (bool), enable_template (bool), install_hook (bool)
    """
    root = repo_root()
    gd = _git_dir()
    gd.mkdir(parents=True, exist_ok=True)
    meta = {
        "agent_name": str(payload.get("agent_name", "")),
        "agent_email": str(payload.get("agent_email", "")),
        "chat_session_id": str(payload.get("chat_session_id", "")),
        "trailer_key": str(payload.get("trailer_key", "Chat-Session")) or "Chat-Session",
        "append_trailer": bool(payload.get("append_trailer", True)),
        "set_git_user": bool(payload.get("set_git_user", False)),
        "enable_template": bool(payload.get("enable_template", False)),
        "install_hook": bool(payload.get("install_hook", True)),
    }
    try:
        _commit_meta_path().write_text(json.dumps(meta, indent=2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write meta: {e}")

    # Optionally set git user.name/email
    if meta["set_git_user"]:
        try:
            if meta["agent_name"]:
                subprocess.check_call(["git", "config", "user.name", meta["agent_name"]], cwd=str(root))
            if meta["agent_email"]:
                subprocess.check_call(["git", "config", "user.email", meta["agent_email"]], cwd=str(root))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to set git user: {e}")

    # Optionally write a commit message template and configure it
    if meta["enable_template"]:
        try:
            tmpl = _git_message_template_path()
            content = (
                "# Commit message\n\n"
                "# Describe your change above.\n"
            )
            if meta["chat_session_id"]:
                content += f"\n{meta['trailer_key']}: {meta['chat_session_id']}\n"
            tmpl.write_text(content)
            subprocess.check_call(["git", "config", "commit.template", str(tmpl)], cwd=str(root))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to set template: {e}")

    # Optionally install/refresh prepare-commit-msg hook to append trailer
    if meta["install_hook"] and meta["append_trailer"]:
        try:
            hooks_dir = gd / "hooks"
            hooks_dir.mkdir(parents=True, exist_ok=True)
            hook = _prepare_commit_msg_hook_path()
            hook_code = f"""#!/usr/bin/env bash
set -e
MSGFILE="$1"

# Load meta
META="{_commit_meta_path()}"
if [ -f "$META" ]; then
  SESSION_ID=$(python - <<'PY'
import json,sys
try:
  j=json.load(open(sys.argv[1]))
  print(j.get('chat_session_id',''))
except Exception:
  print('')
PY
"$META")
  TRAILER_KEY=$(python - <<'PY'
import json,sys
try:
  j=json.load(open(sys.argv[1]))
  print(j.get('trailer_key','Chat-Session'))
except Exception:
  print('Chat-Session')
PY
"$META")
else
  SESSION_ID=""
  TRAILER_KEY="Chat-Session"
fi

[ -z "$SESSION_ID" ] && exit 0

# Append trailer if missing
if ! grep -q "^$TRAILER_KEY: " "$MSGFILE"; then
  printf "\n$TRAILER_KEY: %s\n" "$SESSION_ID" >> "$MSGFILE"
fi
"""
            hook.write_text(hook_code)
            os.chmod(hook, 0o755)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to install hook: {e}")

    return {"ok": True, "meta": meta}

# ---------------- Golden Questions Management ----------------
def _golden_path() -> Path:
    """Resolve golden questions path with data/ default and root fallback."""
    # Preferred default under data/
    default = Path('data/golden.json')
    env_p = os.getenv('GOLDEN_PATH')
    if env_p:
        return Path(env_p)
    # If data/golden.json exists, use it; else fall back to root golden.json
    if default.exists():
        return default
    return Path('golden.json')

@app.get("/api/golden")
def golden_list() -> Dict[str, Any]:
    """List all golden questions."""
    gp = _golden_path()
    if not gp.exists():
        return {"questions": [], "count": 0}
    data = _read_json(gp, [])
    if not isinstance(data, list):
        data = []
    # Filter out comment entries
    questions = [q for q in data if isinstance(q, dict) and "q" in q]
    return {"questions": questions, "count": len(questions)}

@app.post("/api/golden")
def golden_add(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new golden question."""
    gp = _golden_path()
    data = _read_json(gp, [])
    if not isinstance(data, list):
        data = []

    # Validate required fields
    q = str(payload.get("q") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question text required")

    new_q = {
        "q": q,
        "repo": str(payload.get("repo") or os.getenv("REPO", "agro")),
        "expect_paths": list(payload.get("expect_paths") or [])
    }

    data.append(new_q)
    _write_json(gp, data)
    return {"ok": True, "index": len(data) - 1, "question": new_q}

@app.put("/api/golden/{index}")
def golden_update(index: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing golden question."""
    gp = _golden_path()
    data = _read_json(gp, [])
    if not isinstance(data, list):
        raise HTTPException(status_code=404, detail="No golden questions found")

    # Find actual questions (skip comments)
    questions = [i for i, q in enumerate(data) if isinstance(q, dict) and "q" in q]
    if index < 0 or index >= len(questions):
        raise HTTPException(status_code=404, detail="Question not found")

    actual_index = questions[index]

    # Update fields
    if "q" in payload:
        data[actual_index]["q"] = str(payload["q"])
    if "repo" in payload:
        data[actual_index]["repo"] = str(payload["repo"])
    if "expect_paths" in payload:
        data[actual_index]["expect_paths"] = list(payload["expect_paths"])

    _write_json(gp, data)
    return {"ok": True, "index": index, "question": data[actual_index]}

@app.delete("/api/golden/{index}")
def golden_delete(index: int) -> Dict[str, Any]:
    """Delete a golden question."""
    gp = _golden_path()
    data = _read_json(gp, [])
    if not isinstance(data, list):
        raise HTTPException(status_code=404, detail="No golden questions found")

    # Find actual questions (skip comments)
    questions = [i for i, q in enumerate(data) if isinstance(q, dict) and "q" in q]
    if index < 0 or index >= len(questions):
        raise HTTPException(status_code=404, detail="Question not found")

    actual_index = questions[index]
    deleted = data.pop(actual_index)

    _write_json(gp, data)
    return {"ok": True, "deleted": deleted}

@app.post("/api/golden/test")
def golden_test(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Test a single golden question and return retrieval results."""
    q = str(payload.get("q") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question required")

    repo = str(payload.get("repo") or os.getenv("REPO", "agro"))
    expect_paths = list(payload.get("expect_paths") or [])
    final_k = int(payload.get("final_k") or os.getenv("EVAL_FINAL_K", "5"))
    use_multi = payload.get("use_multi", os.getenv("EVAL_MULTI", "1") == "1")

    # Run search
    if use_multi:
        docs = search_routed_multi(q, repo_override=repo, m=4, final_k=final_k)
    else:
        from retrieval.hybrid_search import search_routed
        docs = search_routed(q, repo_override=repo, final_k=final_k)

    paths = [d.get("file_path", "") for d in docs]

    # Check hit
    def hit(paths: List[str], expect: List[str]) -> bool:
        return any(any(exp in p for p in paths) for exp in expect)

    top1_hit = hit(paths[:1], expect_paths) if paths else False
    topk_hit = hit(paths, expect_paths) if paths else False

    return {
        "ok": True,
        "question": q,
        "repo": repo,
        "expect_paths": expect_paths,
        "top1_path": paths[:1],
        "top1_hit": top1_hit,
        "topk_hit": topk_hit,
        "top_paths": paths[:final_k],
        "all_results": [
            {
                "file_path": d.get("file_path", ""),
                "start_line": d.get("start_line", 0),
                "end_line": d.get("end_line", 0),
                "rerank_score": float(d.get("rerank_score", 0.0) or 0.0)
            }
            for d in docs
        ]
    }

# ---------------- Evaluation System ----------------
_EVAL_STATUS: Dict[str, Any] = {
    "running": False,
    "progress": 0,
    "total": 0,
    "current_question": "",
    "results": None
}

def _validate_eval_preflight(golden_path: str) -> tuple[bool, str, str]:
    """Validate prerequisites before running evaluation.

    Returns: (is_valid, error_message, warning_message)
    """
    import json
    from pathlib import Path

    # Check golden.json exists and is valid JSON
    gp = Path(golden_path)
    if not gp.exists():
        return False, f"Golden questions file not found: {golden_path}", ""

    try:
        with open(gp) as f:
            golden = json.load(f)
        if not isinstance(golden, list) or len(golden) == 0:
            return False, f"Golden questions file is empty or not a valid list: {golden_path}", ""
    except json.JSONDecodeError as e:
        return False, f"Golden questions file has invalid JSON: {e}", ""
    except Exception as e:
        return False, f"Failed to read golden questions file: {e}", ""

    # Check Qdrant connectivity (warning only, BM25 still works)
    warning = ""
    try:
        from qdrant_client import QdrantClient
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        qc = QdrantClient(url=qdrant_url)
        # Try to list collections to verify connectivity
        qc.get_collections()
    except Exception as e:
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        warning = f"⚠ Qdrant unavailable at {qdrant_url} - evaluation will use BM25-only retrieval"
        print(f"[eval] {warning}: {e}")

    return True, "", warning

@app.post("/api/eval/run")
def eval_run(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """Run full evaluation suite in background."""
    global _EVAL_STATUS
    import threading

    if _EVAL_STATUS["running"]:
        return {"ok": False, "error": "Evaluation already running"}

    # Pre-flight validation
    golden_path = os.getenv("GOLDEN_PATH", "data/golden.json")
    is_valid, error_msg, warning_msg = _validate_eval_preflight(golden_path)
    if not is_valid:
        return {"ok": False, "error": error_msg}

    use_multi = payload.get("use_multi", os.getenv("EVAL_MULTI", "1") == "1")
    final_k = int(payload.get("final_k") or os.getenv("EVAL_FINAL_K", "5"))
    sample_limit = payload.get("sample_limit")  # None = all questions
    if sample_limit:
        try:
            sample_limit = int(sample_limit)
        except (ValueError, TypeError):
            sample_limit = None

    def run_eval():
        global _EVAL_STATUS
        _EVAL_STATUS = {
            "running": True,
            "progress": 0,
            "total": 0,
            "current_question": "",
            "results": None,
            "warning": warning_msg  # Store warning message to include in results
        }

        try:
            # Temporarily set env vars
            old_multi = os.environ.get("EVAL_MULTI")
            old_k = os.environ.get("EVAL_FINAL_K")
            old_gp = os.environ.get("GOLDEN_PATH")

            # Ensure GOLDEN_PATH points to repo-standard path if not set or invalid
            gp = old_gp or "data/golden.json"
            try:
                from pathlib import Path as _P
                if not _P(gp).exists():
                    # If legacy value like 'golden.json', try under data/
                    candidate = _P('data') / _P(gp).name
                    gp = str(candidate)
            except Exception:
                gp = "data/golden.json"

            print(f"[eval] Using GOLDEN_PATH={gp}")
            if sample_limit:
                print(f"[eval] Sample limit: {sample_limit} questions")
            os.environ["GOLDEN_PATH"] = gp
            from eval.eval_loop import run_eval_with_results
            os.environ["EVAL_MULTI"] = "1" if use_multi else "0"
            os.environ["EVAL_FINAL_K"] = str(final_k)

            try:
                results = run_eval_with_results(sample_limit=sample_limit)
                if warning_msg:
                    results["warning"] = warning_msg
                _EVAL_STATUS["results"] = results
                _EVAL_STATUS["progress"] = results.get("total", 0)
                _EVAL_STATUS["total"] = results.get("total", 0)
            finally:
                # Restore env
                if old_multi is not None:
                    os.environ["EVAL_MULTI"] = old_multi
                elif "EVAL_MULTI" in os.environ:
                    del os.environ["EVAL_MULTI"]
                if old_k is not None:
                    os.environ["EVAL_FINAL_K"] = old_k
                elif "EVAL_FINAL_K" in os.environ:
                    del os.environ["EVAL_FINAL_K"]
                if old_gp is not None:
                    os.environ["GOLDEN_PATH"] = old_gp
                elif "GOLDEN_PATH" in os.environ:
                    del os.environ["GOLDEN_PATH"]

        except Exception as e:
            _EVAL_STATUS["results"] = {"error": str(e)}
        finally:
            _EVAL_STATUS["running"] = False

    thread = threading.Thread(target=run_eval, daemon=True)
    thread.start()

    response = {"ok": True, "message": "Evaluation started"}
    if warning_msg:
        response["warning"] = warning_msg
    return response

@app.get("/api/eval/status")
def eval_status() -> Dict[str, Any]:
    """Get current evaluation status."""
    return {
        "running": _EVAL_STATUS["running"],
        "progress": _EVAL_STATUS["progress"],
        "total": _EVAL_STATUS["total"],
        "current_question": _EVAL_STATUS["current_question"]
    }

@app.get("/api/eval/results")
def eval_results() -> Dict[str, Any]:
    """Get last evaluation results."""
    if _EVAL_STATUS["results"] is None:
        return {"ok": False, "message": "No evaluation results available"}
    return _EVAL_STATUS["results"]

# ---------------- Learning Reranker API ----------------
_RERANKER_STATUS: Dict[str, Any] = {
    "running": False,
    "task": "",
    "progress": 0,
    "message": "",
    "result": None,
    "live_output": []  # List of output lines for streaming to UI
}

@app.post("/api/reranker/mine")
def reranker_mine() -> Dict[str, Any]:
    """Mine triplets from telemetry logs."""
    global _RERANKER_STATUS
    import threading
    import subprocess
    
    if _RERANKER_STATUS["running"]:
        return {"ok": False, "error": "A reranker task is already running"}
    
    def run_mine():
        global _RERANKER_STATUS
        _RERANKER_STATUS = {"running": True, "task": "mining", "progress": 0, "message": "Mining triplets...", "result": None, "live_output": []}
        try:
            proc = subprocess.Popen(
                [sys.executable, "scripts/mine_triplets.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=repo_root(),
                bufsize=1
            )

            output_lines = []
            for line in proc.stdout:
                line = line.rstrip()
                output_lines.append(line)
                _RERANKER_STATUS["live_output"].append(line)

                # Keep only last 1000 lines
                if len(_RERANKER_STATUS["live_output"]) > 1000:
                    _RERANKER_STATUS["live_output"] = _RERANKER_STATUS["live_output"][-1000:]

            proc.wait(timeout=300)
            output = '\n'.join(output_lines)

            if proc.returncode == 0:
                msg = output.strip() if output else "Mining complete"
                _RERANKER_STATUS["message"] = msg
                _RERANKER_STATUS["result"] = {"ok": True, "output": output}
            else:
                _RERANKER_STATUS["message"] = f"Mining failed (exit code {proc.returncode})"
                _RERANKER_STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _RERANKER_STATUS["message"] = f"Error: {str(e)}"
            _RERANKER_STATUS["result"] = {"ok": False, "error": str(e)}
            _RERANKER_STATUS["live_output"].append(f"ERROR: {str(e)}")
        finally:
            _RERANKER_STATUS["running"] = False
            _RERANKER_STATUS["progress"] = 100
    
    thread = threading.Thread(target=run_mine, daemon=True)
    thread.start()
    return {"ok": True, "message": "Mining started"}

@app.post("/api/reranker/train")
def reranker_train(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """Train reranker model."""
    global _RERANKER_STATUS
    import threading
    import subprocess
    
    if _RERANKER_STATUS["running"]:
        return {"ok": False, "error": "A reranker task is already running"}
    
    epochs = int(payload.get("epochs", 2))
    batch_size = int(payload.get("batch_size", 16))
    
    def run_train():
        global _RERANKER_STATUS
        _RERANKER_STATUS = {"running": True, "task": "training", "progress": 0, "message": f"Training model ({epochs} epochs)...", "result": None, "live_output": []}
        try:
            # Stream output to capture epoch progress
            import subprocess
            proc = subprocess.Popen(
                [sys.executable, "scripts/train_reranker.py", "--epochs", str(epochs), "--batch", str(batch_size)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,  # Merge stderr to stdout
                text=True,
                cwd=repo_root(),
                bufsize=1
            )

            output_lines = []
            for line in proc.stdout:
                line = line.rstrip()
                output_lines.append(line)
                _RERANKER_STATUS["live_output"].append(line)  # Add to live output buffer

                # Keep only last 1000 lines to prevent memory issues
                if len(_RERANKER_STATUS["live_output"]) > 1000:
                    _RERANKER_STATUS["live_output"] = _RERANKER_STATUS["live_output"][-1000:]

                # Update status with epoch progress
                if "[EPOCH" in line:
                    _RERANKER_STATUS["message"] = line.strip()
                    # Parse epoch number for progress
                    import re
                    match = re.search(r'\[EPOCH (\d+)/(\d+)\]', line)
                    if match:
                        current, total = int(match.group(1)), int(match.group(2))
                        _RERANKER_STATUS["progress"] = int((current / total) * 100)

            proc.wait(timeout=3600)
            output = '\n'.join(output_lines)

            if proc.returncode == 0:
                _RERANKER_STATUS["message"] = "Training complete!"
                _RERANKER_STATUS["result"] = {"ok": True, "output": output}
            else:
                _RERANKER_STATUS["message"] = f"Training failed (exit code {proc.returncode})"
                _RERANKER_STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _RERANKER_STATUS["message"] = f"Error: {str(e)}"
            _RERANKER_STATUS["result"] = {"ok": False, "error": str(e)}
            _RERANKER_STATUS["live_output"].append(f"ERROR: {str(e)}")
        finally:
            _RERANKER_STATUS["running"] = False
            _RERANKER_STATUS["progress"] = 100
    
    thread = threading.Thread(target=run_train, daemon=True)
    thread.start()
    return {"ok": True, "message": "Training started"}

@app.post("/api/reranker/evaluate")
def reranker_evaluate() -> Dict[str, Any]:
    """Evaluate reranker performance."""
    global _RERANKER_STATUS
    import threading
    import subprocess
    
    if _RERANKER_STATUS["running"]:
        return {"ok": False, "error": "A reranker task is already running"}
    
    def run_eval():
        global _RERANKER_STATUS
        _RERANKER_STATUS = {"running": True, "task": "evaluating", "progress": 0, "message": "Evaluating model...", "result": None, "live_output": []}
        try:
            proc = subprocess.Popen(
                [sys.executable, "scripts/eval_reranker.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=repo_root(),
                bufsize=1
            )

            output_lines = []
            for line in proc.stdout:
                line = line.rstrip()
                output_lines.append(line)
                _RERANKER_STATUS["live_output"].append(line)

                # Keep only last 1000 lines
                if len(_RERANKER_STATUS["live_output"]) > 1000:
                    _RERANKER_STATUS["live_output"] = _RERANKER_STATUS["live_output"][-1000:]

            proc.wait(timeout=300)
            output = '\n'.join(output_lines)

            if proc.returncode == 0:
                _RERANKER_STATUS["message"] = "Evaluation complete!"
                _RERANKER_STATUS["result"] = {"ok": True, "output": output}

                # Save eval results to data/evals/latest.json
                try:
                    import time
                    metrics = {}
                    for line in output.split("\n"):
                        if "MRR:" in line:
                            metrics["mrr"] = float(line.split(":")[-1].strip())
                        elif "Hit@1:" in line:
                            metrics["hit_at_1"] = float(line.split(":")[-1].strip())
                        elif "Hit@3:" in line:
                            metrics["hit_at_3"] = float(line.split(":")[-1].strip())
                        elif "Hit@5:" in line:
                            metrics["hit_at_5"] = float(line.split(":")[-1].strip())
                        elif "Hit@10:" in line:
                            metrics["hit_at_10"] = float(line.split(":")[-1].strip())

                    if metrics:
                        eval_path = repo_root() / "data" / "evals" / "latest.json"
                        eval_path.parent.mkdir(parents=True, exist_ok=True)
                        timestamp = time.strftime("%b %d, %Y %I:%M %p", time.localtime())
                        model_path = os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")
                        with open(eval_path, "w") as f:
                            json.dump({
                                "timestamp": timestamp,
                                "model_path": model_path,
                                "metrics": metrics,
                                "raw_output": output
                            }, f, indent=2)
                        # Update Prometheus gauge with real MRR so alerts reflect reality
                        try:
                            mrr_val = float(metrics.get("mrr", 0.0) or 0.0)
                            # Prefer Hit@10, then Hit@5, then Hit@1 for the displayed hits@k
                            hits10 = metrics.get("hit_at_10")
                            hits5 = metrics.get("hit_at_5")
                            hits1 = metrics.get("hit_at_1")
                            if hits10 is not None:
                                set_retrieval_quality(topk=10, hits=int(hits10), mrr=mrr_val)
                            elif hits5 is not None:
                                set_retrieval_quality(topk=5, hits=int(hits5), mrr=mrr_val)
                            elif hits1 is not None:
                                set_retrieval_quality(topk=1, hits=int(hits1), mrr=mrr_val)
                            else:
                                # At least set the MRR gauge
                                set_retrieval_quality(topk=10, hits=0, mrr=mrr_val)
                        except Exception:
                            pass
                except Exception:
                    pass  # Don't fail if persistence fails
            else:
                _RERANKER_STATUS["message"] = f"Evaluation failed (exit code {proc.returncode})"
                _RERANKER_STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _RERANKER_STATUS["message"] = f"Error: {str(e)}"
            _RERANKER_STATUS["result"] = {"ok": False, "error": str(e)}
            _RERANKER_STATUS["live_output"].append(f"ERROR: {str(e)}")
        finally:
            _RERANKER_STATUS["running"] = False
            _RERANKER_STATUS["progress"] = 100
    
    thread = threading.Thread(target=run_eval, daemon=True)
    thread.start()
    return {"ok": True, "message": "Evaluation started"}

@app.get("/api/reranker/eval/latest")
def get_latest_reranker_eval() -> Dict[str, Any]:
    """Get latest reranker evaluation results."""
    eval_path = repo_root() / "data" / "evals" / "latest.json"
    if not eval_path.exists():
        return {"metrics": None}

    try:
        with open(eval_path) as f:
            return json.load(f)
    except Exception:
        return {"metrics": None}

@app.get("/api/reranker/status")
def reranker_status() -> Dict[str, Any]:
    """Get current reranker task status."""
    return _RERANKER_STATUS

@app.get("/api/reranker/logs/count")
def reranker_logs_count() -> Dict[str, Any]:
    """Count total queries in log file."""
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    count = 0
    if log_path.exists():
        with log_path.open("r") as f:
            for line in f:
                if line.strip() and '"type":"query"' in line:
                    count += 1
    return {"count": count}

@app.get("/api/reranker/triplets/count")
def reranker_triplets_count() -> Dict[str, Any]:
    """Count training triplets."""
    triplets_path = Path("data/training/triplets.jsonl")
    count = 0
    if triplets_path.exists():
        with triplets_path.open("r") as f:
            for line in f:
                if line.strip():
                    count += 1
    return {"count": count}

@app.get("/api/reranker/logs")
def reranker_logs() -> Dict[str, Any]:
    """Get recent log entries."""
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    logs = []
    if log_path.exists():
        with log_path.open("r") as f:
            for line in f:
                try:
                    logs.append(json.loads(line))
                except:
                    pass
    return {"logs": logs[-100:], "count": len(logs)}

@app.get("/api/reranker/logs/download")
def reranker_logs_download():
    """Download complete log file."""
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Log file not found")
    return FileResponse(str(log_path), filename="queries.jsonl")

@app.post("/api/reranker/logs/clear")
def reranker_logs_clear() -> Dict[str, Any]:
    """Clear all logs."""
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    try:
        if log_path.exists():
            log_path.unlink()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.post("/api/reranker/cron/setup")
def reranker_cron_setup(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Setup nightly training cron job."""
    import subprocess
    time_str = payload.get("time", "02:15")
    hour, minute = time_str.split(":")
    
    cron_line = f'{minute} {hour} * * * cd {repo_root()} && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 && python scripts/eval_reranker.py >> data/logs/nightly_reranker.log 2>&1'
    
    try:
        # Get current crontab
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current_cron = result.stdout if result.returncode == 0 else ""
        
        # Remove old reranker jobs if any
        lines = [l for l in current_cron.splitlines() if 'mine_triplets.py' not in l and 'train_reranker.py' not in l]
        lines.append(cron_line)
        
        # Set new crontab
        new_cron = "\n".join(lines) + "\n"
        proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=new_cron)
        
        return {"ok": True, "time": time_str}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.post("/api/reranker/cron/remove")
def reranker_cron_remove() -> Dict[str, Any]:
    """Remove nightly training cron job."""
    import subprocess
    try:
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current_cron = result.stdout if result.returncode == 0 else ""
        
        lines = [l for l in current_cron.splitlines() if 'mine_triplets.py' not in l and 'train_reranker.py' not in l]
        new_cron = "\n".join(lines) + "\n" if lines else ""
        
        proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=new_cron)
        
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.post("/api/reranker/baseline/save")
def reranker_baseline_save() -> Dict[str, Any]:
    """Save current evaluation as baseline."""
    if not _RERANKER_STATUS.get("result"):
        return {"ok": False, "error": "No evaluation results to save"}
    
    baseline_path = Path("data/evals/reranker_baseline.json")
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    _write_json(baseline_path, _RERANKER_STATUS["result"])
    
    # Also backup current model
    import shutil
    model_path = Path(os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"))
    if model_path.exists():
        backup_path = model_path.parent / (model_path.name + ".baseline")
        if backup_path.exists():
            shutil.rmtree(backup_path)
        shutil.copytree(model_path, backup_path)
    
    return {"ok": True, "path": str(baseline_path)}

@app.get("/api/reranker/baseline/compare")
def reranker_baseline_compare() -> Dict[str, Any]:
    """Compare current results with baseline."""
    baseline_path = Path("data/evals/reranker_baseline.json")
    if not baseline_path.exists():
        return {"ok": False, "error": "No baseline found"}
    
    if not _RERANKER_STATUS.get("result"):
        return {"ok": False, "error": "No current evaluation results"}
    
    baseline = _read_json(baseline_path, {})
    current = _RERANKER_STATUS["result"]
    
    # Parse metrics from output
    def parse_metrics(output):
        if not output: return {}
        import re
        mrr = 0.0
        hit1 = 0.0
        match_mrr = re.search(r'MRR@all:\s*([\d\.]+)', output)
        match_hit1 = re.search(r'Hit@1:\s*([\d\.]+)', output)
        if match_mrr:
            mrr = float(match_mrr.group(1))
        if match_hit1:
            hit1 = float(match_hit1.group(1))
        return {"mrr": mrr, "hit1": hit1}
    
    base_m = parse_metrics(baseline.get("output", ""))
    curr_m = parse_metrics(current.get("output", ""))
    
    return {
        "ok": True,
        "baseline": base_m,
        "current": curr_m,
        "delta": {
            "mrr": curr_m.get("mrr", 0) - base_m.get("mrr", 0),
            "hit1": curr_m.get("hit1", 0) - base_m.get("hit1", 0)
        }
    }

@app.post("/api/reranker/rollback")
def reranker_rollback() -> Dict[str, Any]:
    """Rollback to baseline model."""
    import shutil
    model_path = Path(os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"))
    backup_path = model_path.parent / (model_path.name + ".backup")
    
    if not backup_path.exists():
        return {"ok": False, "error": "No backup model found"}
    
    try:
        # Backup current to .old
        if model_path.exists():
            old_path = model_path.parent / (model_path.name + ".old")
            if old_path.exists():
                shutil.rmtree(old_path)
            shutil.move(str(model_path), str(old_path))
        
        # Copy backup to active
        shutil.copytree(backup_path, model_path)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.post("/api/reranker/smoketest")
def reranker_smoketest(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    """Run end-to-end smoke test."""
    import time
    query = payload.get("query", "").strip()
    if not query:
        return {"ok": False, "error": "Query required"}
    
    start = time.time()
    try:
        # Run search
        docs = search_routed_multi(query, m=2, final_k=5)
        
        # Check if reranker is enabled
        reranked = os.getenv("AGRO_RERANKER_ENABLED", "0") == "1"
        
        # Log it
        retrieved_for_log = []
        for d in docs:
            retrieved_for_log.append({
                "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                "score": float(d.get("rerank_score", 0.0) or 0.0),
                "text": (d.get("code", "") or "")[:300],
                "clicked": False,
            })
        
        event_id = log_query_event(
            query_raw=query,
            query_rewritten=None,
            retrieved=retrieved_for_log,
            answer_text="[Smoke test - no generation]",
            latency_ms=int((time.time() - start) * 1000),
            route="/api/reranker/smoketest",
            client_ip=(getattr(getattr(request, 'client', None), 'host', None) if request else None),
            user_agent=(request.headers.get('user-agent') if request else None),
        )
        
        return {
            "ok": True,
            "logged": True,
            "results_count": len(docs),
            "reranked": reranked,
            "event_id": event_id
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/reranker/costs")
def reranker_costs() -> Dict[str, Any]:
    """Get cost statistics from logs."""
    import datetime
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    
    if not log_path.exists():
        return {"total_24h": 0.0, "avg_per_query": 0.0, "queries_24h": 0}
    
    now = datetime.datetime.now(datetime.timezone.utc)
    day_ago = now - datetime.timedelta(hours=24)
    
    total_cost = 0.0
    count = 0
    
    with log_path.open("r") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                # Parse timestamp
                ts_str = evt.get("ts", "")
                ts = datetime.datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                if ts >= day_ago:
                    total_cost += evt.get("cost_usd", 0.0) or 0.0
                    count += 1
            except:
                pass
    
    return {
        "total_24h": round(total_cost, 4),
        "avg_per_query": round(total_cost / max(1, count), 6),
        "queries_24h": count
    }

@app.get("/api/reranker/nohits")
def reranker_nohits() -> Dict[str, Any]:
    """Get queries that had no hits."""
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    
    if not log_path.exists():
        return {"queries": [], "count": 0}
    
    nohits = []
    with log_path.open("r") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                # Check if any retrieval results
                retrieval = evt.get("retrieval", [])
                if not retrieval or len(retrieval) == 0:
                    nohits.append({
                        "query": evt.get("query_raw", ""),
                        "ts": evt.get("ts", "")
                    })
            except:
                pass
    
    return {"queries": nohits[-50:], "count": len(nohits)}

@app.post("/api/reranker/click")
def reranker_click(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Record a document click."""
    event_id = payload.get("event_id")
    doc_id = payload.get("doc_id")
    
    if not event_id or not doc_id:
        raise HTTPException(status_code=400, detail="event_id and doc_id required")
    
    from server.telemetry import log_feedback_event
    log_feedback_event(event_id, {"signal": "click", "doc_id": doc_id})
    return {"ok": True}

@app.post("/api/eval/baseline/save")
def eval_baseline_save() -> Dict[str, Any]:
    """Save current evaluation results as baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No evaluation results to save")

    # Prefer data/evals, fallback to root if overridden or missing
    env_bp = os.getenv("BASELINE_PATH")
    if env_bp:
        baseline_path = Path(env_bp)
    else:
        candidate = Path("data/evals/eval_baseline.json")
        baseline_path = candidate if candidate.parent.exists() else Path("eval_baseline.json")
    _write_json(baseline_path, _EVAL_STATUS["results"])
    return {"ok": True, "path": str(baseline_path)}

@app.get("/api/eval/baseline/compare")
def eval_baseline_compare() -> Dict[str, Any]:
    """Compare current results with baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No current evaluation results")

    env_bp = os.getenv("BASELINE_PATH")
    if env_bp:
        baseline_path = Path(env_bp)
    else:
        candidate = Path("data/evals/eval_baseline.json")
        baseline_path = candidate if candidate.exists() else Path("eval_baseline.json")
    if not baseline_path.exists():
        return {"ok": False, "message": "No baseline found"}

    baseline = _read_json(baseline_path, {})
    current = _EVAL_STATUS["results"]

    curr_top1 = current.get("top1_accuracy", 0)
    base_top1 = baseline.get("top1_accuracy", 0)
    curr_topk = current.get("topk_accuracy", 0)
    base_topk = baseline.get("topk_accuracy", 0)

    delta_top1 = curr_top1 - base_top1
    delta_topk = curr_topk - base_topk

    # Find regressions and improvements
    regressions = []
    improvements = []

    curr_results = current.get("results", [])
    base_results = baseline.get("results", [])

    for i, (curr_res, base_res) in enumerate(zip(curr_results, base_results)):
        if curr_res.get("question") != base_res.get("question"):
            continue
        if base_res.get("top1_hit") and not curr_res.get("top1_hit"):
            regressions.append({
                "index": i,
                "question": curr_res.get("question"),
                "repo": curr_res.get("repo")
            })
        elif not base_res.get("top1_hit") and curr_res.get("top1_hit"):
            improvements.append({
                "index": i,
                "question": curr_res.get("question"),
                "repo": curr_res.get("repo")
            })

    return {
        "ok": True,
        "baseline": {
            "top1_accuracy": base_top1,
            "topk_accuracy": base_topk,
            "timestamp": baseline.get("timestamp")
        },
        "current": {
            "top1_accuracy": curr_top1,
            "topk_accuracy": curr_topk,
            "timestamp": current.get("timestamp")
        },
        "delta": {
            "top1": delta_top1,
            "topk": delta_topk
        },
        "regressions": regressions,
        "improvements": improvements,
        "has_regressions": len(regressions) > 0
    }

# =============================
# Docker Management API
# =============================

@app.get("/api/docker/status")
def docker_status() -> Dict[str, Any]:
    """Check Docker status."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Count running containers
            count_result = subprocess.run(
                ["docker", "ps", "-q"],
                capture_output=True,
                text=True,
                timeout=5
            )
            container_count = len([line for line in count_result.stdout.strip().split('\n') if line])
            
            return {
                "running": True,
                "runtime": "Docker " + result.stdout.strip(),
                "containers_count": container_count
            }
        return {"running": False, "runtime": "Unknown", "containers_count": 0}
    except Exception as e:
        return {"running": False, "runtime": "Unknown", "error": str(e), "containers_count": 0}

@app.get("/api/docker/containers")
def docker_containers() -> Dict[str, Any]:
    """List running Docker containers (deprecated - use /api/docker/containers/all)."""
    return docker_containers_all()

@app.get("/api/docker/containers/all")
def docker_containers_all() -> Dict[str, Any]:
    """List all Docker containers (running, paused, and stopped)."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}|{{.Ports}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            containers = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                parts = line.split('|')
                if len(parts) >= 5:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "image": parts[2],
                        "state": parts[3].lower(),
                        "status": parts[4],
                        "ports": parts[5] if len(parts) > 5 else ""
                    })
            return {"containers": containers}
        return {"containers": [], "error": "Failed to list containers"}
    except Exception as e:
        return {"containers": [], "error": str(e)}

@app.get("/api/docker/redis/ping")
def docker_redis_ping() -> Dict[str, Any]:
    """Ping Redis via docker exec."""
    import subprocess
    try:
        # Find redis container
        find_result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return {"success": False, "error": "Redis container not found"}
        
        container_name = find_result.stdout.strip().split('\n')[0]
        
        # Ping redis
        ping_result = subprocess.run(
            ["docker", "exec", container_name, "redis-cli", "ping"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        return {
            "success": ping_result.returncode == 0 and "PONG" in ping_result.stdout,
            "response": ping_result.stdout.strip()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/infra/up")
def docker_infra_up() -> Dict[str, Any]:
    """Start infrastructure services."""
    import subprocess
    try:
        result = subprocess.run(
            ["bash", str(ROOT / "scripts" / "up.sh")],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(ROOT)
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/infra/down")
def docker_infra_down() -> Dict[str, Any]:
    """Stop infrastructure services."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "compose", "down"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(ROOT / "infra")
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# =============================
# Container Control API
# =============================

@app.post("/api/docker/container/{container_id}/pause")
def docker_container_pause(container_id: str) -> Dict[str, Any]:
    """Pause a running container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "pause", container_id],
            capture_output=True,
            text=True,
            timeout=10
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/container/{container_id}/unpause")
def docker_container_unpause(container_id: str) -> Dict[str, Any]:
    """Unpause a paused container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "unpause", container_id],
            capture_output=True,
            text=True,
            timeout=10
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/container/{container_id}/stop")
def docker_container_stop(container_id: str) -> Dict[str, Any]:
    """Stop a running container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "stop", container_id],
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/container/{container_id}/start")
def docker_container_start(container_id: str) -> Dict[str, Any]:
    """Start a stopped container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "start", container_id],
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/docker/container/{container_id}/remove")
def docker_container_remove(container_id: str) -> Dict[str, Any]:
    """Remove a stopped container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "rm", "-f", container_id],
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/docker/container/{container_id}/logs")
def docker_container_logs(container_id: str, tail: int = 100, timestamps: bool = True) -> Dict[str, Any]:
    """Get container logs with optional tail count and timestamps."""
    import subprocess
    try:
        cmd = ["docker", "logs", "--tail", str(tail)]
        if timestamps:
            cmd.append("--timestamps")
        cmd.append(container_id)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "logs": result.stdout + result.stderr,
            "error": None if result.returncode == 0 else "Failed to get logs"
        }
    except Exception as e:
        return {"success": False, "logs": "", "error": str(e)}
