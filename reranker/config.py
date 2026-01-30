"""
Shared reranker configuration loader.

Configuration flows through Pydantic (agro_config.json -> config_registry):
- RERANKER_MODE: 'cloud' | 'local' | 'learning' | 'none'
- RERANKER_CLOUD_PROVIDER: 'cohere' | 'voyage' | 'jina' (when mode='cloud')
- RERANKER_CLOUD_MODEL: model name for cloud provider
- RERANKER_LOCAL_MODEL: path or HF identifier for local models
- AGRO_RERANKER_*: alpha, topN, batch, maxlen, etc.

API keys (secrets) remain in .env: COHERE_API_KEY, VOYAGE_API_KEY, etc.

The loader is read-only. Callers should update configuration via
agro_config.json and the GUI to remain ADA-compliant.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Optional

from common.paths import repo_root


@dataclass(frozen=True)
class RerankerSettings:
    enabled: bool
    mode: str  # 'cloud' | 'local' | 'learning' | 'none'
    provider: str  # 'cohere' | 'voyage' | 'jina' | '' (empty if not cloud)
    cloud_model: str  # model for whatever cloud provider is selected
    local_model: str  # local HuggingFace cross-encoder model
    local_model_dir: Optional[Path]
    hf_model_id: str
    alpha: float
    top_n_local: int
    top_n_cloud: int
    batch_size: int
    max_length: int
    snippet_chars: int
    cloud_api_key_present: bool
    reload_on_change: bool
    reload_period_sec: int
    source_env: Dict[str, str]

    @property
    def metrics_label(self) -> str:
        """Label for Prometheus/Grafana."""
        if self.mode == "cloud":
            return f"{self.provider}:{self.cloud_model}"
        if self.mode == "learning":
            return "learning:cross-encoder-agro"
        if self.local_model_dir is not None:
            return str(self.local_model_dir)
        return self.local_model or self.hf_model_id


def _resolve_local_model_path(path_value: str) -> Optional[Path]:
    """Resolve model directory relative to repo root if it exists."""
    if not path_value:
        return None
    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = repo_root() / candidate
    # Accept both directories and files (HF saves config.json etc.)
    if candidate.exists():
        return candidate
    return None


def _get_config_registry():
    """Get config registry singleton. Import here to avoid circular imports."""
    from server.services.config_registry import get_config_registry
    return get_config_registry()


def load_settings() -> RerankerSettings:
    """Load consolidated reranker settings from config registry (Pydantic).

    Config values come from agro_config.json via config_registry.
    API keys (secrets) come from .env via os.getenv - this is correct per rules.
    """
    registry = _get_config_registry()
    raw_env: Dict[str, str] = {}

    def _get_str(name: str, default: str = "") -> str:
        val = registry.get_str(name, default)
        raw_env[name] = val
        return val

    def _get_int(name: str, default: int) -> int:
        val = registry.get_int(name, default)
        raw_env[name] = str(val)
        return val

    def _get_float(name: str, default: float) -> float:
        val = registry.get_float(name, default)
        raw_env[name] = str(val)
        return val

    def _get_bool(name: str, default: bool) -> bool:
        val = registry.get_bool(name, default)
        raw_env[name] = "1" if val else "0"
        return val

    # Read RERANKER_MODE - single source of truth for reranker enable/disable
    # mode='none' means reranking disabled; no separate ENABLED boolean needed
    mode = _get_str("RERANKER_MODE", "").strip().lower()
    if not mode:
        raise ValueError(
            "RERANKER_MODE must be set to one of: 'cloud', 'local', 'learning', 'none'"
        )
    if mode not in {"cloud", "local", "learning", "none"}:
        raise ValueError(
            f"RERANKER_MODE='{mode}' is invalid. "
            f"Must be one of: 'cloud', 'local', 'learning', 'none'"
        )

    # Read provider and models from config registry
    provider = _get_str("RERANKER_CLOUD_PROVIDER", "").strip().lower()
    cloud_model = _get_str("RERANKER_CLOUD_MODEL", "").strip()
    local_model = _get_str("RERANKER_LOCAL_MODEL", "").strip()

    # Validate based on mode
    cloud_api_key_present = False

    if mode == "cloud":
        if not provider:
            raise ValueError(
                f"RERANKER_MODE='{mode}' requires RERANKER_CLOUD_PROVIDER to be set"
            )
        if not cloud_model:
            raise ValueError(
                f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
                f"requires RERANKER_CLOUD_MODEL to be set"
            )
        # API keys are SECRETS - correctly read from os.getenv (not config registry)
        api_key_env = f"{provider.upper()}_API_KEY"
        api_key = os.getenv(api_key_env, "")
        raw_env[api_key_env] = "[REDACTED]" if api_key else ""
        if not api_key.strip():
            raise ValueError(
                f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
                f"requires {api_key_env} environment variable to be set"
            )
        cloud_api_key_present = True

    elif mode == "local":
        if not local_model:
            raise ValueError(
                f"RERANKER_MODE='{mode}' requires RERANKER_LOCAL_MODEL to be set"
            )

    elif mode == "learning":
        # Learning mode uses AGRO cross encoder - get path from config
        local_model = _get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")

    # Resolve local model path for learning/local modes
    if mode in {"learning", "local"}:
        local_model_dir = _resolve_local_model_path(local_model)
    else:
        local_model_dir = None

    hf_model_id = local_model

    # All these come from config registry (Pydantic validated)
    alpha = _get_float("AGRO_RERANKER_ALPHA", 0.7)
    top_n_local = max(0, _get_int("AGRO_RERANKER_TOPN", 50))
    top_n_cloud = max(1, _get_int("RERANKER_CLOUD_TOP_N", 50))
    batch_size = max(1, _get_int("AGRO_RERANKER_BATCH", 16))
    max_length = max(1, _get_int("AGRO_RERANKER_MAXLEN", 512))
    snippet_chars = max(1, _get_int("RERANK_INPUT_SNIPPET_CHARS", 700))
    reload_on_change = _get_bool("AGRO_RERANKER_RELOAD_ON_CHANGE", False)
    reload_period_sec = max(1, _get_int("AGRO_RERANKER_RELOAD_PERIOD_SEC", 60))

    return RerankerSettings(
        enabled=mode != "none",
        mode=mode,
        provider=provider,
        cloud_model=cloud_model,
        local_model=local_model,
        local_model_dir=local_model_dir,
        hf_model_id=hf_model_id,
        alpha=alpha,
        top_n_local=top_n_local,
        top_n_cloud=top_n_cloud,
        batch_size=batch_size,
        max_length=max_length,
        snippet_chars=snippet_chars,
        cloud_api_key_present=cloud_api_key_present,
        reload_on_change=reload_on_change,
        reload_period_sec=reload_period_sec,
        source_env=raw_env,
    )


def resolve_model_target(settings: RerankerSettings) -> str:
    """Return the model path/identifier that should be loaded."""
    if settings.local_model_dir is not None:
        return str(settings.local_model_dir)
    return settings.hf_model_id


def as_env(settings: RerankerSettings) -> Dict[str, str]:
    """Represent settings as env-like strings for diagnostics."""
    data = asdict(settings)
    out: Dict[str, str] = {}
    for key, value in data.items():
        if key == "local_model_dir":
            out[key] = str(value) if value is not None else ""
        elif isinstance(value, bool):
            out[key] = "1" if value else "0"
        else:
            out[key] = str(value)
    return out


def shared_loader_enabled() -> bool:
    """Feature flag guard for shared reranker config.

    Uses config registry instead of os.getenv.
    """
    registry = _get_config_registry()
    return registry.get_bool("AGRO_RERANKER_SHARED_LOADER", False)


# Backward compatibility alias
unified_config_enabled = shared_loader_enabled


def reload_config() -> None:
    """Reload configuration from disk.

    This function should be called when config changes.
    Since we use config_registry, which handles its own reload,
    we just need to ensure the registry is reloaded.
    """
    registry = _get_config_registry()
    registry.reload()
