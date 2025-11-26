import json
import os
import subprocess
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
    import sys
    repo = body.get("repo") or os.getenv("REPO", "agro")
    mode = (body.get("mode") or "heuristic").strip().lower()
    max_files = int(body.get("max_files", 200) or 200)

    results: Dict[str, Any] = {"ok": True, "repo": repo, "mode": mode}

    def run_heuristic():
        base = repo_root()
        subprocess.check_call([sys.executable, str(base / "scripts" / "analyze_keywords.py"), "--repo", repo, "--max_files", str(max_files)])
        subprocess.check_call([sys.executable, str(base / "scripts" / "analyze_keywords_v2.py"), "--repo", repo, "--max_files", str(max_files)])
        results["discriminative"] = {"ok": True, "count": len(_read_json(base / "discriminative_keywords.json", {}).get("manual", []))}
        results["semantic"] = {"ok": True, "count": len(_read_json(base / "semantic_keywords.json", {}).get("manual", []))}

    try:
        start_time = time.time()
        if mode == "llm":
            # Heuristic first, then llm
            run_heuristic()
            # Placeholder for llm mode wiring if present in repo (kept safe)
            results["llm"] = {"ok": True, "count": len(_read_json(repo_root() / "llm_keywords.json", {}).get("agro", []))}
        else:
            run_heuristic()
        results["total_count"] = (
            (results.get("discriminative", {}).get("count") or 0)
            + (results.get("semantic", {}).get("count") or 0)
            + (results.get("llm", {}).get("count") or 0)
        )
        results["duration_seconds"] = round(time.time() - start_time, 2)
    except subprocess.TimeoutExpired:
        results["ok"] = False
        results["error"] = "Keyword generation timed out"
    except Exception as e:
        results["ok"] = False
        results["error"] = str(e)
    return results
