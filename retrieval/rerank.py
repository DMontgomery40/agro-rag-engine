
"""Unified Reranking Module for AGRO RAG Engine.

Supports 4 modes:
- none: Skip reranking
- local: Any HuggingFace cross-encoder model
- learning: AGRO's self-learning cross-encoder with hot-reload
- cloud: Cohere, Voyage, Jina APIs

All config through config_registry (no os.getenv for config values).
"""
import math
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import time as _time

from rerankers import Reranker  # type: ignore[import-untyped]
from sentence_transformers import CrossEncoder

from reranker.config import (
    load_settings,
    resolve_model_target,
    shared_loader_enabled,
    RerankerSettings,
)

try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except Exception:
    pass

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached reranking parameters - unified with RERANKER_MODE
_RERANKER_MODE = None
_RERANKER_CLOUD_PROVIDER = None
_RERANKER_CLOUD_MODEL = None
_RERANKER_LOCAL_MODEL = None
_AGRO_RERANKER_ALPHA = None
_AGRO_RERANKER_TOPN = None
_AGRO_RERANKER_BATCH = None
_AGRO_RERANKER_MAXLEN = None
_AGRO_RERANKER_RELOAD_ON_CHANGE = None
_AGRO_RERANKER_RELOAD_PERIOD_SEC = None
_RERANKER_TIMEOUT = None
_RERANK_INPUT_SNIPPET_CHARS = None
_TRANSFORMERS_TRUST_REMOTE_CODE = None

def _load_cached_config():
    """Load all reranking config values into module-level cache."""
    global _RERANKER_MODE, _RERANKER_CLOUD_PROVIDER, _RERANKER_CLOUD_MODEL, _RERANKER_LOCAL_MODEL
    global _AGRO_RERANKER_ALPHA, _AGRO_RERANKER_TOPN, _AGRO_RERANKER_BATCH, _AGRO_RERANKER_MAXLEN
    global _AGRO_RERANKER_RELOAD_ON_CHANGE, _AGRO_RERANKER_RELOAD_PERIOD_SEC
    global _RERANKER_TIMEOUT, _RERANK_INPUT_SNIPPET_CHARS, _TRANSFORMERS_TRUST_REMOTE_CODE

    if _config_registry is None:
        # Config registry must be available - this is a fatal error
        raise RuntimeError("Config registry not available. Ensure server.services.config_registry is importable.")
    else:
        # Use unified config registry keys only (no legacy fallbacks)
        _RERANKER_MODE = _config_registry.get_str('RERANKER_MODE', 'local')
        _RERANKER_CLOUD_PROVIDER = _config_registry.get_str('RERANKER_CLOUD_PROVIDER', '')
        _RERANKER_CLOUD_MODEL = _config_registry.get_str('RERANKER_CLOUD_MODEL', '')
        _RERANKER_LOCAL_MODEL = _config_registry.get_str('RERANKER_LOCAL_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
        _AGRO_RERANKER_ALPHA = _config_registry.get_float('AGRO_RERANKER_ALPHA', 0.7)
        _AGRO_RERANKER_TOPN = _config_registry.get_int('AGRO_RERANKER_TOPN', 50)
        _AGRO_RERANKER_BATCH = _config_registry.get_int('AGRO_RERANKER_BATCH', 16)
        _AGRO_RERANKER_MAXLEN = _config_registry.get_int('AGRO_RERANKER_MAXLEN', 512)
        _AGRO_RERANKER_RELOAD_ON_CHANGE = _config_registry.get_int('AGRO_RERANKER_RELOAD_ON_CHANGE', 0)
        _AGRO_RERANKER_RELOAD_PERIOD_SEC = _config_registry.get_int('AGRO_RERANKER_RELOAD_PERIOD_SEC', 60)
        _RERANKER_TIMEOUT = _config_registry.get_int('RERANKER_TIMEOUT', 10)
        _RERANK_INPUT_SNIPPET_CHARS = _config_registry.get_int('RERANK_INPUT_SNIPPET_CHARS', 700)
        _TRANSFORMERS_TRUST_REMOTE_CODE = _config_registry.get_int('TRANSFORMERS_TRUST_REMOTE_CODE', 1)

    # Ensure transformers respects config for remote code (using update for external library integration)
    try:
        os.environ.update({'TRANSFORMERS_TRUST_REMOTE_CODE': str(_TRANSFORMERS_TRUST_REMOTE_CODE)})
    except Exception:
        pass

def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()

# Initialize cache on module import
_load_cached_config()

_HF_PIPE = None
_RERANKER = None

_SHARED_LOADER = shared_loader_enabled()
if _SHARED_LOADER:
    _BOOT_SETTINGS = load_settings()
    DEFAULT_MODEL = resolve_model_target(_BOOT_SETTINGS)
else:
    # Use cached values from config registry
    DEFAULT_MODEL = _RERANKER_LOCAL_MODEL

def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-float(x)))
    except Exception:
        return 0.0

def _normalize(score: float, model_name: str) -> float:
    if any(k in model_name.lower() for k in ['bge-reranker', 'cross-encoder', 'mxbai', 'jina-reranker']):
        return _sigmoid(score)
    return float(score)

def _maybe_init_hf_pipeline(model_name: str) -> Optional[Any]:
    global _HF_PIPE
    if _HF_PIPE is not None:
        return _HF_PIPE
    try:
        if 'jinaai/jina-reranker' in model_name.lower():
            os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')
            from transformers import pipeline
            _HF_PIPE = pipeline(
                task='text-classification',
                model=model_name,
                tokenizer=model_name,
                trust_remote_code=True,
                device_map='auto'
            )
            return _HF_PIPE
    except Exception:
        _HF_PIPE = None
    return _HF_PIPE

_RERANKER_MODEL_ID: Optional[str] = None


def _load_settings_if_enabled() -> Optional[RerankerSettings]:
    if not shared_loader_enabled():
        return None
    return load_settings()

_DISABLED_ALIASES = {'off', 'none', 'disabled'}
_LOCALISH = {'local', 'hf'}


def _normalize_mode(value: Optional[str]) -> str:
    """Normalize mode aliases to canonical values."""
    if value is None:
        return ''
    v = str(value).strip().lower()
    if not v:
        return ''
    if v in _DISABLED_ALIASES:
        return 'none'
    if v == 'hf':
        return 'local'
    return v


def _normalize_provider(value: Optional[str]) -> str:
    if value is None:
        return ''
    v = str(value).strip().lower()
    if not v:
        return ''
    if v in _DISABLED_ALIASES:
        return 'none'
    return v


def _normalize_active_choice(value: Optional[str]) -> str:
    """Normalize active selector, defaulting to local when unspecified."""
    v = _normalize_mode(value)
    if not v:
        return 'local'
    if v in _DISABLED_ALIASES:
        return 'none'
    if v in {'learning'}:
        return 'learning'
    if v == 'hf':
        return 'local'
    return v


def _resolve_env_strategy() -> Dict[str, Any]:
    """Resolve reranker mode/provider/model choices from unified RERANKER_MODE config."""
    _load_cached_config()

    # Get unified mode - 'cloud', 'local', 'learning', or 'none'
    mode = _normalize_active_choice(_RERANKER_MODE)

    # Get provider (only meaningful for cloud mode)
    provider = _normalize_provider(_RERANKER_CLOUD_PROVIDER) if mode == 'cloud' else ''

    # Get models
    cloud_model = _RERANKER_CLOUD_MODEL
    local_model = _RERANKER_LOCAL_MODEL or DEFAULT_MODEL

    # Determine which model to use based on mode
    if mode == 'cloud':
        model_name = cloud_model
    elif mode == 'learning':
        model_name = _config_registry.get_str('AGRO_RERANKER_MODEL_PATH', 'models/cross-encoder-agro') if _config_registry else 'models/cross-encoder-agro'
    else:
        model_name = local_model

    snippet_local = _RERANK_INPUT_SNIPPET_CHARS or 700
    snippet_cloud = min(snippet_local + 100, 700)
    
    # Build metrics label from mode/provider (NO backend variable)
    if mode == 'none':
        metrics_label = "none"
    elif mode == 'cloud':
        metrics_label = f"{provider}:{cloud_model}"
    elif mode == 'learning':
        metrics_label = f"learning:{model_name}"
    else:
        metrics_label = f"local:{local_model}"
    
    enabled = mode not in {'none'}

    return {
        "mode": mode,
        "provider": provider,
        "cloud_model": cloud_model,
        "local_model": local_model,
        "model_name": model_name,
        "snippet_local": snippet_local,
        "snippet_cloud": snippet_cloud,
        "cloud_top_n": _AGRO_RERANKER_TOPN or 50,
        "metrics_label": metrics_label,
        "trust_remote_code": bool(_TRANSFORMERS_TRUST_REMOTE_CODE),
        "timeout": _RERANKER_TIMEOUT or 10,
        "alpha": _AGRO_RERANKER_ALPHA or 0.7,
        "topn": _AGRO_RERANKER_TOPN or 50,
        "batch": _AGRO_RERANKER_BATCH or 16,
        "maxlen": _AGRO_RERANKER_MAXLEN or 512,
        "enabled": enabled,
    }


def get_rerank_config_info() -> Dict[str, Any]:
    """Expose current rerank configuration snapshot using Pydantic field names."""
    cfg = _resolve_env_strategy()
    return {
        "reranker_mode": cfg.get("mode"),
        "reranker_cloud_provider": cfg.get("provider"),
        "reranker_cloud_model": cfg.get("cloud_model"),
        "reranker_local_model": cfg.get("local_model"),
        "model_path": cfg.get("model_name"),
        "snippet_chars": cfg.get("snippet_local"),
        "timeout": cfg.get("timeout"),
        "trust_remote_code": cfg.get("trust_remote_code"),
        "alpha": cfg.get("alpha"),
        "topn": cfg.get("topn"),
        "batch": cfg.get("batch"),
        "maxlen": cfg.get("maxlen"),
        "cloud_top_n": cfg.get("cloud_top_n"),
    }

def get_reranker() -> Optional[Reranker]:
    global _RERANKER, _RERANKER_MODEL_ID

    settings = _load_settings_if_enabled()
    if settings:
        model_name = resolve_model_target(settings)
        max_length = settings.max_length
    else:
        _load_cached_config()

        # Cloud mode uses API calls, not local reranker
        if _RERANKER_MODE == 'cloud':
            return None

        # Disabled mode
        if _RERANKER_MODE == 'none':
            return None

        # Learning mode uses AGRO model
        if _RERANKER_MODE == 'learning':
            model_name = 'models/cross-encoder-agro'
        else:
            # Local mode uses configured local model
            model_name = _RERANKER_LOCAL_MODEL or DEFAULT_MODEL

        max_length = _AGRO_RERANKER_MAXLEN or 512

    if _RERANKER is not None and _RERANKER_MODEL_ID != model_name:
        _RERANKER = None

    if _RERANKER is None:
        if _maybe_init_hf_pipeline(model_name):
            _RERANKER_MODEL_ID = model_name
            return None
        os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')
        _RERANKER = Reranker(model_name, model_type='cross-encoder', trust_remote_code=True, max_length=max_length)
        _RERANKER_MODEL_ID = model_name
    return _RERANKER


def rerank_results(query: str, results: List[Dict[str, Any]], top_k: int = 10, trace: Any = None) -> List[Dict[str, Any]]:
    if not results:
        return []

    settings = _load_settings_if_enabled()

    if settings:
        mode = settings.mode
        provider = settings.provider
        cloud_model = settings.cloud_model
        enabled = settings.enabled and mode != "none"
        model_name = resolve_model_target(settings)
        metrics_label = settings.metrics_label
        snippet_local = settings.snippet_chars
        snippet_cloud = settings.snippet_chars
        cloud_top_n = settings.top_n_cloud
        cloud_api_key_present = settings.cloud_api_key_present

        # Pydantic-style validation for cloud mode
        if mode == 'cloud':
            if not provider:
                raise ValueError(
                    f"RERANKER_MODE='{mode}' requires RERANKER_CLOUD_PROVIDER to be set"
                )
            if not cloud_model:
                raise ValueError(
                    f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
                    f"requires RERANKER_CLOUD_MODEL to be set"
                )
            if not cloud_api_key_present:
                api_key_env = f"{provider.upper()}_API_KEY"
                raise ValueError(
                    f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
                    f"requires {api_key_env} environment variable to be set"
                )
    else:
        # Use cached config values from unified RERANKER_MODE
        cfg = _resolve_env_strategy()
        mode = cfg.get("mode")
        provider = cfg.get("provider")
        enabled = bool(cfg.get("enabled"))
        model_name = cfg.get("model_name")
        cloud_model = cfg.get("cloud_model")
        metrics_label = cfg.get("metrics_label")
        snippet_local = cfg.get("snippet_local")
        snippet_cloud = cfg.get("snippet_cloud")
        cloud_top_n = cfg.get("cloud_top_n")

        # Validate cloud mode configuration
        if mode == 'cloud':
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
            if not os.getenv(api_key_env):
                raise ValueError(
                    f"RERANKER_MODE='{mode}' with RERANKER_CLOUD_PROVIDER='{provider}' "
                    f"requires {api_key_env} environment variable to be set"
                )

    if not enabled:
        for i, r in enumerate(results):
            r['rerank_score'] = float(1.0 - (i * 0.01))
        return results[:top_k]

    # --- tracing: record input set size
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('reranker.rank', {
                'model': metrics_label,
                'input_topN': len(results or []),
                'output_topK': int(top_k),
            })
    except Exception:
        pass
    if mode == 'cloud' and provider == 'cohere':
        try:
            import requests as req
            import time
            from server.api_tracker import track_api_call, APIProvider

            api_key = os.getenv('COHERE_API_KEY')
            if settings and not cloud_api_key_present:
                raise RuntimeError('COHERE_API_KEY not set')
            if not settings and not api_key:
                raise RuntimeError('COHERE_API_KEY not set')

            docs = []
            for r in results:
                file_ctx = r.get('file_path', '')
                snip_len = snippet_cloud
                code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
                docs.append(f"{file_ctx}\n\n{code_snip}")
            rerank_top_n = min(len(docs), cloud_top_n)

            start = time.time()
            model_id = cloud_model
            resp = req.post(
                "https://api.cohere.com/v2/rerank",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_id,
                    "query": query,
                    "documents": docs,
                    "top_n": rerank_top_n,
                    "return_documents": False
                },
                timeout=10
            )
            resp.raise_for_status()
            rr = resp.json()
            duration_ms = (time.time() - start) * 1000

            cost_per_call = 0.000002
            tokens_est = len(docs) * 100

            track_api_call(
                provider=APIProvider.COHERE,
                endpoint="https://api.cohere.com/v2/rerank",
                method="POST",
                duration_ms=duration_ms,
                status_code=resp.status_code,
                tokens_estimated=tokens_est,
                cost_usd=cost_per_call
            )

            rr_results = rr.get("results", [])
            scores = [r.get('relevance_score', 0.0) for r in rr_results]
            max_s = max(scores) if scores else 1.0
            for item in rr_results:
                idx = int(item.get('index', 0))
                score = float(item.get('relevance_score', 0.0))
                if idx < len(results):
                    results[idx]['rerank_score'] = (score / max_s) if max_s else 0.0
            results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
            top = results[:top_k]
            try:
                if trace is not None and hasattr(trace, 'add'):
                    trace.add('reranker.rank', {
                        'model': metrics_label,
                        'scores': [
                            {
                                'path': r.get('file_path'),
                                'start': r.get('start_line'),
                                'end': r.get('end_line'),
                                'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                            } for r in top
                        ]
                    })
            except Exception:
                pass
            return top
        except Exception:
            pass
    elif mode == 'cloud' and provider == 'voyage':
        try:
            import requests as req
            import time
            from server.api_tracker import track_api_call, APIProvider

            api_key = os.getenv('VOYAGE_API_KEY')
            if not api_key:
                raise RuntimeError('VOYAGE_API_KEY not set')

            docs = []
            for r in results:
                file_ctx = r.get('file_path', '')
                snip_len = snippet_cloud
                code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
                docs.append(f"{file_ctx}\n\n{code_snip}")
            rerank_top_n = min(len(docs), cloud_top_n)

            start = time.time()
            model_id = cloud_model
            resp = req.post(
                "https://api.voyageai.com/v1/rerank",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_id,
                    "query": query,
                    "documents": docs,
                    "top_k": rerank_top_n,
                },
                timeout=10
            )
            resp.raise_for_status()
            rr = resp.json()
            duration_ms = (time.time() - start) * 1000

            track_api_call(
                provider=APIProvider.VOYAGE,
                endpoint="https://api.voyageai.com/v1/rerank",
                method="POST",
                duration_ms=duration_ms,
                status_code=resp.status_code,
                tokens_estimated=len(docs) * 100,
                cost_usd=0.0
            )

            rr_results = rr.get("data") or rr.get("results") or []
            scores = [item.get('relevance_score') or item.get('score') or 0.0 for item in rr_results]
            max_s = max(scores) if scores else 1.0
            for item in rr_results:
                idx = int(item.get('index') or item.get('document') or item.get('id') or 0)
                score = float(item.get('relevance_score') or item.get('score') or 0.0)
                if idx < len(results):
                    results[idx]['rerank_score'] = (score / max_s) if max_s else 0.0
            results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
            return results[:top_k]
        except Exception:
            pass
    pipe = _maybe_init_hf_pipeline(model_name)
    if pipe is not None:
        pairs = []
        for r in results:
            snip_len = snippet_local
            code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
            pairs.append({'text': query, 'text_pair': code_snip})
        try:
            t0 = _time.time()
            out = pipe(pairs, truncation=True)  # type: ignore[misc]
            duration_ms = (_time.time() - t0) * 1000
            # Track LOCAL model usage
            try:
                from server.api_tracker import track_api_call, APIProvider, track_trace
                track_api_call(provider=APIProvider.LOCAL, endpoint="hf_pipeline:text-classification", method="RUN",
                               duration_ms=duration_ms, status_code=200, tokens_estimated=0, cost_usd=0.0)
                track_trace(step="rerank_local_pipeline", provider="local", model=model_name, duration_ms=duration_ms,
                            extra={"candidates": len(results), "top_k": top_k})
            except Exception:
                pass
            raw = []
            for i, o in enumerate(out):
                score = float(o.get('score', 0.0))
                s = _normalize(score, model_name)
                results[i]['rerank_score'] = s
                raw.append(s)
            if raw:
                mn, mx = min(raw), max(raw)
                rng = (mx - mn)
                if rng > 1e-9:
                    for r in results:
                        r['rerank_score'] = (float(r.get('rerank_score', 0.0)) - mn) / rng
                elif mx != 0.0:
                    for r in results:
                        r['rerank_score'] = float(r.get('rerank_score', 0.0)) / abs(mx)
            results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
            top = results[:top_k]
            try:
                if trace is not None and hasattr(trace, 'add'):
                    trace.add('reranker.rank', {
                        'model': metrics_label,
                        'scores': [
                            {
                                'path': r.get('file_path'),
                                'start': r.get('start_line'),
                                'end': r.get('end_line'),
                                'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                            } for r in top
                        ]
                    })
            except Exception:
                pass
            return top
        except Exception:
            pass
    docs = []
    for r in results:
        file_ctx = r.get('file_path', '')
        code_snip = (r.get('code') or r.get('text') or '')[:snippet_local]
        docs.append(f"{file_ctx}\n\n{code_snip}")
    rr = get_reranker()
    if rr is None and _maybe_init_hf_pipeline(model_name) is not None:
        return results[:top_k]
    t0 = _time.time()
    ranked = rr.rank(query=query, docs=docs, doc_ids=list(range(len(docs))))  # type: ignore[attr-defined]
    duration_ms = (_time.time() - t0) * 1000
    try:
        from server.api_tracker import track_api_call, APIProvider, track_trace
        track_api_call(provider=APIProvider.LOCAL, endpoint="cross-encoder.rank", method="RUN",
                       duration_ms=duration_ms, status_code=200, tokens_estimated=0, cost_usd=0.0)
        track_trace(step="rerank_local_encoder", provider="local", model=model_name, duration_ms=duration_ms,
                    extra={"candidates": len(docs), "top_k": top_k})
    except Exception:
        pass
    raw_scores = []
    for res in ranked.results:
        idx = res.document.doc_id
        s = _normalize(res.score, model_name)
        results[idx]['rerank_score'] = s
        raw_scores.append(s)
    if raw_scores:
        mn, mx = min(raw_scores), max(raw_scores)
        rng = (mx - mn)
        if rng > 1e-9:
            for r in results:
                r['rerank_score'] = (float(r.get('rerank_score', 0.0)) - mn) / rng
        elif mx != 0.0:
            for r in results:
                r['rerank_score'] = float(r.get('rerank_score', 0.0)) / abs(mx)
    results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    top = results[:top_k]
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('reranker.rank', {
                'model': metrics_label,
                'scores': [
                    {
                        'path': r.get('file_path'),
                        'start': r.get('start_line'),
                        'end': r.get('end_line'),
                        'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                    } for r in top
                ]
            })
    except Exception:
        pass
    return top
