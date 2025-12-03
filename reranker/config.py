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


_BOOL_TRUE = {"1", "true", "yes", "on"}


def _env_bool(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in _BOOL_TRUE


def _env_int(name: str, default: str) -> int:
    try:
        return int(os.getenv(name, default).strip())
    except Exception:
        return int(default)


def _env_float(name: str, default: str) -> float:
    try:
        return float(os.getenv(name, default).strip())
    except Exception:
        return float(default)


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


def load_settings() -> RerankerSettings:
    """Load consolidated reranker settings from environment variables."""
    raw_env: Dict[str, str] = {}

    def _get(name: str, default: str = "") -> str:
        val = os.getenv(name, default)
        raw_env[name] = val
        return val

    enabled = _env_bool("AGRO_RERANKER_ENABLED", "1")

    # Read RERANKER_MODE
    mode = _get("RERANKER_MODE", "").strip().lower()
    if not mode:
        raise ValueError(
            "RERANKER_MODE must be set to one of: 'cloud', 'local', 'learning', 'none'"
        )
    if mode not in {"cloud", "local", "learning", "none"}:
        raise ValueError(
            f"RERANKER_MODE='{mode}' is invalid. "
            f"Must be one of: 'cloud', 'local', 'learning', 'none'"
        )

    if not enabled:
        mode = "none"

    # Read provider and models
    provider = _get("RERANKER_CLOUD_PROVIDER", "").strip().lower()
    cloud_model = _get("RERANKER_CLOUD_MODEL", "").strip()
    local_model = _get("RERANKER_LOCAL_MODEL", "").strip()

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
        api_key_env = f"{provider.upper()}_API_KEY"
        api_key = _get(api_key_env, "")
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
        # Learning mode uses AGRO cross encoder
        local_model = "models/cross-encoder-agro"

    # Resolve local model path for learning/local modes
    if mode in {"learning", "local"}:
        local_model_dir = _resolve_local_model_path(local_model)
    else:
        local_model_dir = None

    hf_model_id = local_model

    alpha = _env_float("AGRO_RERANKER_ALPHA", "0.7")
    top_n_local = max(0, _env_int("AGRO_RERANKER_TOPN", "50"))
    top_n_cloud = max(1, _env_int("RERANKER_CLOUD_TOP_N", "50"))
    batch_size = max(1, _env_int("AGRO_RERANKER_BATCH", "16"))
    max_length = max(1, _env_int("AGRO_RERANKER_MAXLEN", "512"))
    snippet_chars = max(1, _env_int("RERANK_INPUT_SNIPPET_CHARS", "600"))
    reload_on_change = _env_bool("AGRO_RERANKER_RELOAD_ON_CHANGE", "0")
    reload_period_sec = max(1, _env_int("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60"))

    return RerankerSettings(
        enabled=enabled and mode != "none",
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
    """Feature flag guard for shared reranker config."""
    return _env_bool("AGRO_RERANKER_SHARED_LOADER", "0")

# Backward compatibility alias
unified_config_enabled = shared_loader_enabled
