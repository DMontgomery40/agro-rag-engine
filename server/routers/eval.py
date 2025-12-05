"""
System Evaluation Router (Pipeline Quality)

This router handles evaluating the quality of the entire RAG pipeline (retrieval + generation)
against a Golden Dataset. It calculates metrics like Hit Rate and MRR.
"""
import os
import json
import time
import threading
from typing import Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from server.utils import atomic_write_json, read_json
from server.services.config_registry import get_config_registry
from eval.eval_rag import capture_eval_config, stamp_eval_runtime_config

router = APIRouter()
_config = get_config_registry()

# Module-level state (shared within process)
_EVAL_STATUS: Dict[str, Any] = {
    "running": False,
    "progress": 0,
    "total": 0,
    "results": None
}


def _hydrate_config_with_runtime(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure eval results include the actual runtime params even if older runs missed stamping."""
    cfg = dict(data.get("config") or {})
    # Prefer recorded values, otherwise fall back to config snapshot
    use_multi_val = data.get("use_multi")
    if use_multi_val is None:
        use_multi_val = cfg.get("use_multi", cfg.get("eval_multi"))
    final_k_val = data.get("final_k")
    if final_k_val is None:
        final_k_val = cfg.get("final_k", cfg.get("eval_final_k", _config.get_int("EVAL_FINAL_K", 5)))
    multi_m_val = cfg.get("eval_multi_m") or cfg.get("multi_m") or _config.get_int("EVAL_MULTI_M", 10)

    cfg = stamp_eval_runtime_config(
        cfg,
        use_multi_val=bool(use_multi_val),
        final_k_val=int(final_k_val),
        multi_m_val=int(multi_m_val) if multi_m_val is not None else None,
    )
    data = dict(data)
    data["config"] = cfg
    return data

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
             results = run_eval_with_results(
                 sample_limit=payload.get("sample_limit"),
                 use_multi_override=payload.get("use_multi"),
                 final_k_override=payload.get("final_k")
             )
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

            # Use centralized config capture with whitelist and stamp actual run params
            use_multi_val = _config.get_int('EVAL_MULTI', 1) == 1
            final_k = _config.get_int('EVAL_FINAL_K', 5)
            multi_m_val = _config.get_int('EVAL_MULTI_M', 10)
            config_snapshot = stamp_eval_runtime_config(
                capture_eval_config(),
                use_multi_val=use_multi_val,
                final_k_val=final_k,
                multi_m_val=multi_m_val,
            )

            # Run eval
            hits_top1 = 0
            hits_topk = 0
            results = []
            t0 = time.time()

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


@router.get("/api/eval/run/stream")
async def eval_run_stream(
    request: Request,
    use_multi: Optional[int] = None,
    final_k: Optional[int] = None,
    sample_limit: Optional[int] = None
):
    """Run evaluation and stream raw logs/progress via SSE."""
    global _EVAL_STATUS

    if _EVAL_STATUS["running"]:
        async def already_running():
            yield f"data: {json.dumps({'type': 'error', 'message': 'Evaluation already running'})}\n\n"
        return StreamingResponse(already_running(), media_type="text/event-stream")

    async def generate():
        global _EVAL_STATUS
        _EVAL_STATUS["running"] = True
        _EVAL_STATUS["progress"] = 0
        _EVAL_STATUS["results"] = None

        # Resolve settings with per-run overrides falling back to config
        try:
            default_use_multi = _config.get_int('EVAL_MULTI', 1) == 1
            default_final_k = _config.get_int('EVAL_FINAL_K', 5)
            use_multi_val = default_use_multi if use_multi is None else bool(int(use_multi))
            final_k_val = default_final_k if final_k is None else max(1, int(final_k))

            # Resolve golden path
            from eval.eval_rag import _resolve_golden_path, hit, MULTI_M  # type: ignore
            from retrieval.hybrid_search import search_routed, search_routed_multi

            golden_path = _resolve_golden_path()
            start_msg = f"Starting eval: use_multi={use_multi_val}, final_k={final_k_val}, sample_limit={sample_limit if sample_limit else 'all'}, golden={golden_path}"
            yield f"data: {json.dumps({'type': 'log', 'message': start_msg})}\n\n"

            if not os.path.exists(golden_path):
                msg = f"No golden questions file found at {golden_path}"
                _EVAL_STATUS["results"] = {"error": msg}
                yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
                return

            try:
                with open(golden_path) as f:
                    raw_gold = json.load(f)
            except Exception as e:
                msg = f"Failed to read golden file: {e}"
                _EVAL_STATUS["results"] = {"error": msg}
                yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
                return

            # Validate questions
            gold = []
            for i, row in enumerate(raw_gold):
                if not isinstance(row, dict) or 'q' not in row:
                    continue
                if not row.get('q', '').strip():
                    continue
                gold.append(row)

            if sample_limit and sample_limit > 0:
                gold = gold[:sample_limit]

            total = len(gold)
            _EVAL_STATUS["total"] = total

            if total == 0:
                msg = "No valid golden questions found"
                _EVAL_STATUS["results"] = {"error": msg}
                yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
                return

            hits_top1 = 0
            hits_topk = 0
            results = []
            start_time = time.time()

            yield f"data: {json.dumps({'type': 'log', 'message': f'Loaded {total} questions'})}\n\n"

            for idx, row in enumerate(gold, 1):
                if await request.is_disconnected():
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Client disconnected'})}\n\n"
                    break

                q = row['q']
                repo = row.get('repo') or os.getenv('REPO', 'agro')
                expect = row.get('expect_paths') or []

                yield f"data: {json.dumps({'type': 'log', 'message': f'[{idx}/{total}] {q}'})}\n\n"

                try:
                    if use_multi_val:
                        docs = search_routed_multi(q, repo_override=repo, m=MULTI_M, final_k=final_k_val)
                    else:
                        docs = search_routed(q, repo_override=repo, final_k=final_k_val)
                except Exception as e:
                    docs = []
                    err_msg = f"⚠ Search failed: {e}"
                    yield f"data: {json.dumps({'type': 'log', 'message': err_msg})}\n\n"

                paths = [d.get('file_path', '') for d in docs]
                top1_hit = hit(paths[:1], expect) if paths else False
                topk_hit = hit(paths, expect) if paths else False

                if top1_hit:
                    hits_top1 += 1
                if topk_hit:
                    hits_topk += 1

                results.append({
                    "question": q,
                    "repo": repo,
                    "expect_paths": expect,
                    "top1_path": paths[:1],
                    "top1_hit": top1_hit,
                    "topk_hit": topk_hit,
                    "top_paths": paths[:final_k_val]
                })

                percent = (idx / total) * 100 if total else 0
                _EVAL_STATUS["progress"] = idx
                yield f"data: {json.dumps({'type': 'progress', 'percent': percent, 'message': f'Question {idx}/{total}'})}\n\n"

            duration = time.time() - start_time
            top1_accuracy = hits_top1 / max(1, total)
            topk_accuracy = hits_topk / max(1, total)

            # Generate run_id for persistence and traceability
            run_id = time.strftime("%Y%m%d_%H%M%S")

            # Capture config using the centralized whitelist and stamp run overrides
            eval_config = capture_eval_config()
            eval_config = stamp_eval_runtime_config(
                eval_config,
                use_multi_val=use_multi_val,
                final_k_val=final_k_val,
                multi_m_val=MULTI_M,
            )

            summary = {
                "run_id": run_id,
                "total": total,
                "top1_hits": hits_top1,
                "topk_hits": hits_topk,
                "top1_accuracy": round(top1_accuracy, 3),
                "topk_accuracy": round(topk_accuracy, 3),
                "final_k": final_k_val,
                "use_multi": use_multi_val,
                "duration_secs": round(duration, 2),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "config": eval_config,
                "results": results
            }

            _EVAL_STATUS["results"] = summary

            # Save results to disk for persistence across server restarts
            try:
                output_dir = Path('data/evals')
                output_dir.mkdir(parents=True, exist_ok=True)

                output_file = output_dir / f'eval_{run_id}.json'
                with open(output_file, 'w') as f:
                    json.dump(summary, f, indent=2)

                yield f"data: {json.dumps({'type': 'log', 'message': f'Results saved to {output_file}'})}\n\n"
            except Exception as e:
                # Log error but don't fail the eval
                yield f"data: {json.dumps({'type': 'log', 'message': f'Warning: Failed to save results: {e}'})}\n\n"

            yield f"data: {json.dumps({'type': 'log', 'message': f'Complete: top1={hits_top1}/{total}, topk={hits_topk}/{total}, duration={round(duration, 2)}s'})}\n\n"
            yield "data: {\"type\": \"complete\"}\n\n"
        finally:
            _EVAL_STATUS["running"] = False

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("/api/eval/status")
def eval_status() -> Dict[str, Any]:
    return _EVAL_STATUS

@router.get("/api/eval/results")
def eval_results() -> Dict[str, Any]:
    res = _EVAL_STATUS["results"]
    if not res:
        return {"ok": False, "message": "No results"}
    try:
        return _hydrate_config_with_runtime(res)
    except Exception:
        return res

@router.get("/api/eval/results/{run_id}")
def eval_results_by_run(run_id: str) -> Dict[str, Any]:
    """Get full eval results for a specific run_id from saved JSON file."""
    eval_dir = Path('data/evals')
    eval_file = eval_dir / f'eval_{run_id}.json'

    if not eval_file.exists():
        raise HTTPException(status_code=404, detail=f"Eval run {run_id} not found")

    try:
        data = read_json(eval_file, {})
        return _hydrate_config_with_runtime(data)
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

@router.get("/api/eval/runs")
def eval_list_runs() -> Dict[str, Any]:
    """List all available eval runs with summary info."""
    eval_dir = Path('data/evals')
    if not eval_dir.exists():
        return {"ok": True, "runs": []}

    runs = []
    for eval_file in eval_dir.glob('eval_*.json'):
        # Skip special baseline file - it's not a real eval run
        if eval_file.name == 'eval_baseline.json':
            continue
        try:
            data = read_json(eval_file, {})
            run_id = data.get('run_id', eval_file.stem.replace('eval_', ''))
            # Skip runs that don't have a proper timestamp-based run_id
            # (they're likely test/debug files)
            if not run_id or not run_id[0].isdigit():
                continue
            runs.append({
                'run_id': run_id,
                'top1_accuracy': data.get('top1_accuracy', 0),
                'topk_accuracy': data.get('topk_accuracy', 0),
                'total': data.get('total', 0),
                'duration_secs': data.get('duration_secs', 0),
                'has_config': bool(data.get('config')),  # Let UI know if config exists
                '_mtime': eval_file.stat().st_mtime  # File modification time for sorting
            })
        except Exception:
            continue

    # Sort by file modification time descending (newest first)
    # This is more reliable than run_id since run_ids can have timezone issues
    runs.sort(key=lambda r: r['_mtime'], reverse=True)
    # Remove internal _mtime field before returning
    for r in runs:
        r.pop('_mtime', None)

    return {"ok": True, "runs": runs}

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

@router.post("/api/eval/load_historical_metrics")
def load_historical_metrics_endpoint() -> Dict[str, Any]:
    """Load historical eval metrics from disk and re-export them to Prometheus.

    This is needed to restore metrics after API server restarts, so Grafana
    dashboards can compare multiple eval runs.
    """
    try:
        from server.metrics import load_historical_eval_metrics
        load_historical_eval_metrics()
        return {"ok": True, "message": "Historical eval metrics loaded successfully"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/api/eval/analyze_comparison")
def analyze_eval_comparison(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Use LLM to analyze eval comparison and provide insights.
    
    Body: { current_run: {...}, compare_run: {...}, config_diffs: [...] }
    Returns: { analysis: str, suggestions: [...] }
    """
    try:
        from server.env_model import generate_text
        
        current_run = payload.get("current_run", {})
        compare_run = payload.get("compare_run", {})
        config_diffs = payload.get("config_diffs", [])
        # Top-K question-level changes (what's shown in the results table)
        topk_regressions = payload.get("topk_regressions", payload.get("regressions", []))
        topk_improvements = payload.get("topk_improvements", payload.get("improvements", []))
        # Top-1 counts for sanity checking
        top1_regressions_count = payload.get("top1_regressions_count", 0)
        top1_improvements_count = payload.get("top1_improvements_count", 0)
        
        # Get eval analysis prompt from config (or use default)
        default_system_prompt = """You are an expert RAG (Retrieval-Augmented Generation) system analyst.
Your job is to analyze evaluation comparisons and provide HONEST, SKEPTICAL insights.

CRITICAL: Do NOT force explanations that don't make sense. If the data is contradictory or confusing:
- Say so clearly: "This result is surprising and may indicate other factors at play"
- Consider: index changes, data drift, golden question updates, or measurement noise
- Acknowledge when correlation ≠ causation
- It's BETTER to say "I'm not sure why this happened" than to fabricate a plausible-sounding but wrong explanation

Be rigorous:
1. Question whether the config changes ACTUALLY explain the performance delta
2. Flag when results seem counterintuitive (e.g., disabling a feature improving results)
3. Consider confounding variables: Was the index rebuilt? Did the test set change?
4. Provide actionable suggestions only when you have reasonable confidence

Format your response with clear sections using markdown headers."""
        system_prompt = _config.get_str('PROMPT_EVAL_ANALYSIS', default_system_prompt)

        # Build user prompt with eval data
        current_metrics = f"""Top-1 Accuracy: {current_run.get('top1_accuracy', 0) * 100:.1f}%
Top-K Accuracy: {current_run.get('topk_accuracy', 0) * 100:.1f}%
Total Questions: {current_run.get('total', 0)}
Duration: {current_run.get('duration_secs', 0):.1f}s"""

        compare_metrics = f"""Top-1 Accuracy: {compare_run.get('top1_accuracy', 0) * 100:.1f}%
Top-K Accuracy: {compare_run.get('topk_accuracy', 0) * 100:.1f}%
Total Questions: {compare_run.get('total', 0)}
Duration: {compare_run.get('duration_secs', 0):.1f}s"""

        delta_top1 = (current_run.get('top1_accuracy', 0) - compare_run.get('top1_accuracy', 0)) * 100
        delta_topk = (current_run.get('topk_accuracy', 0) - compare_run.get('topk_accuracy', 0)) * 100

        config_changes_str = "\n".join([
            f"- **{d.get('key', 'unknown')}**: {d.get('previous', d.get('prev', '?'))} → {d.get('current', d.get('curr', '?'))}"
            for d in config_diffs[:15]  # Limit to 15 most important changes
        ]) if config_diffs else "No configuration changes detected."

        # Build question lists
        topk_regression_list = "\n".join([f"- {r.get('question', 'Unknown')}" for r in topk_regressions[:10]]) if topk_regressions else "None"
        topk_improvement_list = "\n".join([f"- {i.get('question', 'Unknown')}" for i in topk_improvements[:10]]) if topk_improvements else "None"

        # Calculate expected counts from accuracy deltas for sanity check
        total = current_run.get('total', 50)
        expected_top1_delta = round(delta_top1 * total / 100)
        expected_topk_delta = round(delta_topk * total / 100)

        user_prompt = f"""## Eval Comparison Analysis Request

### BEFORE Run ({compare_run.get('run_id', 'baseline')})
{compare_metrics}

### AFTER Run ({current_run.get('run_id', 'current')})
{current_metrics}

### Performance Delta
- Top-1: {'+' if delta_top1 >= 0 else ''}{delta_top1:.1f}% (expected ~{expected_top1_delta:+d} questions)
- Top-K: {'+' if delta_topk >= 0 else ''}{delta_topk:.1f}% (expected ~{expected_topk_delta:+d} questions)

### Question-Level Changes (Top-K metric)
- **Top-K Regressions**: {len(topk_regressions)} questions got worse
- **Top-K Improvements**: {len(topk_improvements)} questions got better

### Question-Level Changes (Top-1 metric)
- **Top-1 Regressions**: {top1_regressions_count} questions got worse  
- **Top-1 Improvements**: {top1_improvements_count} questions got better

### Configuration Changes
{config_changes_str}

### Top-K Regressed Questions (sample)
{topk_regression_list}

### Top-K Improved Questions (sample)
{topk_improvement_list}

---

Please analyze this comparison and provide:
1. **Root Cause Analysis**: What likely caused the performance change?
2. **Recommendations**: 2-3 specific, actionable suggestions to improve results
3. **Risk Assessment**: Any concerns about the configuration changes?

Keep the analysis concise (under 400 words) but insightful."""

        # Call the LLM - use gpt-5.1 for best analysis
        analysis_model = _config.get_str("GEN_MODEL", "gpt-5.1")
        analysis_text, _meta = generate_text(
            user_input=user_prompt,
            system_instructions=system_prompt,
            model=analysis_model
        )

        return {
            "ok": True,
            "analysis": analysis_text,
            "model_used": analysis_model
        }

    except Exception as e:
        import traceback
        return {
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
