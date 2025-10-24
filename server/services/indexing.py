import asyncio
import os
import subprocess
import sys
import threading
from typing import Any, Dict, List

from common.paths import repo_root
from server.index_stats import get_index_stats as _get_index_stats

_INDEX_STATUS: List[str] = []
_INDEX_METADATA: Dict[str, Any] = {}


def start(payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    global _INDEX_STATUS, _INDEX_METADATA
    payload = payload or {}
    _INDEX_STATUS = ["Indexing started..."]
    _INDEX_METADATA = {}

    def run_index():
        global _INDEX_STATUS, _INDEX_METADATA
        try:
            repo = os.getenv("REPO", "agro")
            _INDEX_STATUS.append(f"Indexing repository: {repo}")
            env = {**os.environ, "REPO": repo}
            if payload.get("enrich"):
                env["ENRICH_CODE_CHUNKS"] = "true"
                _INDEX_STATUS.append("Enriching chunks with summaries and keywords...")
            if payload.get("skip_dense"):
                env["SKIP_DENSE"] = "1"
                _INDEX_STATUS.append("Skipping dense embeddings (BM25 only)...")
            result = subprocess.run(
                ["python", "-m", "indexer.index_repo"],
                capture_output=True,
                text=True,
                cwd=repo_root(),
                env=env
            )
            if result.returncode == 0:
                _INDEX_STATUS.append("✓ Indexing completed successfully")
                _INDEX_METADATA = _get_index_stats()
            else:
                _INDEX_STATUS.append(f"✗ Indexing failed: {result.stderr[:200]}")
        except Exception as e:
            _INDEX_STATUS.append(f"✗ Error: {str(e)}")

    thread = threading.Thread(target=run_index, daemon=True)
    thread.start()
    return {"ok": True, "success": True, "message": "Indexing started in background"}


def stats() -> Dict[str, Any]:
    return _get_index_stats()


async def run(repo: str, dense: bool):
    async def stream_output():
        env = os.environ.copy()
        env['REPO'] = repo
        env['SKIP_DENSE'] = '0' if dense else '1'
        cmd = [sys.executable, '-m', 'indexer.index_repo']
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(repo_root()),
            env=env
        )
        while True:
            line = await proc.stdout.readline()  # type: ignore
            if not line:
                break
            yield line.decode('utf-8', errors='replace')
        await proc.wait()
        yield f"\n\n{'='*60}\n"
        yield f"Exit code: {proc.returncode}\n"
    from starlette.responses import StreamingResponse
    return StreamingResponse(stream_output(), media_type='text/plain')


def status() -> Dict[str, Any]:
    if not _INDEX_METADATA:
        return {"lines": _INDEX_STATUS, "running": len(_INDEX_STATUS) > 0 and not any("completed" in s or "failed" in s for s in _INDEX_STATUS), "metadata": _get_index_stats()}
    return {"lines": _INDEX_STATUS, "running": False, "metadata": _INDEX_METADATA}

