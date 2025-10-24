"""
Shared reranker configuration loader.

This consolidates the legacy env families:
- Retrieval: RERANK_BACKEND, RERANKER_MODEL, RERANK_INPUT_SNIPPET_CHARS
- API/GUI:   AGRO_RERANKER_* (model path, alpha, topN, batch, etc.)

The loader is read-only. Callers should continue to update environment
variables via existing endpoints/UI to remain ADA-compliant.
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
    backend: str  # "local" | "cohere" | "none"
    local_model_dir: Optional[Path]
    hf_model_id: str
    alpha: float
    top_n_local: int
    top_n_cloud: int
    batch_size: int
    max_length: int
    snippet_chars: int
    cohere_model: str
    cohere_api_key_present: bool
    reload_on_change: bool
    reload_period_sec: int
    source_env: Dict[str, str]

    @property
    def metrics_label(self) -> str:
        """Label for Prometheus/Grafana."""
        if self.backend == "cohere":
            return f"cohere:{self.cohere_model}"
        if self.local_model_dir is not None:
            return str(self.local_model_dir)
        return self.hf_model_id


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
    backend_env = (_get("RERANK_BACKEND", "local") or "local").strip().lower()

    cohere_key = _get("COHERE_API_KEY", "")
    cohere_model = _get("COHERE_RERANK_MODEL", "rerank-3.5")

    backend = backend_env if enabled else "none"
    if backend == "cohere" and not cohere_key.strip():
        # Fall back gracefully if key missing
        backend = "local"

    model_path_env = _get("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")
    local_model_dir = _resolve_local_model_path(model_path_env)

    hf_fallback = _get("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-12-v2")
    if local_model_dir is None:
        hf_model_id = model_path_env or hf_fallback
    else:
        hf_model_id = hf_fallback

    alpha = _env_float("AGRO_RERANKER_ALPHA", "0.7")
    top_n_local = max(0, _env_int("AGRO_RERANKER_TOPN", "50"))
    top_n_cloud = max(1, _env_int("COHERE_RERANK_TOP_N", "50"))
    batch_size = max(1, _env_int("AGRO_RERANKER_BATCH", "16"))
    max_length = max(1, _env_int("AGRO_RERANKER_MAXLEN", "512"))
    snippet_chars = max(1, _env_int("RERANK_INPUT_SNIPPET_CHARS", "600"))
    reload_on_change = _env_bool("AGRO_RERANKER_RELOAD_ON_CHANGE", "0")
    reload_period_sec = max(1, _env_int("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60"))

    return RerankerSettings(
        enabled=enabled and backend != "none",
        backend=backend,
        local_model_dir=local_model_dir,
        hf_model_id=hf_model_id,
        alpha=alpha,
        top_n_local=top_n_local,
        top_n_cloud=top_n_cloud,
        batch_size=batch_size,
        max_length=max_length,
        snippet_chars=snippet_chars,
        cohere_model=cohere_model,
        cohere_api_key_present=bool(cohere_key.strip()),
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
