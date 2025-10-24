import os
import subprocess
import json
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from common.paths import repo_root, gui_dir, docs_dir, files_root
from common.config_loader import load_repos
from server.api_interceptor import setup_interceptor
from server.frequency_limiter import FrequencyAnomalyMiddleware
from server.metrics import init_metrics_fastapi
import logging, uuid
from server.feedback import router as feedback_router
from server.reranker_info import router as reranker_info_router
from server.alerts import router as alerts_router, monitoring_router
from server.routers.pipeline import router as pipeline_router
from server.routers.traces import router as traces_router
from server.routers.repos import router as repos_router
from server.routers.config import router as config_router
from server.routers.editor import router as editor_router
from server.routers.search import router as search_router
from server.routers.keywords import router as keywords_router
from server.routers.indexing import router as indexing_router


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

    # Metrics + middleware
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

    ROOT = repo_root()
    GUI_DIR = gui_dir()
    DOCS_DIR = docs_dir()
    WEB_DIST = ROOT / "web" / "dist"

    # Static mounts
    if GUI_DIR.exists():
        app.mount("/gui", StaticFiles(directory=str(GUI_DIR), html=True), name="gui")
    if WEB_DIST.exists():
        app.mount("/web", StaticFiles(directory=str(WEB_DIST), html=True), name="web")
        @app.get("/web/config", include_in_schema=False)
        @app.get("/web/search", include_in_schema=False)
        def web_spa_top():  # type: ignore[unused-ignore]
            idx = WEB_DIST / "index.html"
            if idx.exists():
                resp = FileResponse(str(idx))
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                resp.headers["Pragma"] = "no-cache"
                resp.headers["Expires"] = "0"
                return resp
            return JSONResponse({"error": "Web UI not built"}, status_code=404)
        # SPA fallback for nested routes under /web
        @app.get("/web/{rest_of_path:path}", include_in_schema=False)
        def web_spa(rest_of_path: str):  # type: ignore[unused-ignore]
            # Serve asset files directly if present
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
    app.include_router(config_router)
    app.include_router(pipeline_router)
    app.include_router(search_router)
    app.include_router(keywords_router)
    app.include_router(indexing_router)


    # ---------------- Pipeline Summary API ----------------
    @app.get("/api/pipeline/summary")
    def pipeline_summary() -> Dict[str, Any]:  # type: ignore[unused-ignore]
        import socket
        import requests

        def _bool_env(name: str, default: str = "0") -> bool:
            v = (os.getenv(name, default) or default).strip().lower()
            return v in {"1", "true", "yes", "on"}

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

        if (os.getenv("SKIP_DENSE", "0") or "0").strip() == "1":
            retrieval_mode = "bm25"
        else:
            retrieval_mode = "hybrid"
        top_k = int(os.getenv("FINAL_K", os.getenv("LANGGRAPH_FINAL_K", "10") or 10))

        rr_enabled = _bool_env("AGRO_RERANKER_ENABLED", "0")
        rr_backend = (os.getenv("RERANK_BACKEND", "").strip().lower() or None)
        rr_provider = None
        rr_model = None
        if rr_backend:
            if rr_backend in {"cohere", "voyage"}:
                rr_provider = rr_backend
                rr_model = os.getenv("COHERE_RERANK_MODEL") if rr_backend == "cohere" else os.getenv("VOYAGE_RERANK_MODEL")
            elif rr_backend in {"hf", "local"}:
                rr_provider = rr_backend
                rr_model = os.getenv("RERANK_MODEL") or os.getenv("BAAI_RERANK_MODEL")
            elif rr_backend == "learning":
                rr_provider = "learning"
                rr_model = os.getenv("AGRO_LEARNING_RERANKER_MODEL", "cross-encoder-agro")

        enrich_enabled = _bool_env("ENRICH_CODE_CHUNKS", "0")
        enrich_backend = (os.getenv("ENRICH_BACKEND", "").strip().lower() or None)
        enrich_model = os.getenv("ENRICH_MODEL") or os.getenv("ENRICH_MODEL_OLLAMA")

        gen_model = os.getenv("GEN_MODEL") or os.getenv("ENRICH_MODEL") or None
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
            base = (os.getenv("QDRANT_URL") or "").rstrip("/") or "http://127.0.0.1:6333"
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
                    with __import__('socket').create_connection((host, int(port)), timeout=1.0):
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

        return {
            "repo": {"name": repo_name, "mode": repo_mode, "branch": branch},
            "retrieval": {"mode": retrieval_mode, "top_k": top_k},
            "reranker": {"enabled": rr_enabled, "backend": rr_backend, "provider": rr_provider, "model": rr_model},
            "enrichment": {"enabled": enrich_enabled, "backend": enrich_backend, "model": enrich_model},
            "generation": {"provider": gen_provider, "model": gen_model},
            "health": {"qdrant": _qdrant_health(), "redis": _redis_health(), "llm": _llm_health()},
        }

    # Include existing routers
    app.include_router(feedback_router)
    app.include_router(reranker_info_router)
    app.include_router(alerts_router)
    app.include_router(monitoring_router)
    app.include_router(traces_router)
    app.include_router(repos_router)
    app.include_router(config_router)
    app.include_router(editor_router)

    return app
