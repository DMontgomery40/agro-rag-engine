import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from common.config_loader import out_dir
from server.tracing import latest_trace_path

logger = logging.getLogger("agro.api")


def list_traces(repo: Optional[str]) -> Dict[str, Any]:
    r = (repo or __import__('os').getenv('REPO', 'agro')).strip()
    base = Path(out_dir(r)) / 'traces'
    files: List[Dict[str, Any]] = []
    try:
        if base.exists():
            for p in sorted([x for x in base.glob('*.json') if x.is_file()], key=lambda x: x.stat().st_mtime, reverse=True)[:50]:
                files.append({
                    'path': str(p),
                    'name': p.name,
                    'mtime': __import__('datetime').datetime.fromtimestamp(p.stat().st_mtime).isoformat(),
                })
    except Exception as e:
        logger.exception("Failed to list traces: %s", e)
    return {'repo': r, 'files': files}


def latest_trace(repo: Optional[str]) -> Dict[str, Any]:
    r = (repo or __import__('os').getenv('REPO', 'agro')).strip()
    try:
        p = latest_trace_path(r)
    except Exception as e:
        logger.exception("latest_trace_path failed: %s", e)
        p = None
    if not p:
        return {'repo': r, 'trace': None}
    try:
        data = json.loads(Path(p).read_text())
        return {'repo': r, 'trace': data, 'path': p}
    except Exception as e:
        logger.exception("Failed to read latest trace: %s", e)
        # return structured error but keep endpoint non-crashing
        return {'repo': r, 'trace': None, 'error': str(e)}

