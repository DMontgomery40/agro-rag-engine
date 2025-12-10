from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from server.models.repo_model import ReposConfig, RepositoryConfig

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


def _load_repos_raw() -> Dict[str, Any]:
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
    cfg = _load_repos_raw()
    return [str(r.get("name")) for r in cfg.get("repos", []) if r.get("name")]


def get_default_repo() -> str:
    cfg = _load_repos_raw()
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
    for r in _load_repos_raw().get("repos", []):
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


def _get_repo_paths_raw(name: str) -> List[str]:
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


def get_repo_indexing_config(name: str) -> Dict[str, Any]:
    """Get merged indexing config for a repo (repo overrides + global fallback).

    Per-repo indexing config in repos.json can override global settings from agro_config.json.
    If repo has use_global=True or no indexing section, returns global defaults.
    Otherwise merges repo-specific overrides on top of global config.

    Returns dict with keys like: embedding_type, embedding_model, embedding_dim,
    chunk_size, chunk_overlap, chunking_strategy, bm25_tokenizer, etc.
    """
    from server.services.config_registry import ConfigRegistry

    # Get global indexing config from registry
    # Fields match RepoIndexingConfig Pydantic model (no provider-specific fields)
    # embedding_model is generic - works with any provider from models.json
    registry = ConfigRegistry()
    global_config = {
        'embedding_type': registry.get_str('EMBEDDING_TYPE', 'openai'),
        'embedding_model': registry.get_str('EMBEDDING_MODEL', 'text-embedding-3-large'),
        'embedding_dim': registry.get_int('EMBEDDING_DIM', 3072),
        'chunk_size': registry.get_int('CHUNK_SIZE', 1000),
        'chunk_overlap': registry.get_int('CHUNK_OVERLAP', 200),
        'chunking_strategy': registry.get_str('CHUNKING_STRATEGY', 'ast'),
        'bm25_tokenizer': registry.get_str('BM25_TOKENIZER', 'stemmer'),
        'bm25_stemmer_lang': registry.get_str('BM25_STEMMER_LANG', 'english'),
        'bm25_stopwords_lang': registry.get_str('BM25_STOPWORDS_LANG', 'en'),
        'indexing_batch_size': registry.get_int('INDEXING_BATCH_SIZE', 100),
        'indexing_workers': registry.get_int('INDEXING_WORKERS', 4),
    }

    # Check for repo-specific overrides
    r = _find_repo(name)
    if not r:
        return global_config

    repo_indexing = r.get("indexing") or {}

    # If use_global is True or not specified, return global config
    if repo_indexing.get("use_global", True):
        return global_config

    # Merge repo overrides on top of global config
    merged = {**global_config}
    for key, value in repo_indexing.items():
        if key != "use_global" and value is not None:
            merged[key] = value

    return merged


def get_repo_indexing_overrides(name: str) -> Optional[Dict[str, Any]]:
    """Get just the repo-specific indexing overrides (not merged with global).

    Returns None if repo has no indexing section or use_global=True.
    Returns the indexing dict if repo has custom overrides.
    """
    r = _find_repo(name)
    if not r:
        return None

    repo_indexing = r.get("indexing")
    if not repo_indexing or repo_indexing.get("use_global", True):
        return None

    return repo_indexing


# =============================================================================
# Pydantic-validated accessors (use these for new code)
# =============================================================================

def load_repos() -> "ReposConfig":
    """Load repos.json with Pydantic validation.

    This is the preferred way to access repo config. Returns a validated
    ReposConfig model instead of raw dict.
    """
    from server.models.repo_model import ReposConfig

    raw = _load_repos_raw()
    return ReposConfig.model_validate(raw)


def get_repo_validated(name: str) -> Optional["RepositoryConfig"]:
    """Get a single repo config with Pydantic validation.

    Returns None if repo not found.
    """
    config = load_repos()
    name_low = (name or "").strip().lower()
    for repo in config.repos:
        if repo.name.lower() == name_low:
            return repo
    return None


def get_repo_paths(name: str) -> List[str]:
    """Get repo paths with Pydantic validation - preserves relative paths.

    Returns List[str] for API compatibility with get_repo_paths().
    Unlike get_repo_paths(), this preserves relative paths without
    expanding to absolute. This is important for Docker compatibility.
    """
    repo = get_repo_validated(name)
    if not repo:
        raise ValueError(f"Unknown repo: {name}. Known: {', '.join(list_repos()) or '[]'}")
    return [repo.path]

