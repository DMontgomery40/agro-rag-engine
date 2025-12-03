"""
Learning Reranker Module (server/learning_reranker.py)

This is the LEARNING reranker that supports:
  - Feedback loop integration for model improvement
  - Hot-reloadable cross-encoder model training
  - Enhanced search quality through continuous learning

NOT to be confused with retrieval/rerank.py which is the production search reranker
used during retrieval operations.

Purpose: Hot-reloadable cross-encoder for enhanced search with feedback-driven training
"""
import os
import math
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from sentence_transformers import CrossEncoder

try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

_RERANKER: Optional[CrossEncoder] = None
_RERANKER_PATH: Optional[str] = None
_RERANKER_MTIME: float = 0.0
_LAST_CHECK: float = 0.0

def _get(key: str, default: Any) -> Any:
    """Read from config registry or fall back to env."""
    if _config_registry is not None:
        if isinstance(default, int):
            return _config_registry.get_int(key, default)
        elif isinstance(default, float):
            return _config_registry.get_float(key, default)
        else:
            return _config_registry.get_str(key, default)
    return os.getenv(key, str(default))

def _latest_mtime(p: str) -> float:
    try:
        base = Path(p)
        if not base.exists():
            return 0.0
        latest = base.stat().st_mtime
        if base.is_file():
            return latest
        for root, _, files in os.walk(base):
            for name in files:
                try:
                    t = Path(root, name).stat().st_mtime
                    if t > latest:
                        latest = t
                except Exception:
                    pass
        return latest
    except Exception:
        return 0.0

def get_reranker() -> CrossEncoder:
    """Loads and (optionally) hot-reloads the CrossEncoder model."""
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    
    path = _get('AGRO_RERANKER_MODEL_PATH', 'models/cross-encoder-agro')
    need_reload = False

    if _RERANKER is None or path != _RERANKER_PATH:
        need_reload = True
    elif _get('AGRO_RERANKER_RELOAD_ON_CHANGE', 0):
        period = _get('AGRO_RERANKER_RELOAD_PERIOD_SEC', 60)
        now = time.monotonic()
        if now - _LAST_CHECK >= period:
            _LAST_CHECK = now
            mtime = _latest_mtime(path)
            if mtime > _RERANKER_MTIME:
                need_reload = True

    if need_reload:
        max_length = _get('AGRO_RERANKER_MAXLEN', 512)
        _RERANKER = CrossEncoder(path, max_length=max_length)
        _RERANKER_PATH = path
        _RERANKER_MTIME = _latest_mtime(path)
    return _RERANKER

def _minmax(scores: List[float]) -> List[float]:
    if not scores:
        return []
    mn, mx = min(scores), max(scores)
    if math.isclose(mn, mx):
        return [0.5 for _ in scores]
    return [(s - mn) / (mx - mn) for s in scores]

def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    blend_alpha: Optional[float] = None
) -> List[Dict[str, Any]]:
    """Rerank candidates using config registry values."""
    if not candidates or "text" not in candidates[0]:
        return candidates

    if blend_alpha is None:
        blend_alpha = _get('AGRO_RERANKER_ALPHA', 0.7)

    base_sorted = sorted(candidates, key=lambda c: float(c.get("score", 0.0)), reverse=True)
    topn = max(0, _get('AGRO_RERANKER_TOPN', 50))
    head = base_sorted if topn == 0 else base_sorted[:topn]
    tail = [] if topn == 0 else base_sorted[topn:]

    model = get_reranker()
    pairs = [(query, c.get("text", "")) for c in head]
    batch_size = _get('AGRO_RERANKER_BATCH', 16)
    ce_scores = model.predict(pairs, batch_size=batch_size)
    base_scores = [float(c.get("score", 0.0)) for c in head]
    base_norm = _minmax(base_scores)

    reranked_head = []
    for c, ce, bn in zip(head, ce_scores, base_norm):
        blended = (blend_alpha * float(ce)) + ((1.0 - blend_alpha) * float(bn))
        item = dict(c)
        item["rerank_score"] = blended
        item["cross_encoder_score"] = float(ce)
        item["base_score_norm"] = float(bn)
        reranked_head.append(item)
    reranked_head.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked_head + tail

def get_reranker_info() -> Dict[str, Any]:
    """Returns current reranker config/state from registry."""
    global _RERANKER, _RERANKER_MTIME, _LAST_CHECK
    
    path = _get('AGRO_RERANKER_MODEL_PATH', 'models/cross-encoder-agro')
    try:
        resolved = str(Path(path).resolve())
    except Exception:
        resolved = path
    
    info: Dict[str, Any] = {
        "enabled": _get('RERANKER_MODE', 'none') == "learning",
        "path": path,
        "resolved_path": resolved,
        "model_loaded": _RERANKER is not None,
        "device": None,
        "alpha": _get('AGRO_RERANKER_ALPHA', 0.7),
        "topn": _get('AGRO_RERANKER_TOPN', 50),
        "batch": _get('AGRO_RERANKER_BATCH', 16),
        "maxlen": _get('AGRO_RERANKER_MAXLEN', 512),
        "reload_on_change": bool(_get('AGRO_RERANKER_RELOAD_ON_CHANGE', 0)),
        "reload_period_sec": _get('AGRO_RERANKER_RELOAD_PERIOD_SEC', 60),
        "model_dir_mtime": _RERANKER_MTIME,
        "last_check_monotonic": _LAST_CHECK,
    }
    if _RERANKER is not None:
        try:
            info["device"] = str(_RERANKER.model.device)
        except Exception:
            pass
    return info