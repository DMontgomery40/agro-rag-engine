import os
import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from contextvars import ContextVar

from common.config_loader import out_dir
from server.services.config_registry import get_config_registry

# Module-level config caching
_config_registry = get_config_registry()
_TRACING_ENABLED = _config_registry.get_int('TRACING_ENABLED', 1)
_TRACE_SAMPLING_RATE = _config_registry.get_float('TRACE_SAMPLING_RATE', 1.0)
_LOG_LEVEL = _config_registry.get_str('LOG_LEVEL', 'INFO')


def reload_config():
    """Reload cached config values from registry."""
    global _TRACING_ENABLED, _TRACE_SAMPLING_RATE, _LOG_LEVEL
    _TRACING_ENABLED = _config_registry.get_int('TRACING_ENABLED', 1)
    _TRACE_SAMPLING_RATE = _config_registry.get_float('TRACE_SAMPLING_RATE', 1.0)
    _LOG_LEVEL = _config_registry.get_str('LOG_LEVEL', 'INFO')


_TRACE_VAR: ContextVar[Optional["Trace"]] = ContextVar("agro_trace", default=None)


def _now_iso() -> str:
    return __import__("datetime").datetime.now().isoformat()


class Trace:
    """Lightweight per-request trace recorder.

    - Stores structured breadcrumb events in-memory
    - Persists to out/<repo>/traces/<ts>_<id>.json on save()
    - Enabled when LANGCHAIN_TRACING_V2 is truthy (1/true/on)
    """

    def __init__(self, repo: str, question: str):
        self.repo = (repo or os.getenv("REPO", "agro")).strip()
        self.question = question
        self.id = uuid.uuid4().hex[:8]
        self.started_at = _now_iso()
        self.events: List[Dict[str, Any]] = []
        self.path: Optional[str] = None
        self.mode = (os.getenv('TRACING_MODE', '').lower() or (
            'langsmith' if ((os.getenv('LANGCHAIN_TRACING_V2','0') or '0').strip().lower() in {'1','true','on'}) else 'local'))
        # Optional LangSmith client (best effort)
        self._ls_client = None
        self._ls_project = os.getenv('LANGCHAIN_PROJECT') or os.getenv('LANGSMITH_PROJECT') or 'agro'
        self._ls_run_id: Optional[str] = None
        self._ls_url: Optional[str] = None
        try:
            if self.mode == 'langsmith':
                from langsmith import Client  # type: ignore
                from datetime import datetime, timezone
                self._ls_client = Client()
                run = self._ls_client.create_run(
                    name="RAG.run",
                    run_type="chain",
                    inputs={"question": question},
                    project_name=self._ls_project,
                    start_time=datetime.now(timezone.utc)
                )
                self._ls_run_id = getattr(run, 'id', None) or getattr(run, 'run_id', None)
        except Exception:
            self._ls_client = None

    # ---- control ----
    @staticmethod
    def enabled() -> bool:
        mode = (os.getenv('TRACING_MODE','').lower() or (
            'langsmith' if (os.getenv('LANGCHAIN_TRACING_V2','0').lower() in {'1','true','on'}) else 'local'))
        if mode == 'off' or not mode:
            return False
        return True

    def add(self, kind: str, payload: Dict[str, Any]) -> None:
        # Always record locally; never let tracing break flow
        try:
            self.events.append({
                "ts": _now_iso(),
                "kind": str(kind),
                "data": payload or {},
            })
        except Exception:
            pass
        # Best-effort: also emit child run to LangSmith
        try:
            if self._ls_client is not None and self._ls_run_id is not None:
                from datetime import datetime, timezone
                child = self._ls_client.create_run(
                    name=str(kind),
                    run_type="chain",
                    inputs=payload or {},
                    project_name=self._ls_project,
                    parent_run_id=self._ls_run_id,
                    start_time=datetime.now(timezone.utc)
                )
                rid = getattr(child, 'id', None) or getattr(child, 'run_id', None)
                try:
                    self._ls_client.update_run(rid, end_time=datetime.now(timezone.utc), outputs=payload or {})
                except Exception:
                    pass
        except Exception:
            pass

    def _dir(self) -> Path:
        base = Path(out_dir(self.repo))
        d = base / "traces"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save(self) -> str:
        try:
            ts_short = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
            out_path = self._dir() / f"{ts_short}_{self.id}.json"
            data = {
                "repo": self.repo,
                "id": self.id,
                "question": self.question,
                "started_at": self.started_at,
                "finished_at": _now_iso(),
                "events": self.events,
                "tracing_mode": self.mode,
                "langsmith_project": self._ls_project if self.mode == 'langsmith' else None,
                "langsmith_url": self._ls_url if self.mode == 'langsmith' else None,
            }
            out_path.write_text(json.dumps(data, indent=2))
            self.path = str(out_path)
            # Simple retention purge
            try:
                keep = int(os.getenv('TRACE_RETENTION','50') or '50')
            except Exception:
                keep = 50
            try:
                files = sorted([p for p in self._dir().glob('*.json') if p.is_file()], key=lambda p: p.stat().st_mtime, reverse=True)
                for p in files[keep:]:
                    try:
                        p.unlink()
                    except Exception:
                        pass
            except Exception:
                pass
            return self.path
        except Exception:
            return ""


# ---- context helpers ----
def start_trace(repo: str, question: str) -> Trace:
    tr = Trace(repo=repo, question=question)
    _TRACE_VAR.set(tr)
    return tr


def get_trace() -> Optional[Trace]:
    return _TRACE_VAR.get()


def end_trace() -> Optional[str]:
    tr = _TRACE_VAR.get()
    if tr is None:
        return None
    try:
        if getattr(tr, '_ls_client', None) is not None and getattr(tr, '_ls_run_id', None) is not None:
            from datetime import datetime, timezone
            try:
                tr._ls_client.update_run(tr._ls_run_id, end_time=datetime.now(timezone.utc), outputs={"status": "ok"})
            except Exception:
                pass
            try:
                share = getattr(tr._ls_client, 'share_run', None)
                if callable(share):
                    info = share(tr._ls_run_id)
                    if isinstance(info, str):
                        tr._ls_url = info
                    elif isinstance(info, dict):
                        tr._ls_url = info.get('url') or info.get('share_url')
                if not tr._ls_url:
                    rr = tr._ls_client.read_run(tr._ls_run_id)
                    tr._ls_url = getattr(rr, 'url', None) or getattr(rr, 'dashboard_url', None)
            except Exception:
                tr._ls_url = None
    except Exception:
        pass
    path = tr.save()
    _TRACE_VAR.set(None)
    return path


def latest_trace_path(repo: str) -> Optional[str]:
    try:
        d = Path(out_dir(repo)) / "traces"
        if not d.exists():
            return None
        files = sorted([p for p in d.glob("*.json") if p.is_file()], key=lambda p: p.stat().st_mtime, reverse=True)
        return str(files[0]) if files else None
    except Exception:
        return None
