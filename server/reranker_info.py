import os
from fastapi import APIRouter
from server.services.config_registry import get_config_registry
from .learning_reranker import get_reranker, get_reranker_info
from retrieval.rerank import get_rerank_config_info

router = APIRouter()
_config_registry = get_config_registry()

@router.get("/api/reranker/info")
def reranker_info():
    get_reranker()
    lr_info = get_reranker_info()
    rr_info = get_rerank_config_info()
    
    mode = rr_info.get("reranker_mode", "none")
    
    # Base fields always included
    result = {
        "reranker_mode": mode,
    }
    
    # Mode-specific fields - only return what's relevant
    if mode == "cloud":
        result.update({
            "reranker_cloud_provider": rr_info.get("reranker_cloud_provider"),
            "reranker_cloud_model": rr_info.get("reranker_cloud_model"),
            "topn": rr_info.get("topn"),
            "timeout": rr_info.get("timeout"),
        })
    elif mode == "local":
        result.update({
            "reranker_local_model": rr_info.get("reranker_local_model"),
            "device": lr_info.get("device"),  # Device only for local/learning
            "topn": rr_info.get("topn"),
            "snippet_chars": rr_info.get("snippet_chars"),
            "trust_remote_code": rr_info.get("trust_remote_code"),
        })
    elif mode == "learning":
        result.update({
            "path": lr_info.get("path") or rr_info.get("model_path"),
            "resolved_path": lr_info.get("resolved_path"),
            "device": lr_info.get("device"),
            "alpha": rr_info.get("alpha", lr_info.get("alpha")),
            "topn": rr_info.get("topn", lr_info.get("topn")),
            "batch": rr_info.get("batch", lr_info.get("batch")),
            "maxlen": rr_info.get("maxlen", lr_info.get("maxlen")),
            "snippet_chars": rr_info.get("snippet_chars"),
        })
    # mode == "none" - just return reranker_mode, nothing else needed
    
    # Always include learning_reranker and rerank_config for debugging
    result["learning_reranker"] = lr_info
    result["rerank_config"] = rr_info
    
    return result

@router.get("/api/reranker/available")
def reranker_available_options():
    """Returns available reranker options for GUI dropdown."""
    options = []
    cfg = _config_registry

    # Local model
    local_model_path = cfg.get_str("RERANKER_LOCAL_MODEL", "")
    if local_model_path and os.path.exists(local_model_path):
        options.append({
            "id": "local",
            "label": "⚙️ Local Model",
            "description": f"Model: {local_model_path}",
            "reranker_mode": "local"
        })

    # Learning model (AGRO cross-encoder)
    learning_path = cfg.get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")
    if os.path.exists(learning_path):
        options.append({
            "id": "learning",
            "label": "🧠 AGRO Cross-Encoder",
            "description": "Self-learning reranker",
            "reranker_mode": "learning"
        })

    # Cloud: Cohere
    if os.getenv("COHERE_API_KEY", "").strip():
        cloud_model = cfg.get_str("RERANKER_CLOUD_MODEL", "rerank-3.5")
        options.append({
            "id": "cohere",
            "label": "☁️ Cohere",
            "description": f"Cloud: {cloud_model}",
            "reranker_mode": "cloud",
            "reranker_cloud_provider": "cohere"
        })

    # Cloud: Voyage
    if os.getenv("VOYAGE_API_KEY", "").strip():
        options.append({
            "id": "voyage",
            "label": "☁️ Voyage",
            "description": "Voyage AI",
            "reranker_mode": "cloud",
            "reranker_cloud_provider": "voyage"
        })

    # Cloud: Jina
    if os.getenv("JINA_API_KEY", "").strip():
        options.append({
            "id": "jina",
            "label": "☁️ Jina",
            "description": "Jina AI",
            "reranker_mode": "cloud",
            "reranker_cloud_provider": "jina"
        })

    # None
    options.append({
        "id": "none",
        "label": "🚫 None",
        "description": "Skip reranking",
        "reranker_mode": "none"
    })

    return {"options": options, "count": len(options)}