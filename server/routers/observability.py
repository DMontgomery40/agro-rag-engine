import os
from typing import Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, Query
from server.tracing import latest_trace_path
import json

router = APIRouter()

@router.get("/health/langsmith")
def health_langsmith() -> Dict[str, Any]:
    enabled = str(os.getenv('LANGCHAIN_TRACING_V2','0')).strip().lower() in {'1','true','on'}
    project = os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT')
    endpoint = os.getenv('LANGCHAIN_ENDPOINT') or 'https://api.smith.langchain.com'
    key = os.getenv('LANGCHAIN_API_KEY') or os.getenv('LANGSMITH_API_KEY')
    installed = True
    can_connect = None
    identity: Dict[str, Any] = {}
    error = None
    try:
        from langsmith import Client  # type: ignore
    except Exception:
        installed = False
    if installed and enabled and key:
        try:
            cl = Client()  # picks up env automatically
            # whoami is a lightweight call; if it fails, we capture the error
            who = getattr(cl, 'whoami', None)
            if callable(who):
                identity = who() or {}
                can_connect = True
            else:
                can_connect = None
        except Exception as e:
            error = str(e)
            can_connect = False
    return {
        'enabled': enabled,
        'installed': installed,
        'project': project,
        'endpoint': endpoint,
        'key_present': bool(key),
        'can_connect': can_connect,
        'identity': identity,
        'error': error,
    }

@router.get("/api/langsmith/latest")
def api_langsmith_latest(
    project: Optional[str] = Query(None),
    share: bool = Query(True, description="Ensure the run is shareable (returns public URL)")
) -> Dict[str, Any]:
    """Return the latest LangSmith run URL for embedding."""
    # 1) Try local trace snapshot
    try:
        p = latest_trace_path(project or os.getenv('REPO','agro'))
        if p:
            try:
                data = json.loads(Path(p).read_text())
                if isinstance(data, dict) and data.get('langsmith_url'):
                    return {'project': data.get('langsmith_project'), 'url': data.get('langsmith_url'), 'source': 'local'}
            except Exception:
                pass
    except Exception:
        pass
    # 2) Query LangSmith API
    try:
        from langsmith import Client  # type: ignore
        cl = Client()
        proj = (project or os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT') or os.getenv('REPO','agro'))
        # list_runs returns generator; take first
        runs = list(cl.list_runs(project_name=proj, limit=1))
        if not runs:
            return {'project': proj, 'url': None, 'source': 'remote', 'error': 'no_runs'}
        r = runs[0]
        url = getattr(r, 'url', None) or getattr(r, 'dashboard_url', None)
        if share:
            try:
                info = cl.share_run(getattr(r, 'id', None) or getattr(r, 'run_id', None))
                if isinstance(info, str):
                    url = info
                elif isinstance(info, dict):
                    url = info.get('url') or info.get('share_url') or url
            except Exception:
                pass
        return {'project': proj, 'url': url, 'source': 'remote'}
    except Exception as e:
        return {'project': project, 'url': None, 'source': 'error', 'error': str(e)}

@router.get("/api/langsmith/runs")
def api_langsmith_runs(
    project: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    share: bool = Query(False)
) -> Dict[str, Any]:
    """List recent LangSmith runs (with optional share URLs)."""
    try:
        from langsmith import Client  # type: ignore
        cl = Client()
        proj = (project or os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT') or os.getenv('REPO','agro'))
        out = []
        for r in cl.list_runs(project_name=proj, limit=limit):
            url = getattr(r, 'url', None) or getattr(r, 'dashboard_url', None)
            if share:
                try:
                    info = cl.share_run(getattr(r, 'id', None) or getattr(r, 'run_id', None))
                    if isinstance(info, str):
                        url = info
                    elif isinstance(info, dict):
                        url = info.get('url') or info.get('share_url') or url
                except Exception:
                    pass
            out.append({
                "id": str(getattr(r, 'id', '')),
                "name": getattr(r, 'name', ''),
                "status": getattr(r, 'status', 'unknown'),
                "url": url,
                "start_time": str(getattr(r, 'start_time', '')),
                "latency": getattr(r, 'latency', None),
                "error": getattr(r, 'error', None)
            })
        return {"ok": True, "runs": out, "project": proj}
    except Exception as e:
        return {"ok": False, "error": str(e)}
