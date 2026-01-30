"""Provider-specific token limits from models.json.

Reads limits from existing models.json - NO HARDCODING!
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("agro.provider_limits")

_MODELS_CACHE: Optional[Dict] = None


def _load_models_json() -> Dict:
    """Load models.json once and cache it."""
    global _MODELS_CACHE
    if _MODELS_CACHE is not None:
        return _MODELS_CACHE

    # Try multiple possible locations
    possible_paths = [
        Path(__file__).parent.parent / "web" / "public" / "models.json",
        Path("/app/web/public/models.json"),  # Docker path
    ]

    for path in possible_paths:
        if path.exists():
            try:
                with open(path, 'r') as f:
                    _MODELS_CACHE = json.load(f)
                    logger.info(f"Loaded models.json from {path}")
                    return _MODELS_CACHE
            except Exception as e:
                logger.error(f"Failed to load {path}: {e}")

    logger.error("Could not find models.json in any expected location")
    _MODELS_CACHE = {"models": []}
    return _MODELS_CACHE


def get_provider_limits(provider: str, model: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Get token limits for provider/model from models.json with config overrides.

    Args:
        provider: Provider name (openai, voyage, cohere, local)
        model: Model name
        config: User config from agro_config.json with optional overrides:
                - embedding_max_tokens: Override max tokens
                - embedding_batch_size: Override batch size
                - embedding_dim: Override dimensions

    Returns:
        Dict with max_tokens, batch_size, dimensions

    Priority:
        1. User config (agro_config.json) - highest priority
        2. models.json data
        3. Fallback defaults (only if models.json unavailable)
    """
    provider = provider.lower()

    # Start with safe fallback (only used if models.json missing)
    limits = {
        "max_tokens": 8000,
        "batch_size": 64,
        "dimensions": 1024,
    }

    # Load from models.json
    models_data = _load_models_json()

    # Find matching model in models.json
    for model_entry in models_data.get("models", []):
        if (model_entry.get("provider", "").lower() == provider and
            model_entry.get("model", "") == model and
            "EMB" in model_entry.get("components", [])):

            # Extract dimensions if available
            if "dimensions" in model_entry:
                limits["dimensions"] = model_entry["dimensions"]

            # For embeddings, use context as token limit if available
            if "context" in model_entry:
                # Use 90% of context as safe limit
                limits["max_tokens"] = int(model_entry["context"] * 0.9)

            # Reasonable batch sizes based on typical provider limits
            if provider == "openai":
                limits["batch_size"] = 64
            elif provider == "voyage":
                limits["batch_size"] = 128
            elif provider == "cohere":
                limits["batch_size"] = 96
            elif provider == "local":
                limits["batch_size"] = 32

            break

    # Apply user config overrides (highest priority)
    if config.get("embedding_max_tokens"):
        limits["max_tokens"] = config["embedding_max_tokens"]
        logger.info(f"Using user-configured max_tokens: {limits['max_tokens']}")
    if config.get("embedding_batch_size"):
        limits["batch_size"] = config["embedding_batch_size"]
        logger.info(f"Using user-configured batch_size: {limits['batch_size']}")
    if config.get("embedding_dim"):
        limits["dimensions"] = config["embedding_dim"]

    logger.info(
        f"Token limits for {provider}/{model}: "
        f"{limits['max_tokens']} tokens/request, "
        f"batch_size={limits['batch_size']}, "
        f"dimensions={limits['dimensions']}"
    )

    return limits
