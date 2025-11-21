"""
System Evaluation Router (Pipeline Quality)

This router handles evaluating the quality of the entire RAG pipeline (retrieval + generation)
against a Golden Dataset. It calculates metrics like Hit Rate and MRR.
"""
import os
import threading
from typing import Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException
from server.utils import atomic_write_json, read_json

router = APIRouter()

# Module-level state (shared within process)
_EVAL_STATUS: Dict[str, Any] = {
    "running": False,
    "progress": 0,
    "total": 0,
    "results": None
}

@router.post("/api/eval/run")
def eval_run(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """Run the full system evaluation suite."""
    global _EVAL_STATUS
    if _EVAL_STATUS["running"]:
        return {"ok": False, "error": "Evaluation already running"}
    
    def run_thread():
        global _EVAL_STATUS
        _EVAL_STATUS["running"] = True
        try:
             from eval.eval_loop import run_eval_with_results
             results = run_eval_with_results(sample_limit=payload.get("sample_limit"))
             _EVAL_STATUS["results"] = results
             _EVAL_STATUS["total"] = results.get("total", 0)
        except Exception as e:
             _EVAL_STATUS["results"] = {"error": str(e)}
        finally:
             _EVAL_STATUS["running"] = False

    threading.Thread(target=run_thread, daemon=True).start()
    return {"ok": True, "message": "Evaluation started"}

@router.get("/api/eval/status")
def eval_status() -> Dict[str, Any]:
    return _EVAL_STATUS

@router.get("/api/eval/results")
def eval_results() -> Dict[str, Any]:
    return _EVAL_STATUS["results"] or {"ok": False, "message": "No results"}

@router.post("/api/eval/baseline/save")
def eval_baseline_save() -> Dict[str, Any]:
    """Save current evaluation results as baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No evaluation results to save")

    # Prefer data/evals, fallback to root if overridden or missing
    env_bp = os.getenv("BASELINE_PATH")
    if env_bp:
        baseline_path = Path(env_bp)
    else:
        candidate = Path("data/evals/eval_baseline.json")
        baseline_path = candidate if candidate.parent.exists() else Path("eval_baseline.json")
    atomic_write_json(baseline_path, _EVAL_STATUS["results"])
    return {"ok": True, "path": str(baseline_path)}

@router.get("/api/eval/baseline/compare")
def eval_baseline_compare() -> Dict[str, Any]:
    """Compare current results with baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No current evaluation results")

    env_bp = os.getenv("BASELINE_PATH")
    if env_bp:
        baseline_path = Path(env_bp)
    else:
        candidate = Path("data/evals/eval_baseline.json")
        baseline_path = candidate if candidate.exists() else Path("eval_baseline.json")
    if not baseline_path.exists():
        return {"ok": False, "message": "No baseline found"}

    baseline = read_json(baseline_path, {})
    current = _EVAL_STATUS["results"]

    curr_top1 = current.get("top1_accuracy", 0)
    base_top1 = baseline.get("top1_accuracy", 0)
    curr_topk = current.get("topk_accuracy", 0)
    base_topk = baseline.get("topk_accuracy", 0)

    delta_top1 = curr_top1 - base_top1
    delta_topk = curr_topk - base_topk

    # Find regressions and improvements
    regressions = []
    improvements = []

    curr_results = current.get("results", [])
    base_results = baseline.get("results", [])

    # Simple O(N^2) match for clarity, assuming small result sets
    for curr_res in curr_results:
        q = curr_res.get("question")
        base_res = next((b for b in base_results if b.get("question") == q), None)
        if not base_res:
            continue
        
        c_hit = curr_res.get("hit", False)
        b_hit = base_res.get("hit", False)
        
        if not c_hit and b_hit:
            regressions.append(q)
        elif c_hit and not b_hit:
            improvements.append(q)

    return {
        "ok": True,
        "metrics": {
            "current_top1": curr_top1,
            "baseline_top1": base_top1,
            "delta_top1": delta_top1,
            "delta_topk": delta_topk,
            "regressions": len(regressions),
            "improvements": len(improvements)
        },
        "regressions_list": regressions,
        "improvements_list": improvements
    }
