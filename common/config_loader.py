from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

_CACHE: Dict[str, Any] = {}

def clear_cache():
    """Clear cached config - forces reload from disk."""
    global _CACHE
    _CACHE.clear()


def _repos_file_path() -> Path:
    env_path = os.getenv("REPOS_FILE")
    if env_path:
        return Path(env_path).expanduser().resolve()
    return Path(__file__).resolve().parents[1] / "repos.json"


def load_repos() -> Dict[str, Any]:
    global _CACHE
    if "config" in _CACHE:
        return _CACHE["config"]
    p = _repos_file_path()
    if p.exists():
        try:
            data = json.loads(p.read_text())
            if isinstance(data, dict) and isinstance(data.get("repos"), list):
                _CACHE["config"] = data
                return data
        except Exception:
            pass
    env_repo = (os.getenv("REPO") or "default").strip()
    env_path = os.getenv("REPO_PATH") or os.getenv(f"REPO_{env_repo.upper()}_PATH")
    if env_path:
        cfg = {"default_repo": env_repo, "repos": [{"name": env_repo, "path": env_path}]}
        _CACHE["config"] = cfg
        return cfg
    cfg = {"default_repo": None, "repos": []}
    _CACHE["config"] = cfg
    return cfg


def list_repos() -> List[str]:
    cfg = load_repos()
    return [str(r.get("name")) for r in cfg.get("repos", []) if r.get("name")]


def get_default_repo() -> str:
    cfg = load_repos()
    if cfg.get("default_repo"):
        return str(cfg["default_repo"]).strip()
    repos = cfg.get("repos", [])
    if repos:
        return str(repos[0].get("name"))
    return (os.getenv("REPO") or "default").strip()


def _find_repo(name: str) -> Optional[Dict[str, Any]]:
    name_low = (name or "").strip().lower()
    if not name_low:
        return None
    for r in load_repos().get("repos", []):
        if (r.get("name") or "").strip().lower() == name_low:
            return r
    return None


def _expand_env_vars(path_str: str) -> str:
    """Expand environment variables in path string. Supports ${VAR}, ${VAR:-default}, and $VAR syntax."""
    import re

    def replace_var(match):
        # Handle ${VAR:-default} syntax
        if ':-' in match.group(0):
            var_part = match.group(0)[2:-1]  # Remove ${ and }
            var_name, default = var_part.split(':-', 1)
            return os.getenv(var_name.strip(), default.strip())
        # Handle ${VAR} or $VAR
        var_name = match.group(1) or match.group(2)
        return os.getenv(var_name, match.group(0))

    # Replace ${VAR:-default}, ${VAR}, and $VAR patterns
    path_str = re.sub(r'\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)', replace_var, path_str)
    return path_str


def get_repo_paths(name: str) -> List[str]:
    r = _find_repo(name)
    if not r:
        raise ValueError(f"Unknown repo: {name}. Known: {', '.join(list_repos()) or '[]'}")
    p = r.get("path")
    if isinstance(p, list):
        return [str(Path(_expand_env_vars(x)).expanduser()) for x in p]
    if isinstance(p, str):
        return [str(Path(_expand_env_vars(p)).expanduser())]
    raise ValueError(f"Repo `{name}` missing 'path' in repos.json")


def _out_base_dir() -> Path:
    root = Path(__file__).resolve().parents[1]
    env_base = os.getenv("OUT_DIR_BASE") or os.getenv("RAG_OUT_BASE")
    if env_base:
        p = Path(env_base).expanduser()
        if not p.is_absolute():
            p = (root / p)
        return p
    for cand in ("out.noindex-shared", "out.noindex-gui", "out.noindex-devclean", "out.noindex"):
        if (root / cand).exists():
            return root / cand
    return root / "out"


def out_dir(name: str) -> str:
    return str(_out_base_dir() / name)


def get_repo_keywords(name: str) -> List[str]:
    r = _find_repo(name)
    if not r:
        return []
    kws = r.get("keywords") or []
    return [str(k).lower() for k in kws if isinstance(k, str)]


def path_boosts(name: str) -> List[str]:
    r = _find_repo(name)
    if not r:
        return []
    lst = r.get("path_boosts") or []
    return [str(x) for x in lst if isinstance(x, str)]


def layer_bonuses(name: str) -> Dict[str, Dict[str, float]]:
    r = _find_repo(name)
    if not r:
        return {}
    lb = r.get("layer_bonuses") or {}
    out: Dict[str, Dict[str, float]] = {}
    for intent, d in (lb.items() if isinstance(lb, dict) else []):
        if not isinstance(d, dict):
            continue
        out[intent] = {k: float(v) for k, v in d.items() if isinstance(v, (int, float))}
    return out


def choose_repo_from_query(query: str, default: Optional[str] = None) -> str:
    q = (query or "").lower().strip()
    if ":" in q:
        cand, _ = q.split(":", 1)
        cand = cand.strip()
        if cand in [r.lower() for r in list_repos()]:
            return cand
    best = None
    best_hits = 0
    for name in list_repos():
        hits = 0
        for kw in get_repo_keywords(name):
            if kw and kw in q:
                hits += 1
        if hits > best_hits:
            best = name
            best_hits = hits
    if best:
        return best
    return (default or get_default_repo())


def exclude_paths(name: str) -> List[str]:
    """Get list of exclude path patterns for a repo."""
    r = _find_repo(name)
    if not r:
        return []
    lst = r.get("exclude_paths") or []
    return [str(x) for x in lst if isinstance(x, str)]

