import json
import os
import sys
import threading
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from common.paths import repo_root
from server.telemetry import LOG_PATH, log_feedback_event


router = APIRouter()

# Shared in-process status for mining/training tasks
_STATUS: Dict[str, Any] = {
    "running": False,
    "task": "",
    "progress": 0,
    "message": "",
    "result": None,
    "live_output": [],  # last N lines
}


@router.get("/api/reranker/status")
def reranker_status() -> Dict[str, Any]:
    return _STATUS


@router.post("/api/reranker/mine")
def reranker_mine() -> Dict[str, Any]:
    global _STATUS
    if _STATUS.get("running"):
        return {"ok": False, "error": "A reranker task is already running"}

    def run_mine():
        global _STATUS
        _STATUS = {"running": True, "task": "mining", "progress": 0, "message": "Mining triplets...", "result": None, "live_output": []}
        try:
            import subprocess
            proc = subprocess.Popen(
                [sys.executable, "scripts/mine_triplets.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(repo_root()),
                bufsize=1,
            )

            out_lines = []
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                out_lines.append(line)
                _STATUS["live_output"].append(line)
                if len(_STATUS["live_output"]) > 1000:
                    _STATUS["live_output"] = _STATUS["live_output"][-1000:]

            proc.wait(timeout=300)
            output = "\n".join(out_lines)
            if proc.returncode == 0:
                _STATUS["message"] = output.strip() or "Mining complete"
                _STATUS["result"] = {"ok": True, "output": output}
            else:
                _STATUS["message"] = f"Mining failed (exit code {proc.returncode})"
                _STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _STATUS["message"] = f"Error: {str(e)}"
            _STATUS["result"] = {"ok": False, "error": str(e)}
            _STATUS["live_output"].append(f"ERROR: {str(e)}")
        finally:
            _STATUS["running"] = False
            _STATUS["progress"] = 100

    threading.Thread(target=run_mine, daemon=True).start()
    return {"ok": True, "message": "Mining started"}


@router.post("/api/reranker/train")
def reranker_train(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    global _STATUS
    if _STATUS.get("running"):
        return {"ok": False, "error": "A reranker task is already running"}

    epochs = int(payload.get("epochs", 2))
    batch_size = int(payload.get("batch_size", 16))
    max_length = int(payload.get("max_length", 512))

    def run_train():
        import subprocess, re
        global _STATUS
        _STATUS = {"running": True, "task": "training", "progress": 0, "message": f"Training model ({epochs} epochs)...", "result": None, "live_output": []}
        try:
            proc = subprocess.Popen(
                [
                    sys.executable,
                    "scripts/train_reranker.py",
                    "--epochs", str(epochs),
                    "--batch", str(batch_size),
                    "--max_length", str(max_length),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(repo_root()),
                bufsize=1,
            )
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                _STATUS["live_output"].append(line)
                if len(_STATUS["live_output"]) > 1000:
                    _STATUS["live_output"] = _STATUS["live_output"][-1000:]
                # Parse epoch progress: [EPOCH x/y]
                m = re.search(r"\[EPOCH (\d+)/(\d+)\]", line)
                if m:
                    cur, total = int(m.group(1)), int(m.group(2))
                    _STATUS["progress"] = int((cur / max(1, total)) * 100)
                    _STATUS["message"] = line.strip()
            proc.wait(timeout=3600)
            output = "\n".join(_STATUS["live_output"])
            if proc.returncode == 0:
                _STATUS["message"] = "Training complete!"
                _STATUS["result"] = {"ok": True, "output": output}
            else:
                _STATUS["message"] = f"Training failed (exit code {proc.returncode})"
                _STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _STATUS["message"] = f"Error: {str(e)}"
            _STATUS["result"] = {"ok": False, "error": str(e)}
        finally:
            _STATUS["running"] = False
            _STATUS["progress"] = 100

    threading.Thread(target=run_train, daemon=True).start()
    return {"ok": True, "message": "Training started"}


@router.post("/api/reranker/evaluate")
def reranker_evaluate(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    global _STATUS
    if _STATUS.get("running"):
        return {"ok": False, "error": "A reranker task is already running"}

    def run_eval():
        import subprocess
        global _STATUS
        _STATUS = {"running": True, "task": "evaluating", "progress": 0, "message": "Evaluating model...", "result": None, "live_output": []}
        try:
            proc = subprocess.Popen(
                [sys.executable, "scripts/eval_reranker.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(repo_root()),
                bufsize=1,
            )
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                _STATUS["live_output"].append(line)
                if len(_STATUS["live_output"]) > 1000:
                    _STATUS["live_output"] = _STATUS["live_output"][-1000:]
            proc.wait(timeout=1800)
            output = "\n".join(_STATUS["live_output"])
            if proc.returncode == 0:
                _STATUS["message"] = "Evaluation complete!"
                _STATUS["result"] = {"ok": True, "output": output}
            else:
                _STATUS["message"] = f"Evaluation failed (exit code {proc.returncode})"
                _STATUS["result"] = {"ok": False, "error": output}
        except Exception as e:
            _STATUS["message"] = f"Error: {str(e)}"
            _STATUS["result"] = {"ok": False, "error": str(e)}
        finally:
            _STATUS["running"] = False
            _STATUS["progress"] = 100

    threading.Thread(target=run_eval, daemon=True).start()
    return {"ok": True, "message": "Evaluation started"}


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
        lines = [l for l in current.splitlines() if 'mine_triplets.py' not in l and 'train_reranker.py' not in l]
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
        lines = [l for l in current.splitlines() if 'mine_triplets.py' not in l and 'train_reranker.py' not in l]
        new_cron = "\n".join(lines) + "\n" if lines else ""
        proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=new_cron)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/api/reranker/smoketest")
def reranker_smoketest(payload: Dict[str, Any]) -> Dict[str, Any]:
    from retrieval.hybrid_search import search_routed_multi
    from server.metrics import set_retrieval_quality
    from server.tracing import latest_trace_path  # not used, keeps parity
    from server.telemetry import log_query_event
    import time
    q = str(payload.get("query", "")).strip()
    if not q:
        return {"ok": False, "error": "Query required"}
    start = time.time()
    try:
        docs = list(search_routed_multi(q, m=2, final_k=5))
        retrieved_for_log = []
        for d in docs:
            retrieved_for_log.append({
                "doc_id": d.get("file_path", "") + f":{d.get('start_line', 0)}-{d.get('end_line', 0)}",
                "score": float(d.get("rerank_score", 0.0) or 0.0),
                "text": (d.get("code", "") or "")[:300],
                "clicked": False,
            })
        event_id = log_query_event(
            query_raw=q,
            query_rewritten=None,
            retrieved=retrieved_for_log,
            answer_text="[Smoke test - no generation]",
            latency_ms=int((time.time() - start) * 1000),
            route="/api/reranker/smoketest",
            client_ip=None,
            user_agent=None,
        )
        return {"ok": True, "logged": True, "results_count": len(docs), "event_id": event_id}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/api/reranker/logs/count")
def reranker_logs_count() -> Dict[str, Any]:
    count = 0
    if LOG_PATH.exists():
        with LOG_PATH.open("r", encoding="utf-8") as f:
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
    logs = []
    if LOG_PATH.exists():
        with LOG_PATH.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    logs.append(json.loads(line))
                except Exception:
                    pass
    return {"logs": logs[-100:], "count": len(logs)}


@router.get("/api/reranker/costs")
def reranker_costs() -> Dict[str, Any]:
    import datetime
    if not LOG_PATH.exists():
        return {"total_24h": 0.0, "avg_per_query": 0.0, "queries_24h": 0}
    now = datetime.datetime.now(datetime.timezone.utc)
    day_ago = now - datetime.timedelta(hours=24)
    total = 0.0
    count = 0
    with LOG_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                ts_str = evt.get("ts", "")
                ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if ts >= day_ago:
                    total += evt.get("cost_usd", 0.0) or 0.0
                    count += 1
            except Exception:
                pass
    return {"total_24h": round(total, 4), "avg_per_query": round(total / max(1, count), 6), "queries_24h": count}


@router.get("/api/reranker/nohits")
def reranker_nohits() -> Dict[str, Any]:
    if not LOG_PATH.exists():
        return {"queries": [], "count": 0}
    nohits = []
    with LOG_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get("type") != "query":
                    continue
                retrieval = evt.get("retrieval", [])
                if not retrieval:
                    nohits.append({"query": evt.get("query_raw", ""), "ts": evt.get("ts", "")})
            except Exception:
                pass
    return {"queries": nohits[-50:], "count": len(nohits)}


@router.post("/api/reranker/click")
def reranker_click(payload: Dict[str, Any]) -> Dict[str, Any]:
    event_id = str(payload.get("event_id") or "").strip()
    doc_id = str(payload.get("doc_id") or "").strip()
    if not event_id or not doc_id:
        raise HTTPException(status_code=400, detail="event_id and doc_id required")
    log_feedback_event(event_id, {"signal": "click", "doc_id": doc_id})
    return {"ok": True}
