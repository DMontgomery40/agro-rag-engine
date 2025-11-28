import os
from fastapi import APIRouter
from server.services.config_registry import get_config_registry
from .learning_reranker import get_reranker, get_reranker_info
from retrieval.rerank import get_rerank_config_info

router = APIRouter()
_config_registry = get_config_registry()

@router.get("/api/reranker/info")
def reranker_info():
    # trigger lazy load / hot-reload check if needed
    get_reranker()
    lr_info = get_reranker_info()
    rr_info = get_rerank_config_info()

    # Backward-compatible top-level fields for UI display
    merged = {
        "enabled": rr_info.get("enabled", lr_info.get("enabled", False)),
        "path": lr_info.get("path") or rr_info.get("model_path"),
        "resolved_path": rr_info.get("model_path"),
        "device": lr_info.get("device"),
        "alpha": rr_info.get("alpha", lr_info.get("alpha")),
        "topn": rr_info.get("topn", lr_info.get("topn")),
        "batch": rr_info.get("batch", lr_info.get("batch")),
        "maxlen": rr_info.get("maxlen", lr_info.get("maxlen")),
        "backend": rr_info.get("backend"),
        "provider": rr_info.get("provider"),
        "cloud_model": rr_info.get("cloud_model"),
        "snippet_chars": rr_info.get("snippet_chars"),
        "trust_remote_code": rr_info.get("trust_remote_code"),
        "cohere_model": rr_info.get("cohere_model"),
        "voyage_model": rr_info.get("voyage_model"),
    }

    return {
        **merged,
        "learning_reranker": lr_info,
        "rerank_config": rr_info,
    }

@router.get("/api/reranker/available")
def reranker_available_options():
    """
    Returns list of available reranker options based on user's .env configuration.
    Used by the GUI to populate the Run Eval dropdown dynamically.
    """
    options = []

    cfg = _config_registry

    # Check if local cross-encoder is enabled
    agro_reranker_enabled = cfg.get_int("AGRO_RERANKER_ENABLED", 0) == 1
    agro_model_path = cfg.get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")

    if agro_reranker_enabled:
        options.append({
            "id": "cross-encoder",
            "label": "⚙️ Cross-Encoder (Local)",
            "description": f"Local model: {agro_model_path}",
            "backend": "local"
        })

    # Check if Cohere API key is set
    cohere_api_key = os.getenv("COHERE_API_KEY", "")  # secret stays in env
    cohere_model = cfg.get_str("COHERE_RERANK_MODEL", "rerank-3.5")

    if cohere_api_key and cohere_api_key.strip():
        options.append({
            "id": "cohere",
            "label": "☁️ Cohere Reranker",
            "description": f"Cloud model: {cohere_model}",
            "backend": "cohere"
        })

    # Only include "no reranking" if user has multiple rerankers (for comparison)
    # If they only have one, don't confuse them with a "none" option
    if len(options) > 1:
        options.append({
            "id": "none",
            "label": "🚫 None (Skip Reranking)",
            "description": "Evaluate without reranking - raw retrieval scores only",
            "backend": "none"
        })

    return {"options": options, "count": len(options)}
