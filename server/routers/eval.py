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
from server.services.config_registry import get_config_registry

router = APIRouter()
_config = get_config_registry()

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

@router.post("/api/eval/run_instrumented")
def eval_run_instrumented(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """Run instrumented evaluation with full Prometheus metrics.

    This endpoint runs the eval and records detailed metrics to Prometheus:
    - Aggregate metrics (accuracy, duration, question count)
    - Per-question results (hit/miss, timing)
    - Configuration snapshot
    - Modality contribution analysis
    """
    global _EVAL_STATUS
    if _EVAL_STATUS["running"]:
        return {"ok": False, "error": "Evaluation already running"}

    def run_thread():
        global _EVAL_STATUS
        _EVAL_STATUS["running"] = True
        try:
            import os
            import json
            import time
            from datetime import datetime
            from pathlib import Path
            from retrieval.hybrid_search import search_routed_multi
            from server.metrics import (
                record_eval_run,
                record_eval_question,
            )

            # Load golden questions
            golden_path = _config.get_str('GOLDEN_PATH', 'data/evaluation_dataset.json')
            if not os.path.exists(golden_path):
                raise FileNotFoundError(f"Golden file not found: {golden_path}")

            gold = json.load(open(golden_path))
            gold = [row for row in gold if 'q' in row]
            total = len(gold)

            # Generate run ID
            run_id = datetime.now().strftime('%Y%m%d_%H%M%S')

            # Extract config snapshot
            config_snapshot = {
                'rrf_k_div': _config.get_int('RRF_K_DIV', 60),
                'bm25_weight': _config.get_float('BM25_WEIGHT', 0.3),
                'vector_weight': _config.get_float('VECTOR_WEIGHT', 0.7),
                'topk_dense': _config.get_int('TOPK_DENSE', 75),
                'topk_sparse': _config.get_int('TOPK_SPARSE', 75),
                'disable_rerank': _config.get_int('DISABLE_RERANK', 0),
                'eval_final_k': _config.get_int('EVAL_FINAL_K', 5),
            }

            # Run eval
            hits_top1 = 0
            hits_topk = 0
            results = []
            t0 = time.time()
            final_k = _config.get_int('EVAL_FINAL_K', 5)

            for i, row in enumerate(gold, 1):
                q = row['q']
                repo = row.get('repo') or os.getenv('REPO', 'project')
                expect = row.get('expect_paths') or []

                q_t0 = time.time()
                docs = search_routed_multi(q, repo_override=repo, final_k=final_k)
                q_duration = time.time() - q_t0

                paths = [d.get('file_path', '') for d in docs]

                def hit(paths, expect):
                    return any(any(exp in p for p in paths) for exp in expect)

                top1_hit = hit(paths[:1], expect) if paths else False
                topk_hit = hit(paths, expect) if paths else False

                if top1_hit:
                    hits_top1 += 1
                if topk_hit:
                    hits_topk += 1

                results.append({
                    'question': q,
                    'repo': repo,
                    'expect_paths': expect,
                    'top_paths': paths,
                    'top1_path': paths[:1] if paths else [],
                    'top1_hit': top1_hit,
                    'topk_hit': topk_hit,
                    'duration_secs': q_duration,
                    'docs': [{'file_path': d.get('file_path', ''), 'score': d.get('score', 0)} for d in docs[:5]]
                })

                # Record per-question metrics
                record_eval_question(
                    run_id=run_id,
                    question_idx=i-1,
                    top1_hit=top1_hit,
                    topk_hit=topk_hit,
                    duration_secs=q_duration
                )

                _EVAL_STATUS["progress"] = i
                _EVAL_STATUS["total"] = total

            dt = time.time() - t0

            # Record aggregate metrics
            record_eval_run(
                run_id=run_id,
                total=total,
                top1_hits=hits_top1,
                topk_hits=hits_topk,
                duration_secs=dt,
                config_params=config_snapshot
            )

            # Save results
            output_dir = Path('data/evals')
            output_dir.mkdir(parents=True, exist_ok=True)

            summary = {
                'run_id': run_id,
                'total': total,
                'top1_hits': hits_top1,
                'topk_hits': hits_topk,
                'top1_accuracy': hits_top1 / max(1, total),
                'topk_accuracy': hits_topk / max(1, total),
                'duration_secs': dt,
                'config': config_snapshot,
                'results': results
            }

            output_file = output_dir / f'eval_{run_id}.json'
            with open(output_file, 'w') as f:
                json.dump(summary, f, indent=2)

            _EVAL_STATUS["results"] = summary

        except Exception as e:
            import traceback
            _EVAL_STATUS["results"] = {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        finally:
            _EVAL_STATUS["running"] = False

    threading.Thread(target=run_thread, daemon=True).start()
    return {"ok": True, "message": "Instrumented evaluation started"}

@router.get("/api/eval/status")
def eval_status() -> Dict[str, Any]:
    return _EVAL_STATUS

@router.get("/api/eval/results")
def eval_results() -> Dict[str, Any]:
    return _EVAL_STATUS["results"] or {"ok": False, "message": "No results"}

@router.get("/api/eval/results/{run_id}")
def eval_results_by_run(run_id: str) -> Dict[str, Any]:
    """Get full eval results for a specific run_id from saved JSON file."""
    eval_dir = Path('data/evals')
    eval_file = eval_dir / f'eval_{run_id}.json'

    if not eval_file.exists():
        raise HTTPException(status_code=404, detail=f"Eval run {run_id} not found")

    try:
        return read_json(eval_file, {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading eval: {str(e)}")

@router.get("/api/eval/question/{run_id}/{question_idx}")
def eval_question_detail(run_id: str, question_idx: int) -> Dict[str, Any]:
    """Get detailed results for a specific question in an eval run."""
    eval_dir = Path('data/evals')
    eval_file = eval_dir / f'eval_{run_id}.json'

    if not eval_file.exists():
        raise HTTPException(status_code=404, detail=f"Eval run {run_id} not found")

    try:
        data = read_json(eval_file, {})
        results = data.get('results', [])

        if question_idx < 0 or question_idx >= len(results):
            raise HTTPException(status_code=404, detail=f"Question {question_idx} not found (max: {len(results)-1})")

        question_result = results[question_idx]
        return {
            "run_id": run_id,
            "question_idx": question_idx,
            "config": data.get('config', {}),
            **question_result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading question: {str(e)}")

@router.post("/api/eval/baseline/save")
def eval_baseline_save() -> Dict[str, Any]:
    """Save current evaluation results as baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No evaluation results to save")

    # Get baseline path from config registry
    baseline_path = Path(_config.get_str("BASELINE_PATH", "data/evals/eval_baseline.json"))
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_json(baseline_path, _EVAL_STATUS["results"])
    return {"ok": True, "path": str(baseline_path)}

@router.get("/api/eval/baseline/compare")
def eval_baseline_compare() -> Dict[str, Any]:
    """Compare current results with baseline."""
    if _EVAL_STATUS["results"] is None:
        raise HTTPException(status_code=400, detail="No current evaluation results")

    # Get baseline path from config registry
    baseline_path = Path(_config.get_str("BASELINE_PATH", "data/evals/eval_baseline.json"))
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
