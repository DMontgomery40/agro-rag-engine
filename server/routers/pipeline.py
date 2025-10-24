from typing import Any, Dict
import os
import socket
import subprocess

import requests
from fastapi import APIRouter

from common.config_loader import load_repos
from common.paths import repo_root


router = APIRouter()


@router.get("/api/pipeline/summary")
def pipeline_summary() -> Dict[str, Any]:
    """Return a concise snapshot of the active pipeline configuration and health."""
    ROOT = repo_root()
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

    # Retrieval heuristic
    retrieval_mode = "bm25" if (os.getenv("SKIP_DENSE", "0").strip() == "1") else "hybrid"
    top_k = int(os.getenv("FINAL_K", os.getenv("LANGGRAPH_FINAL_K", "10") or 10))

    # Reranker
    rr_enabled = (os.getenv("AGRO_RERANKER_ENABLED", "0").lower() in {"1","true","yes","on"})
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

    # Enrichment
    enrich_enabled = (os.getenv("ENRICH_CODE_CHUNKS", "0").lower() in {"1","true","yes","on"})
    enrich_backend = (os.getenv("ENRICH_BACKEND", "").strip().lower() or None)
    enrich_model = os.getenv("ENRICH_MODEL") or os.getenv("ENRICH_MODEL_OLLAMA")

    # Generation
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

    # Health checks
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

    return {
        "repo": {"name": repo_name, "mode": repo_mode, "branch": branch},
        "retrieval": {"mode": retrieval_mode, "top_k": top_k},
        "reranker": {"enabled": rr_enabled, "backend": rr_backend, "provider": rr_provider, "model": rr_model},
        "enrichment": {"enabled": enrich_enabled, "backend": enrich_backend, "model": enrich_model},
        "generation": {"provider": gen_provider, "model": gen_model},
        "health": {"qdrant": _qdrant_health(), "redis": _redis_health(), "llm": _llm_health()},
    }

