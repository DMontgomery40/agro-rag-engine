import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List

from common.paths import repo_root


def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def get_keywords() -> Dict[str, Any]:
    def extract_terms(obj: Any) -> List[str]:
        out: List[str] = []
        try:
            if isinstance(obj, list):
                for it in obj:
                    if isinstance(it, str):
                        out.append(it)
                    elif isinstance(it, dict):
                        for key in ("keyword", "term", "key", "name"):
                            if key in it and isinstance(it[key], str):
                                out.append(it[key])
                                break
            elif isinstance(obj, dict):
                for bucket in ("agro", "agro"):
                    if bucket in obj and isinstance(obj[bucket], list):
                        out.extend(extract_terms(obj[bucket]))
                        return out
                for v in obj.values():
                    out.extend(extract_terms(v))
        except Exception:
            pass
        return out

    discr_raw = _read_json(repo_root() / "discriminative_keywords.json", {})
    sema_raw = _read_json(repo_root() / "semantic_keywords.json", {})
    llm_raw = _read_json(repo_root() / "llm_keywords.json", {})
    manual_raw = _read_json(repo_root() / "manual_keywords.json", [])
    discr = extract_terms(discr_raw)
    sema = extract_terms(sema_raw)
    llm = extract_terms(llm_raw)
    manual = extract_terms(manual_raw) if manual_raw else []

    def uniq(xs: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for k in xs:
            k2 = str(k)
            if k2 not in seen:
                out.append(k2)
                seen.add(k2)
        return out

    return {
        "discriminative": uniq(discr),
        "semantic": uniq(sema),
        "llm": uniq(llm),
        "manual": uniq(manual),
        "keywords": uniq((discr or []) + (sema or []) + (llm or []) + (manual or [])),
    }


def add_keyword(body: Dict[str, Any]) -> Dict[str, Any]:
    keyword = str(body.get("keyword", "")).strip()
    category = str(body.get("category", "")).strip()
    if not keyword:
        return {"error": "Keyword is required"}

    category_files = {
        "discriminative": repo_root() / "discriminative_keywords.json",
        "semantic": repo_root() / "semantic_keywords.json",
    }

    if category and category in category_files:
        file_path = category_files[category]
        data = _read_json(file_path, {})
        if not isinstance(data, dict):
            data = {}
        if isinstance(data, list):
            if keyword not in data:
                data.append(keyword)
                data.sort()
        else:
            data.setdefault("manual", [])
            if keyword not in data["manual"]:
                data["manual"].append(keyword)
                data["manual"].sort()
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        return {"ok": True, "keyword": keyword, "category": category}
    else:
        manual_path = repo_root() / "manual_keywords.json"
        data = _read_json(manual_path, [])
        if not isinstance(data, list):
            data = []
        if keyword not in data:
            data.append(keyword)
            data.sort()
        with open(manual_path, "w") as f:
            json.dump(data, f, indent=2)
        return {"ok": True, "keyword": keyword, "category": "manual"}


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
