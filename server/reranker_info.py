import os
from fastapi import APIRouter
from .learning_reranker import get_reranker, get_reranker_info

router = APIRouter()

@router.get("/api/reranker/info")
def reranker_info():
    # trigger lazy load / hot-reload check if needed
    get_reranker()
    return get_reranker_info()

@router.get("/api/reranker/available")
def reranker_available_options():
    """
    Returns list of available reranker options based on user's .env configuration.
    Used by the GUI to populate the Run Eval dropdown dynamically.
    """
    options = []

    # Check if local cross-encoder is enabled
    agro_reranker_enabled = os.getenv("AGRO_RERANKER_ENABLED", "0") == "1"
    agro_model_path = os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")

    if agro_reranker_enabled:
        options.append({
            "id": "cross-encoder",
            "label": "⚙️ Cross-Encoder (Local)",
            "description": f"Local model: {agro_model_path}",
            "backend": "local"
        })

    # Check if Cohere API key is set
    cohere_api_key = os.getenv("COHERE_API_KEY", "")
    cohere_model = os.getenv("COHERE_RERANK_MODEL", "rerank-3.5")

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
