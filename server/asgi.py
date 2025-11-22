import os
import subprocess
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from common.paths import repo_root, gui_dir, docs_dir, files_root
from common.config_loader import load_repos
from server.api_interceptor import setup_interceptor
from server.frequency_limiter import FrequencyAnomalyMiddleware
from server.metrics import init_metrics_fastapi
from server.services.config_registry import get_config_registry
import logging
import uuid
from server.feedback import router as feedback_router
from server.alerts import router as alerts_router, monitoring_router
from server.routers.pipeline import router as pipeline_router
from server.routers.traces import router as traces_router
from server.routers.repos import router as repos_router
from server.routers.config import router as config_router
from server.routers.editor import router as editor_router
from server.routers.search import router as search_router
from server.routers.keywords import router as keywords_router
from server.routers.indexing import router as indexing_router
from server.routers.docker import router as docker_router
from server.routers.reranker_learning import router as reranker_learning_router
from server.routers.onboarding import router as onboarding_router
from server.routers.golden import router as golden_router
from server.routers.eval import router as eval_router
from server.routers.cost import router as cost_router
from server.routers.cards import router as cards_router
from server.routers.profiles import router as profiles_router
from server.routers.autotune import router as autotune_router
from server.routers.git_ops import router as git_ops_router
from server.routers.hardware import router as hardware_router
from server.routers.observability import router as observability_router
from server.routers.reranker_ops import router as reranker_ops_router
from server.routers.mcp_ops import router as mcp_ops_router
from server.routers.chat import router as chat_router

# Module-level config registry cache
_config_registry = get_config_registry()


def create_app() -> FastAPI:
    """Application factory for FastAPI app.

    - Installs HTTP interceptor, metrics, and frequency limiter middleware
    - Mounts static content: /gui, /docs, /files, and /web when built
    - Includes existing routers: feedback, reranker info, alerts, monitoring
    - Provides minimal core routes to preserve compatibility
    """
    # Interceptor must be installed before any libraries that might import requests
    setup_interceptor()

    app = FastAPI(title="AGRO RAG + GUI")

    # CORS (dev-friendly defaults; configurable via env/registry)
    try:
        raw_origins = _config_registry.get_str("CORS_ALLOW_ORIGINS", "")
    except Exception:
        raw_origins = ""
    try:
        origin_regex = _config_registry.get_str("CORS_ALLOW_ORIGIN_REGEX", "")
    except Exception:
        origin_regex = ""
    allow_origins = [o.strip() for o in (raw_origins or "").split(",") if o.strip()]

    # Sensible default for dev: allow localhost/127.0.0.1 on any port
    if not allow_origins and not origin_regex:
        origin_regex = r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$"

    cors_kwargs = dict(
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    if origin_regex:
        cors_kwargs["allow_origin_regex"] = origin_regex
    else:
        cors_kwargs["allow_origins"] = allow_origins

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    # Metrics + middleware (add after CORS so preflight is handled first)
    init_metrics_fastapi(app)
    app.add_middleware(FrequencyAnomalyMiddleware)

    # Request ID + global exception JSON handler
    REQUEST_ID_HEADER = "X-Request-ID"

    @app.middleware("http")
    async def assign_request_id(request: Request, call_next):  # type: ignore[unused-ignore]
        req_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        try:
            response = await call_next(request)
        except HTTPException as he:
            # Let FastAPI handle HTTPExceptions
            raise he
        except Exception:
            logging.getLogger("agro.api").exception("Unhandled exception | request_id=%s", req_id)
            return JSONResponse({"error": "Internal Server Error", "request_id": req_id}, status_code=500)
        # Always attach the request id
        try:
            response.headers[REQUEST_ID_HEADER] = req_id
        except Exception:
            pass
        return response

    # Tracing middleware: start/end trace around /answer and /api/chat
    @app.middleware("http")
    async def tracing_middleware(request: Request, call_next):  # type: ignore[unused-ignore]
        try:
            # Config gate and sampling
            enabled = _config_registry.get_int("TRACING_ENABLED", 1)
            if not enabled:
                return await call_next(request)
            try:
                rate = float(_config_registry.get_float("TRACE_SAMPLING_RATE", 1.0))
            except Exception:
                rate = 1.0
            if rate < 1.0:
                import random as _rand
                if _rand.random() > max(0.0, min(1.0, rate)):
                    return await call_next(request)

            path = request.url.path or ""
            if path not in {"/answer", "/api/chat"}:
                return await call_next(request)

            # Import lazily to avoid cycles at import time
            try:
                from server.tracing import start_trace, end_trace
            except Exception:
                return await call_next(request)

            repo = _config_registry.get_str("REPO", "agro")
            question = ""

            if path == "/answer":
                try:
                    question = request.query_params.get("q") or ""
                    repo = request.query_params.get("repo") or repo
                except Exception:
                    pass
                try:
                    start_trace(repo=repo, question=question)
                except Exception:
                    pass
                try:
                    response = await call_next(request)
                finally:
                    try:
                        end_trace()
                    except Exception:
                        pass
                return response

            # /api/chat: we need to read and re-inject the body for downstream
            try:
                body = await request.body()
                import json as _json
                try:
                    data = _json.loads(body.decode("utf-8")) if body else {}
                except Exception:
                    data = {}
                question = str(data.get("question") or "")
                repo = str(data.get("repo") or repo)

                # Create a fresh receive channel that returns the original body once
                async def _receive_once(has=[False]):  # type: ignore[arg-type]
                    if has[0]:
                        return {"type": "http.request", "body": b"", "more_body": False}
                    has[0] = True
                    return {"type": "http.request", "body": body, "more_body": False}

                from starlette.requests import Request as _Req
                new_request = _Req(request.scope, _receive_once)
            except Exception:
                new_request = request

            try:
                start_trace(repo=repo, question=question)
            except Exception:
                pass

            try:
                response = await call_next(new_request)
            finally:
                try:
                    end_trace()
                except Exception:
                    pass
            return response
        except Exception:
            # Never let tracing break requests
            return await call_next(request)

    ROOT = repo_root()
    GUI_DIR = gui_dir()
    DOCS_DIR = docs_dir()
    WEB_DIST = ROOT / "web" / "dist"

    # Static mounts
    if GUI_DIR.exists():
        app.mount("/gui", StaticFiles(directory=str(GUI_DIR), html=True), name="gui")
    if WEB_DIST.exists():
        from fastapi import APIRouter
        web_router = APIRouter()

        @web_router.get("/", include_in_schema=False)
        def web_index():  # type: ignore[unused-ignore]
            idx = WEB_DIST / "index.html"
            if idx.exists():
                resp = FileResponse(str(idx))
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                resp.headers["Pragma"] = "no-cache"
                resp.headers["Expires"] = "0"
                return resp
            return JSONResponse({"error": "Web UI not built"}, status_code=404)

        @web_router.get("/assets/{path:path}", include_in_schema=False)
        def web_assets_proxy(path: str):  # type: ignore[unused-ignore]
            p = WEB_DIST / "assets" / path
            if p.is_file():
                return FileResponse(str(p))
            return JSONResponse({"error": "Asset not found"}, status_code=404)

        # Catch-all fallback to index.html for SPA routes
        @web_router.get("/{rest_of_path:path}", include_in_schema=False)
        def web_spa_router_catchall(rest_of_path: str):  # type: ignore[unused-ignore]
            return web_index()

        app.include_router(web_router, prefix="/web")
        # SPA fallback for nested routes under /web
        @app.get("/web/{rest_of_path:path}", include_in_schema=False)
        def web_spa(rest_of_path: str):  # type: ignore[unused-ignore]
            p = WEB_DIST / rest_of_path
            if p.is_file():
                return FileResponse(str(p))
            idx = WEB_DIST / "index.html"
            if idx.exists():
                resp = FileResponse(str(idx))
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                resp.headers["Pragma"] = "no-cache"
                resp.headers["Expires"] = "0"
                return resp
            return JSONResponse({"error": "Web UI not built"}, status_code=404)
    if DOCS_DIR.exists():
        app.mount("/docs", StaticFiles(directory=str(DOCS_DIR), html=True), name="docs")
    app.mount("/files", StaticFiles(directory=str(files_root()), html=True), name="files")

    # Core index + health
    @app.get("/", include_in_schema=False)
    def index():  # type: ignore[unused-ignore]
        # Optional cutover to /web
        if os.getenv("GUI_CUTOVER", "0").strip().lower() in {"1", "true", "yes", "on"} and WEB_DIST.exists():
            return RedirectResponse(url="/web")
        idx = GUI_DIR / "index.html"
        if idx.exists():
            resp = FileResponse(str(idx))
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
            return resp
        if DOCS_DIR.exists():
            return RedirectResponse(url="/docs")
        return JSONResponse({"error": "No GUI available"}, status_code=404)

    @app.get("/health")
    def health():  # type: ignore[unused-ignore]
        return {"status": "healthy", "ts": __import__('datetime').datetime.now().isoformat()}

    @app.get("/api/health")
    def api_health():  # type: ignore[unused-ignore]
        return health()

    # Include extracted routers (initial slice)
    app.include_router(pipeline_router)
    app.include_router(search_router)
    app.include_router(keywords_router)
    app.include_router(indexing_router)
    app.include_router(docker_router)
    app.include_router(reranker_learning_router)
    
    # Include new routers (formerly orphaned in app.py)
    app.include_router(onboarding_router)
    app.include_router(golden_router)
    app.include_router(eval_router)
    app.include_router(cost_router)
    app.include_router(cards_router)
    app.include_router(profiles_router)
    app.include_router(autotune_router)
    app.include_router(git_ops_router)
    app.include_router(hardware_router)
    app.include_router(observability_router)
    app.include_router(reranker_ops_router)
    app.include_router(mcp_ops_router)
    app.include_router(chat_router)

    # Include existing routers
    app.include_router(feedback_router)
    # Reranker info is optional; avoid hard import to keep core paths light
    try:
        from server.reranker_info import router as reranker_info_router  # type: ignore
        app.include_router(reranker_info_router)
    except Exception:
        pass
    app.include_router(alerts_router)
    app.include_router(monitoring_router)
    app.include_router(traces_router)
    app.include_router(repos_router)
    app.include_router(config_router)
    app.include_router(editor_router)


    # ---------------- Pipeline Summary API ----------------
    @app.get("/api/pipeline/summary")
    def pipeline_summary() -> Dict[str, Any]:  # type: ignore[unused-ignore]
        import socket
        import requests

        repo_cfg = load_repos()
        repo_name = os.getenv("REPO") or repo_cfg.get("default_repo") or "local"
        repo_mode = "repo" if repo_name and repo_name != "local" else "local"

        branch = os.getenv("GIT_BRANCH") or None
        if not branch:
            try:
                out = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=str(ROOT))
                branch = out.decode().strip()
            except Exception:
                branch = None

        skip_dense = _config_registry.get_bool("SKIP_DENSE", False)
        retrieval_mode = "bm25" if skip_dense else "hybrid"

        # Get top_k with fallback chain
        top_k = _config_registry.get_int("FINAL_K", 10)
        if top_k == 10:  # Check if we got the default
            top_k = _config_registry.get_int("LANGGRAPH_FINAL_K", 10)

        rr_enabled = _config_registry.get_bool("AGRO_RERANKER_ENABLED", False)
        rr_backend = _config_registry.get_str("RERANKER_BACKEND", "").strip().lower() or None
        rr_provider = None
        rr_model = None
        if rr_backend:
            if rr_backend in {"cohere", "voyage"}:
                rr_provider = rr_backend
                rr_model = _config_registry.get_str("COHERE_RERANK_MODEL", "") if rr_backend == "cohere" else _config_registry.get_str("VOYAGE_RERANK_MODEL", "")
            elif rr_backend in {"hf", "local"}:
                rr_provider = rr_backend
                rr_model = _config_registry.get_str("RERANKER_MODEL", "")
            elif rr_backend == "learning":
                rr_provider = "learning"
                rr_model = os.getenv("AGRO_LEARNING_RERANKER_MODEL", "cross-encoder-agro")

        enrich_enabled = _config_registry.get_bool("ENRICH_CODE_CHUNKS", False)
        enrich_backend = _config_registry.get_str("ENRICH_BACKEND", "").strip().lower() or None
        enrich_model = _config_registry.get_str("ENRICH_MODEL", "")

        gen_model = _config_registry.get_str("GEN_MODEL", "") or _config_registry.get_str("ENRICH_MODEL", "") or None
        gen_provider = None
        if gen_model:
            ml = gen_model.lower()
            if "gpt-" in ml:
                gen_provider = "openai"
            elif ":" in gen_model:
                gen_provider = "ollama"
            elif "mlx-" in ml or "mlx" in ml:
                gen_provider = "mlx"

        def _qdrant_health() -> str:
            base = _config_registry.get_str("QDRANT_URL", "http://127.0.0.1:6333").rstrip("/")
            url = f"{base}/collections"
            try:
                r = requests.get(url, timeout=1.5)
                return "ok" if r.status_code == 200 else "fail"
            except Exception:
                return "fail"

        def _redis_health() -> str:
            u = os.getenv("REDIS_URL") or ""
            try:
                if u.startswith("redis://"):
                    host_port = u.split("redis://", 1)[1].split("/", 1)[0]
                    host, port = host_port.split(":", 1)
                    with socket.create_connection((host, int(port)), timeout=1.0):
                        return "ok"
            except Exception:
                return "fail"
            return "unknown"

        def _llm_health() -> str:
            base = (os.getenv("OLLAMA_URL") or "").rstrip("/")
            if base:
                try:
                    r = requests.get(f"{base}/api/tags", timeout=1.5)
                    return "ok" if r.status_code == 200 else "fail"
                except Exception:
                    return "fail"
            return "unknown"

        try:
            return {
                "repo": {"name": repo_name, "mode": repo_mode, "branch": branch},
                "retrieval": {"mode": retrieval_mode, "top_k": top_k},
                "reranker": {"enabled": rr_enabled, "backend": rr_backend, "provider": rr_provider, "model": rr_model},
                "enrichment": {"enabled": enrich_enabled, "backend": enrich_backend, "model": enrich_model},
                "generation": {"provider": gen_provider, "model": gen_model},
                "health": {"qdrant": _qdrant_health(), "redis": _redis_health(), "llm": _llm_health()},
            }
        except Exception as e:
            logging.getLogger("agro.api").warning("pipeline_summary failed: %s", e)
            # Return a safe minimal structure rather than 500 to keep UI healthy
            return {
                "repo": {"name": repo_name or "local", "mode": repo_mode or "local", "branch": branch},
                "retrieval": {"mode": retrieval_mode or "hybrid", "top_k": top_k if isinstance(top_k, int) else 10},
                "reranker": {"enabled": bool(rr_enabled), "backend": rr_backend or None, "provider": rr_provider or None, "model": rr_model},
                "enrichment": {"enabled": bool(enrich_enabled), "backend": enrich_backend or None, "model": enrich_model or None},
                "generation": {"provider": gen_provider or None, "model": gen_model or None},
                "health": {"qdrant": "unknown", "redis": "unknown", "llm": "unknown"},
            }

    # Startup event: Load config registry
    @app.on_event("startup")
    async def startup_event():
        """Load configuration registry at application startup."""
        try:
            from server.services.config_registry import get_config_registry
            registry = get_config_registry()
            registry.load()
            logging.getLogger("agro.api").info("Config registry loaded successfully")
        except Exception as e:
            # Log error but don't fail startup - config registry should be resilient
            logging.getLogger("agro.api").error(f"Failed to load config registry: {e}")

    return app
