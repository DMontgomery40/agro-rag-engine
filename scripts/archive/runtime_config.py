import os
import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, List

from config_loader import layer_bonuses as _layer_bonuses_cfg, path_boosts as _path_boosts_cfg


_OVERRIDES: Dict[str, Any] | None = None


def _overrides_path() -> Path:
    # Keep with UI assets for simplicity
    return Path(__file__).parent / "ui" / "runtime_overrides.json"


def _load_overrides() -> Dict[str, Any]:
    global _OVERRIDES
    if _OVERRIDES is not None:
        return _OVERRIDES
    p = _overrides_path()
    if p.exists():
        try:
            _OVERRIDES = json.loads(p.read_text())
        except Exception:
            _OVERRIDES = {}
    else:
        _OVERRIDES = {}
    return _OVERRIDES


def _get_override(repo: Optional[str], key: str) -> Any:
    ov = _load_overrides()
    # Precedence: per-repo -> _global
    if repo:
        rp = ov.get(repo)
        if isinstance(rp, dict) and key in rp:
            return rp[key]
    g = ov.get("_global")
    if isinstance(g, dict) and key in g:
        return g[key]
    return None


def _coerce(value: Any, typ: str) -> Any:
    if value is None:
        return None
    try:
        if typ == "int":
            return int(value)
        if typ == "float":
            return float(value)
        if typ == "bool":
            if isinstance(value, bool):
                return value
            s = str(value).strip().lower()
            return s in {"1", "true", "yes", "on"}
        if typ == "str":
            return str(value)
        if typ == "list[str]":
            if isinstance(value, list):
                return [str(x) for x in value]
            return [x.strip() for x in str(value).split(',') if x.strip()]
    except Exception:
        return None
    return value


def get_str(repo: Optional[str], key: str, env_key: Optional[str] = None, default: Optional[str] = None) -> Optional[str]:
    v = _get_override(repo, key)
    if v is None and env_key:
        v = os.getenv(env_key)
    return _coerce(v if v is not None else default, "str")


def get_int(repo: Optional[str], key: str, env_default: Optional[int] = None, default: Optional[int] = None) -> int:
    v = _get_override(repo, key)
    if v is None:
        v = env_default
    v = default if v is None else v
    out = _coerce(v, "int")
    return int(out) if out is not None else int(default or 0)


def get_float(repo: Optional[str], key: str, env_default: Optional[float] = None, default: Optional[float] = None) -> float:
    v = _get_override(repo, key)
    if v is None:
        v = env_default
    v = default if v is None else v
    out = _coerce(v, "float")
    return float(out) if out is not None else float(default or 0.0)


def get_bool(repo: Optional[str], key: str, env_default: Optional[bool] = None, default: Optional[bool] = None) -> bool:
    v = _get_override(repo, key)
    if v is None:
        v = env_default
    v = default if v is None else v
    out = _coerce(v, "bool")
    return bool(out) if out is not None else bool(default or False)


# High-level helpers

def get_conf_thresholds(repo: Optional[str]) -> Tuple[float, float, float]:
    t1 = get_float(repo, "CONF_TOP1", float(os.getenv("CONF_TOP1", "0.62")), 0.62)
    a5 = get_float(repo, "CONF_AVG5", float(os.getenv("CONF_AVG5", "0.55")), 0.55)
    anyc = get_float(repo, "CONF_ANY", float(os.getenv("CONF_ANY", "0.55")), 0.55)
    return t1, a5, anyc


def get_topk(repo: Optional[str]) -> Tuple[int, int, int]:
    kd = get_int(repo, "TOPK_DENSE", int(os.getenv("TOPK_DENSE", "75") or 75), 75)
    ks = get_int(repo, "TOPK_SPARSE", int(os.getenv("TOPK_SPARSE", "75") or 75), 75)
    fk = get_int(repo, "FINAL_K", int(os.getenv("FINAL_K", "10") or 10), 10)
    return kd, ks, fk


def get_mq_rewrites(repo: Optional[str]) -> int:
    return get_int(repo, "MQ_REWRITES", int(os.getenv("MQ_REWRITES", "2") or 2), 2)


def get_reranker_config(repo: Optional[str]) -> Dict[str, str]:
    return {
        "backend": (get_str(repo, "RERANK_BACKEND", "RERANK_BACKEND", "local") or "local").lower(),
        "model": get_str(repo, "RERANKER_MODEL", "RERANKER_MODEL", "BAAI/bge-reranker-v2-m3"),
        "cohere_model": get_str(repo, "COHERE_RERANK_MODEL", "COHERE_RERANK_MODEL", "rerank-3.5"),
    }


def get_path_boosts(repo: Optional[str]) -> List[str]:
    # Use repos.json, with optional env override per-repo (e.g., PROJECT_PATH_BOOSTS)
    lst = _path_boosts_cfg(repo or "")
    env_key = f"{(repo or '').upper()}_PATH_BOOSTS" if repo else None
    if env_key:
        env_val = os.getenv(env_key)
        if not env_val and (repo or "").lower() == "project":
            env_val = os.getenv("project_PATH_BOOSTS")
        if env_val:
            lst.extend([t.strip() for t in env_val.split(',') if t.strip()])
    # De-dup while preserving order
    seen = set(); out = []
    for t in lst:
        tl = t.strip().lower()
        if tl and tl not in seen:
            seen.add(tl); out.append(tl)
    return out


def get_layer_bonuses(repo: Optional[str]) -> Dict[str, Dict[str, float]]:
    return _layer_bonuses_cfg(repo or "")

