from typing import Any, Dict
import os
import socket
import subprocess

import requests
from fastapi import APIRouter

from common.config_loader import _load_repos_raw
from common.paths import repo_root
from server.services.config_registry import get_config_registry


router = APIRouter()

# Module-level config cache
_config_registry = get_config_registry()


@router.get("/api/pipeline/summary")
def pipeline_summary() -> Dict[str, Any]:
    """Return a concise snapshot of the active pipeline configuration and health."""
    ROOT = repo_root()
    repo_cfg = _load_repos_raw()
    repo_name = _config_registry.get_str("REPO", repo_cfg.get("default_repo") or "local")
    repo_mode = "repo" if repo_name and repo_name != "local" else "local"

    branch = _config_registry.get_str("GIT_BRANCH", "")
    if not branch:
        try:
            out = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=str(ROOT))
            branch = out.decode().strip()
        except Exception:
            branch = None

    # Retrieval heuristic
    retrieval_mode = "bm25" if _config_registry.get_bool("SKIP_DENSE", False) else "hybrid"
    top_k = _config_registry.get_int("FINAL_K", _config_registry.get_int("LANGGRAPH_FINAL_K", 10))

    # Reranker - unified RERANKER_MODE schema
    rr_mode = _config_registry.get_str("RERANKER_MODE", "none").strip().lower()
    rr_provider = ""
    rr_model = ""
    
    if rr_mode == "cloud":
        rr_provider = _config_registry.get_str("RERANKER_CLOUD_PROVIDER", "").strip().lower()
        rr_model = _config_registry.get_str("RERANKER_CLOUD_MODEL", "")
    elif rr_mode == "local":
        rr_model = _config_registry.get_str("RERANKER_LOCAL_MODEL", "")
    elif rr_mode == "learning":
        rr_model = "cross-encoder-agro"

    # Enrichment
    enrich_enabled = _config_registry.get_bool("ENRICH_CODE_CHUNKS", False)
    enrich_backend = (_config_registry.get_str("ENRICH_BACKEND", "").strip().lower() or None)
    enrich_model = _config_registry.get_str("ENRICH_MODEL", "") or _config_registry.get_str("ENRICH_MODEL_OLLAMA", "")

    # Generation
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
        "reranker": {
            "reranker_mode": rr_mode,
            "reranker_cloud_provider": rr_provider,
            "reranker_cloud_model": rr_model if rr_mode == "cloud" else "",
            "reranker_local_model": rr_model if rr_mode in {"local", "learning"} else "",
        },
        "enrichment": {"enabled": enrich_enabled, "backend": enrich_backend, "model": enrich_model},
        "generation": {"provider": gen_provider, "model": gen_model},
        "health": {"qdrant": _qdrant_health(), "redis": _redis_health(), "llm": _llm_health()},
    }
