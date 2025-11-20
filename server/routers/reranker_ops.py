import os
import sys
import json
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from common.paths import repo_root
from server.utils import atomic_write_json, read_json
from server.routers.reranker_learning import _STATUS as _RERANKER_STATUS

router = APIRouter()

@router.get("/api/reranker/logs/count")
def reranker_logs_count() -> Dict[str, Any]:
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    count = 0
    if log_path.exists():
        with log_path.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip() and '"type":"query"' in line:
                    count += 1
    return {"count": count}

@router.get("/api/reranker/triplets/count")
def reranker_triplets_count() -> Dict[str, Any]:
    triplets_path = repo_root() / "data" / "training" / "triplets.jsonl"
    count = 0
    if triplets_path.exists():
        with triplets_path.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
    return {"count": count}

@router.get("/api/reranker/logs")
def reranker_logs() -> Dict[str, Any]:
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    logs = []
    if log_path.exists():
        with log_path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    logs.append(json.loads(line))
                except Exception:
                    pass
    return {"logs": logs[-100:], "count": len(logs)}

@router.get("/api/reranker/logs/download")
def reranker_logs_download():
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Log file not found")
    return FileResponse(str(log_path), filename="queries.jsonl")

@router.post("/api/reranker/logs/clear")
def reranker_logs_clear() -> Dict[str, Any]:
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    try:
        if log_path.exists():
            log_path.unlink()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/api/reranker/cron/setup")
def reranker_cron_setup(payload: Dict[str, Any]) -> Dict[str, Any]:
    import subprocess
    time_str = str(payload.get("time", "02:15"))
    try:
        hour, minute = time_str.split(":")
    except ValueError:
        return {"ok": False, "error": "Invalid time format, expected HH:MM"}
    py_path = sys.executable
    cron_line = f'{minute} {hour} * * * cd {repo_root()} && {py_path} scripts/mine_triplets.py && {py_path} scripts/train_reranker.py --epochs 1 && {py_path} scripts/eval_reranker.py >> data/logs/nightly_reranker.log 2>&1'
    try:
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current = result.stdout if result.returncode == 0 else ""
        lines = [line for line in current.splitlines() if 'mine_triplets.py' not in line and 'train_reranker.py' not in line]
        lines.append(cron_line)
        new_cron = "\n".join(lines) + "\n"
        proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=new_cron)
        return {"ok": True, "time": time_str}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/api/reranker/cron/remove")
def reranker_cron_remove() -> Dict[str, Any]:
    import subprocess
    try:
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current = result.stdout if result.returncode == 0 else ""
        lines = [line for line in current.splitlines() if 'mine_triplets.py' not in line and 'train_reranker.py' not in line]
        new_cron = "\n".join(lines) + "\n" if lines else ""
        proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=new_cron)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/api/reranker/baseline/save")
def reranker_baseline_save() -> Dict[str, Any]:
    if not _RERANKER_STATUS.get("result"):
        return {"ok": False, "error": "No evaluation results to save"}
    
    baseline_path = Path("data/evals/reranker_baseline.json")
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_json(baseline_path, _RERANKER_STATUS["result"])
    
    # Also backup current model
    import shutil
    model_path = Path(os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"))
    if model_path.exists():
        backup_path = model_path.parent / (model_path.name + ".baseline")
        if backup_path.exists():
            shutil.rmtree(backup_path)
        shutil.copytree(model_path, backup_path)
    
    return {"ok": True, "path": str(baseline_path)}

@router.get("/api/reranker/baseline/compare")
def reranker_baseline_compare() -> Dict[str, Any]:
    baseline_path = Path("data/evals/reranker_baseline.json")
    if not baseline_path.exists():
        return {"ok": False, "error": "No baseline found"}
    
    if not _RERANKER_STATUS.get("result"):
        return {"ok": False, "error": "No current evaluation results"}
    
    baseline = read_json(baseline_path, {})
    current = _RERANKER_STATUS["result"]
    
    def parse_metrics(output):
        if not output:
            return {}
        import re
        mrr = 0.0
        hit1 = 0.0
        match_mrr = re.search(r'MRR@all:\s*([\d\.]+)', output)
        match_hit1 = re.search(r'Hit@1:\s*([\d\.]+)', output)
        if match_mrr:
            mrr = float(match_mrr.group(1))
        if match_hit1:
            hit1 = float(match_hit1.group(1))
        return {"mrr": mrr, "hit1": hit1}
    
    base_m = parse_metrics(baseline.get("output", ""))
    curr_m = parse_metrics(current.get("output", ""))
    
    return {
        "ok": True,
        "baseline": base_m,
        "current": curr_m,
        "delta": {
            "mrr": curr_m.get("mrr", 0) - base_m.get("mrr", 0),
            "hit1": curr_m.get("hit1", 0) - base_m.get("hit1", 0)
        }
    }

@router.post("/api/reranker/rollback")
def reranker_rollback() -> Dict[str, Any]:
    import shutil
    model_path = Path(os.getenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro"))
    backup_path = model_path.parent / (model_path.name + ".backup")
    
    if not backup_path.exists():
        return {"ok": False, "error": "No backup model found"}
    
    try:
        if model_path.exists():
            old_path = model_path.parent / (model_path.name + ".old")
            if old_path.exists():
                shutil.rmtree(old_path)
            shutil.move(str(model_path), str(old_path))
        shutil.copytree(backup_path, model_path)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/api/reranker/smoketest")
def reranker_smoketest(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    from retrieval.hybrid_search import search_routed_multi
    from server.telemetry import log_query_event
    import time
    
    query = payload.get("query", "").strip()
    if not query:
        return {"ok": False, "error": "Query required"}
    
    start = time.time()
    try:
        docs = list(search_routed_multi(query, m=2, final_k=5))
        reranked = os.getenv("AGRO_RERANKER_ENABLED", "0") == "1"
        
        retrieved_for_log = []
        for d in docs:
            retrieved_for_log.append({
                "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                "score": float(d.get("rerank_score", 0.0) or 0.0),
                "text": (d.get("code", "") or "")[:300],
                "clicked": False,
            })
        
        event_id = log_query_event(
            query_raw=query,
            query_rewritten=None,
            retrieved=retrieved_for_log,
            answer_text="[Smoke test - no generation]",
            latency_ms=int((time.time() - start) * 1000),
            route="/api/reranker/smoketest",
            client_ip=(getattr(getattr(request, 'client', None), 'host', None) if request else None),
            user_agent=(request.headers.get('user-agent') if request else None),
        )
        
        return {
            "ok": True,
            "logged": True,
            "results_count": len(docs),
            "reranked": reranked,
            "event_id": event_id
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/api/reranker/costs")
def reranker_costs() -> Dict[str, Any]:
    import datetime
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    
    if not log_path.exists():
        return {"total_24h": 0.0, "avg_per_query": 0.0, "queries_24h": 0}
    
    now = datetime.datetime.now(datetime.timezone.utc)
    day_ago = now - datetime.timedelta(hours=24)
    total_cost = 0.0
    count = 0
    
    with log_path.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                ts_str = evt.get("ts", "")
                ts = datetime.datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                if ts >= day_ago:
                    total_cost += evt.get("cost_usd", 0.0) or 0.0
                    count += 1
            except Exception:
                pass
    
    return {"total_24h": round(total_cost, 4), "avg_per_query": round(total_cost / max(1, count), 6), "queries_24h": count}

@router.get("/api/reranker/nohits")
def reranker_nohits() -> Dict[str, Any]:
    log_path = Path(os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl"))
    if not log_path.exists():
        return {"queries": [], "count": 0}
    
    nohits = []
    with log_path.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                retrieval = evt.get("retrieval", [])
                if not retrieval or len(retrieval) == 0:
                    nohits.append({
                        "query": evt.get("query_raw", ""),
                        "ts": evt.get("ts", "")
                    })
            except Exception:
                pass
    return {"queries": nohits[-50:], "count": len(nohits)}

@router.post("/api/reranker/click")
def reranker_click(payload: Dict[str, Any]) -> Dict[str, Any]:
    event_id = payload.get("event_id")
    doc_id = payload.get("doc_id")
    if not event_id or not doc_id:
        raise HTTPException(status_code=400, detail="event_id and doc_id required")
    from server.telemetry import log_feedback_event
    log_feedback_event(event_id, {"signal": "click", "doc_id": doc_id})
    return {"ok": True}

@router.get("/api/reranker/eval/latest")
def get_latest_reranker_eval() -> Dict[str, Any]:
    """Get latest reranker evaluation results."""
    eval_path = repo_root() / "data" / "evals" / "latest.json"
    if not eval_path.exists():
        return {"metrics": None}

    try:
        with open(eval_path) as f:
            return json.load(f)
    except Exception:
        return {"metrics": None}

@router.post("/api/reranker/mine_golden")
def reranker_mine_golden() -> Dict[str, Any]:
    import subprocess
    try:
        script = repo_root() / "scripts" / "mine_golden.py"
        res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        return {"ok": res.returncode == 0, "stdout": res.stdout, "stderr": res.stderr}
    except Exception as e:
        return {"ok": False, "error": str(e)}
