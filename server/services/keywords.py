import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

from common.paths import repo_root
from server.services.config_registry import get_config_registry

# Module-level config caching
_config_registry = get_config_registry()
_KEYWORDS_MAX_PER_REPO = _config_registry.get_int('KEYWORDS_MAX_PER_REPO', 50)
_KEYWORDS_MIN_FREQ = _config_registry.get_int('KEYWORDS_MIN_FREQ', 3)
_KEYWORDS_BOOST = _config_registry.get_float('KEYWORDS_BOOST', 1.3)
_KEYWORDS_AUTO_GENERATE = _config_registry.get_int('KEYWORDS_AUTO_GENERATE', 1)
_KEYWORDS_REFRESH_HOURS = _config_registry.get_int('KEYWORDS_REFRESH_HOURS', 24)


def reload_config():
    """Reload cached config values from registry."""
    global _KEYWORDS_MAX_PER_REPO, _KEYWORDS_MIN_FREQ, _KEYWORDS_BOOST
    global _KEYWORDS_AUTO_GENERATE, _KEYWORDS_REFRESH_HOURS
    _KEYWORDS_MAX_PER_REPO = _config_registry.get_int('KEYWORDS_MAX_PER_REPO', 50)
    _KEYWORDS_MIN_FREQ = _config_registry.get_int('KEYWORDS_MIN_FREQ', 3)
    _KEYWORDS_BOOST = _config_registry.get_float('KEYWORDS_BOOST', 1.3)
    _KEYWORDS_AUTO_GENERATE = _config_registry.get_int('KEYWORDS_AUTO_GENERATE', 1)
    _KEYWORDS_REFRESH_HOURS = _config_registry.get_int('KEYWORDS_REFRESH_HOURS', 24)


def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def get_keywords() -> Dict[str, Any]:
    """Get keywords from repos.json (primary source of truth).

    Returns keywords in a format compatible with the UI, with all
    categories pointing to the same consolidated keyword list.
    """
    # Load from repos.json (single source of truth)
    try:
        from common.config_loader import get_repo_keywords
        repo = os.getenv("REPO", "agro")
        keywords = get_repo_keywords(repo) or []
    except Exception:
        keywords = []

    # For backward UI compatibility, return in expected format
    # All categories now point to the same consolidated list
    return {
        "discriminative": keywords,  # Primary keywords from repos.json
        "semantic": [],              # Deprecated - empty
        "llm": [],                   # Deprecated - empty
        "manual": [],                # Deprecated - use repos.json directly
        "keywords": keywords,        # All keywords (same as discriminative now)
    }


def add_keyword(body: Dict[str, Any]) -> Dict[str, Any]:
    """Add a keyword to repos.json (single source of truth).

    Category parameter is kept for backward compatibility but all
    keywords now go to repos.json.
    """
    keyword = str(body.get("keyword", "")).strip()
    if not keyword:
        return {"error": "Keyword is required"}

    repo = os.getenv("REPO", "agro")

    try:
        repos_path = repo_root() / "repos.json"
        data = _read_json(repos_path, {"repos": []})

        # Find the repo config
        for repo_config in data.get("repos", []):
            if repo_config.get("name") == repo:
                keywords = repo_config.get("keywords", [])
                if keyword not in keywords:
                    keywords.append(keyword)
                    keywords.sort()
                    repo_config["keywords"] = keywords

                    with open(repos_path, "w") as f:
                        json.dump(data, f, indent=2)

                return {"ok": True, "keyword": keyword, "category": "repos.json"}

        return {"error": f"Repo '{repo}' not found in repos.json"}
    except Exception as e:
        return {"error": str(e)}


def generate_keywords(body: Dict[str, Any]) -> Dict[str, Any]:
    """Generate/refresh keywords for a repo.

    Keywords are stored in repos.json as the single source of truth.
    This function returns the current keywords from repos.json.
    """
    from common.config_loader import get_repo_keywords, clear_cache

    repo = body.get("repo") or os.getenv("REPO", "agro")
    mode = (body.get("mode") or "heuristic").strip().lower()
    start_time = time.time()

    results: Dict[str, Any] = {"ok": True, "repo": repo, "mode": mode}

    try:
        # Clear cache to get fresh data from repos.json
        clear_cache()

        # Get keywords from repos.json (single source of truth)
        keywords = get_repo_keywords(repo)

        results["count"] = len(keywords)
        results["keywords"] = keywords
        results["duration_seconds"] = round(time.time() - start_time, 2)

    except Exception as e:
        results["ok"] = False
        results["error"] = str(e)

    return results
