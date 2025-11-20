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

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached parameters
_AGRO_RERANKER_BATCH = None
_AGRO_RERANKER_MAXLEN = None

def _load_cached_config():
    """Load reranker config values into module-level cache."""
    global _AGRO_RERANKER_BATCH, _AGRO_RERANKER_MAXLEN

    if _config_registry is None:
        _AGRO_RERANKER_BATCH = int(os.getenv('AGRO_RERANKER_BATCH', '16') or '16')
        _AGRO_RERANKER_MAXLEN = int(os.getenv('AGRO_RERANKER_MAXLEN', '512') or '512')
    else:
        _AGRO_RERANKER_BATCH = _config_registry.get_int('AGRO_RERANKER_BATCH', 16)
        _AGRO_RERANKER_MAXLEN = _config_registry.get_int('AGRO_RERANKER_MAXLEN', 512)

def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()

# Initialize cache
_load_cached_config()

_RERANKER: Optional[CrossEncoder] = None
_RERANKER_PATH: Optional[str] = None
_RERANKER_MTIME: float = 0.0
_LAST_CHECK: float = 0.0

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
    """
    Loads and (optionally) hot-reloads the CrossEncoder model.
    Env:
      AGRO_RERANKER_MODEL_PATH   (dir or HF id; default MiniLM)
      AGRO_RERANKER_RELOAD_ON_CHANGE=1
      AGRO_RERANKER_RELOAD_PERIOD_SEC (default 60)
      AGRO_RERANKER_MAXLEN (default 512)
    """
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    path = os.getenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/ms-marco-MiniLM-L-12-v2")
    need_reload = False

    if _RERANKER is None or path != _RERANKER_PATH:
        need_reload = True
    elif os.getenv("AGRO_RERANKER_RELOAD_ON_CHANGE", "0") == "1":
        period = int(os.getenv("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60"))
        now = time.monotonic()
        if now - _LAST_CHECK >= period:
            _LAST_CHECK = now
            mtime = _latest_mtime(path)
            if mtime > _RERANKER_MTIME:
                need_reload = True

    if need_reload:
        _RERANKER = CrossEncoder(path, max_length=int(os.getenv("AGRO_RERANKER_MAXLEN", "512")))
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
    blend_alpha: float = float(os.getenv("AGRO_RERANKER_ALPHA", "0.7"))
) -> List[Dict[str, Any]]:
    """
    Feature gate:
      AGRO_RERANKER_TOPN=N (default 50). 0 = rerank ALL.
    candidates: [{"doc_id": str, "score": float, "text": str, "clicked": bool}, ...]
    """
    if not candidates or "text" not in candidates[0]:
        return candidates

    base_sorted = sorted(candidates, key=lambda c: float(c.get("score", 0.0)), reverse=True)
    topn = max(0, int(os.getenv("AGRO_RERANKER_TOPN", "50")))
    head = base_sorted if topn == 0 else base_sorted[:topn]
    tail = [] if topn == 0 else base_sorted[topn:]

    model = get_reranker()
    pairs = [(query, c.get("text", "")) for c in head]
    ce_scores = model.predict(pairs, batch_size=int(os.getenv("AGRO_RERANKER_BATCH", "16")))
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
    """
    Returns current reranker config/state without mutating env.
    """
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    path = os.getenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/ms-marco-MiniLM-L-12-v2")
    try:
        resolved = str(Path(path).resolve())
    except Exception:
        resolved = path
    info: Dict[str, Any] = {
        "enabled": os.getenv("AGRO_RERANKER_ENABLED", "1") == "1",
        "path": path,
        "resolved_path": resolved,
        "model_loaded": _RERANKER is not None,
        "device": None,
        "alpha": float(os.getenv("AGRO_RERANKER_ALPHA", "0.7")),
        "topn": int(os.getenv("AGRO_RERANKER_TOPN", "50")),
        "batch": int(os.getenv("AGRO_RERANKER_BATCH", "16")),
        "maxlen": int(os.getenv("AGRO_RERANKER_MAXLEN", "512")),
        "reload_on_change": os.getenv("AGRO_RERANKER_RELOAD_ON_CHANGE", "0") == "1",
        "reload_period_sec": int(os.getenv("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60")),
        "model_dir_mtime": _RERANKER_MTIME,
        "last_check_monotonic": _LAST_CHECK,
    }
    if _RERANKER is not None:
        try:
            info["device"] = str(_RERANKER.model.device)
        except Exception:
            pass
    return info
