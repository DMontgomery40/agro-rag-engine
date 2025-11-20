import os
from typing import Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException
from server.utils import read_json, atomic_write_json
from retrieval.hybrid_search import search_routed_multi, search_routed

router = APIRouter()

def _golden_path() -> Path:
    env_p = os.getenv('GOLDEN_PATH')
    if env_p:
        return Path(env_p)
    return Path('data/golden.json')

@router.get("/api/golden")
def golden_list() -> Dict[str, Any]:
    data = read_json(_golden_path(), [])
    questions = [q for q in data if isinstance(q, dict) and "q" in q]
    return {"questions": questions, "count": len(questions)}

@router.post("/api/golden")
def golden_add(payload: Dict[str, Any]) -> Dict[str, Any]:
    gp = _golden_path()
    data = read_json(gp, [])
    if not isinstance(data, list):
        data = []

    q = str(payload.get("q") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question text required")
    
    new_q = {
        "q": q,
        "repo": str(payload.get("repo") or os.getenv("REPO", "agro")),
        "expect_paths": list(payload.get("expect_paths") or [])
    }
    data.append(new_q)
    atomic_write_json(gp, data)
    return {"ok": True, "index": len(data) - 1, "question": new_q}

@router.put("/api/golden/{index}")
def golden_update(index: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    gp = _golden_path()
    data = read_json(gp, [])
    questions = [i for i, q in enumerate(data) if isinstance(q, dict) and "q" in q]
    if index < 0 or index >= len(questions):
        raise HTTPException(status_code=404, detail="Question not found")
    
    actual_index = questions[index]
    if "q" in payload:
        data[actual_index]["q"] = str(payload["q"])
    if "repo" in payload:
        data[actual_index]["repo"] = str(payload["repo"])
    if "expect_paths" in payload:
        data[actual_index]["expect_paths"] = list(payload["expect_paths"])
    
    atomic_write_json(gp, data)
    return {"ok": True, "index": index, "question": data[actual_index]}

@router.delete("/api/golden/{index}")
def golden_delete(index: int) -> Dict[str, Any]:
    gp = _golden_path()
    data = read_json(gp, [])
    questions = [i for i, q in enumerate(data) if isinstance(q, dict) and "q" in q]
    if index < 0 or index >= len(questions):
        raise HTTPException(status_code=404, detail="Question not found")
    
    # We must remove the correct item from the original list
    try:
        # Find the object reference in the original list
        item_to_remove = questions[index]
        data.remove(item_to_remove)
        atomic_write_json(gp, data)
        return {"ok": True, "deleted": item_to_remove}
    except ValueError:
        raise HTTPException(status_code=500, detail="Failed to remove item")

@router.post("/api/golden/test")
def golden_test(payload: Dict[str, Any]) -> Dict[str, Any]:
    q = str(payload.get("q") or "").strip()
    repo = str(payload.get("repo") or os.getenv("REPO", "agro"))
    expect_paths = list(payload.get("expect_paths") or [])
    
    # Handle potential None or string types safely
    raw_k = payload.get("final_k")
    final_k = int(raw_k) if raw_k is not None else int(os.getenv("EVAL_FINAL_K", "5"))
    
    use_multi = payload.get("use_multi", os.getenv("EVAL_MULTI", "1") == "1")

    if use_multi:
        docs = search_routed_multi(q, repo_override=repo, m=4, final_k=final_k)
    else:
        docs = search_routed(q, repo_override=repo, final_k=final_k)

    paths = [d.get("file_path", "") for d in docs]
    hit = any(any(exp in p for p in paths) for exp in expect_paths)

    return {
        "ok": True,
        "question": q,
        "top1_hit": hit, 
        "all_results": docs
    }
