import sys
import threading
from typing import Any, Dict

from fastapi import APIRouter

from common.paths import repo_root

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
def reranker_mine(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    global _STATUS
    if _STATUS.get("running"):
        return {"ok": False, "error": "A reranker task is already running"}

    # Extract params
    log_path = payload.get("log_path")
    triplets_path = payload.get("triplets_path")
    mode = payload.get("mode")
    reset = payload.get("reset")

    def run_mine():
        global _STATUS
        _STATUS = {"running": True, "task": "mining", "progress": 0, "message": "Mining triplets...", "result": None, "live_output": []}
        try:
            import subprocess
            import os
            
            # Prepare env with overrides
            env = os.environ.copy()
            if log_path:
                env["AGRO_LOG_PATH"] = str(log_path)
            if triplets_path:
                env["AGRO_TRIPLETS_PATH"] = str(triplets_path)
            if mode:
                env["AGRO_RERANKER_MINE_MODE"] = str(mode)
            if reset is not None:
                env["AGRO_RERANKER_MINE_RESET"] = "1" if reset else "0"

            proc = subprocess.Popen(
                [sys.executable, "scripts/mine_triplets.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(repo_root()),
                env=env,
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
    
    triplets_path = payload.get("triplets_path")
    output_path = payload.get("output_path")
    base_model = payload.get("base_model")

    def run_train():
        import subprocess
        import re
        global _STATUS
        _STATUS = {"running": True, "task": "training", "progress": 0, "message": f"Training model ({epochs} epochs)...", "result": None, "live_output": []}
        try:
            cmd = [
                sys.executable,
                "scripts/train_reranker.py",
                "--epochs", str(epochs),
                "--batch", str(batch_size),
                "--max_length", str(max_length),
            ]
            if triplets_path:
                cmd.extend(["--triplets", str(triplets_path)])
            if output_path:
                cmd.extend(["--out", str(output_path)])
            if base_model:
                cmd.extend(["--base", str(base_model)])

            proc = subprocess.Popen(
                cmd,
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
