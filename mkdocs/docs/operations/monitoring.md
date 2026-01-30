---
Title: Monitoring & Observability
---

# Monitoring & Observability

AGRO ships with a full monitoring stack, but you don't have to run all of it.
This page explains what each piece does, how it connects to the AGRO
services, and how configuration actually flows through the code.

The monitoring stack is built around:

- Prometheus (metrics scraping)
- Alertmanager (alerts)
- Loki (logs)
- Grafana (dashboards)
- AGRO's own HTTP APIs for traces, index stats, and system status

Under the hood, the web UI talks to a small set of service-layer modules in
`server/services/` that expose monitoring data in a way that's safe for the
browser and stable across config changes.


## High-level architecture

At runtime, there are three main data flows that matter for monitoring:

1. **Configuration** – what repo is active, where data lives, which ports to use
2. **Indexing & retrieval status** – what the indexer is doing, how many
   documents are indexed, current errors
3. **Traces & analytics** – per-query traces, evaluation runs, and cost/usage

```mermaid
flowchart LR
  subgraph User
    UI[Web UI]
  end

  subgraph AGRO API
    RAG[server/services/rag.py]
    IDX[server/services/indexing.py]
    KW[server/services/keywords.py]
    TR[server/services/traces.py]
    CFG[server/services/config_registry.py]
  end

  subgraph Storage
    FS[(Filesystem: data/, out/, logs/)]
    QD[(Qdrant)]
    MON[(Prometheus / Loki / Grafana)]
  end

  UI -->|HTTP /fetch| RAG
  UI --> IDX
  UI --> KW
  UI --> TR

  RAG -->|reads| QD
  IDX -->|writes| QD
  IDX -->|writes status & stats| FS
  KW -->|reads/writes keywords| FS
  TR -->|reads traces| FS

  CFG --> RAG
  CFG --> IDX
  CFG --> KW

  MON -->|scrape / tail| FS
  MON -->|scrape| AGRO API
```

The important bit: **all monitoring-related behavior is driven by the same
configuration registry** that powers the rest of AGRO. You don't have to
thread environment variables through every service manually.


## Configuration: where monitoring reads its settings

Monitoring-related services don't read `os.environ` directly. They go through
`server/services/config_registry.py`, which implements a central
configuration registry with clear precedence rules:

1. `.env` file (secrets and infrastructure overrides)
2. `agro_config.json` (tunable RAG and monitoring parameters)
3. Pydantic defaults (fallback values)

```py title="server/services/config_registry.py" linenums="1"
"""Configuration Registry for AGRO RAG Engine.

This module provides a centralized, thread-safe configuration management system
that merges settings from multiple sources with clear precedence rules:

Precedence (highest to lowest):
1. .env file (secrets and infrastructure overrides)
2. agro_config.json (tunable RAG parameters)
3. Pydantic defaults (fallback values)

Key features:
- Thread-safe load/reload with locking
- Type-safe accessors (get_int, get_float, get_bool)
- Pydantic validation for agro_config.json
- Backward compatibility with os.getenv() patterns
- Config source tracking (which file each value came from)
"""
```

Every monitoring-facing service module grabs a module-level registry instance:

```py title="example: module-level registry" linenums="1"
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()

# Later, inside functions:
port = _config_registry.get_int("EDITOR_PORT", 4440)
```

This is why the docs and UI can show you exactly *where* a value came from
(`.env` vs `agro_config.json` vs default) and why you can safely reload
configuration without restarting everything.


## System status & indexing status

The **Dashboard → System Status** and **Dashboard → Indexing** panels in the
web UI are backed by a couple of small service modules:

- `server/services/indexing.py` – starts and monitors the indexer process
- `server/index_stats.py` – reads index statistics from disk / Qdrant

### Indexing service

`server/services/indexing.py` is responsible for kicking off indexing runs and
exposing their status to the UI.

Key points:

- It uses the same Python interpreter as the running server
- It passes `REPO`, `REPO_ROOT`, and `PYTHONPATH` through the environment so
  the indexer resolves paths correctly
- It stores human-readable status messages and metadata in module-level
  variables that the HTTP API can read

```py title="server/services/indexing.py" linenums="1" hl_lines="10-22"
import asyncio
import os
import subprocess
import sys
import threading
from typing import Any, Dict, List

from common.paths import repo_root
from server.index_stats import get_index_stats as _get_index_stats
from server.services.config_registry import get_config_registry

# Module-level config registry
_config_registry = get_config_registry()

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
            repo = _config_registry.get_str("REPO", "agro")
            _INDEX_STATUS.append(f"Indexing repository: {repo}")
            # Ensure the indexer resolves repo paths correctly and uses the same interpreter
            root = repo_root()
            env = {**os.environ, "REPO": repo, "REPO_ROOT": str(root), "PYTHONPATH": str(root)}
            if payload.get("enrich"):
                env["ENRICH_CODE_CHUNKS"] = "true"
                _INDEX_STATUS.append("Enriching chunks with su...")
            # ... spawn subprocess, update _INDEX_STATUS / _INDEX_METADATA
        except Exception as e:
            _INDEX_STATUS.append(f"Indexing failed: {e}")

    threading.Thread(target=run_index, daemon=True).start()
    return {"status": _INDEX_STATUS, "metadata": _INDEX_METADATA}
```

The HTTP API exposes this via a simple endpoint (see `api/endpoints.md`), and
the web UI polls it to render live status.


## Keyword extraction & discriminative keywords

AGRO maintains a set of **discriminative keywords** per repo to help BM25 and
hybrid search. These are surfaced in the **Dashboard → Glossary / Keywords**
areas and used in evaluation.

The service layer for this lives in `server/services/keywords.py`.

### How keyword config is loaded

`keywords.py` uses the config registry once at import time to populate a set
of module-level constants, then exposes a `reload_config()` helper so you can
pick up changes without restarting the server.

```py title="server/services/keywords.py" linenums="1" hl_lines="7-18 21-29"
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

from common.paths import repo_root
from server.services.config_registry import get_config_registry

# Module-level config caching
_config_registry = get_config_registry()
_KEYWORDS_MAX_PER_REPO = _config_registry.get_int('KEYWORDS_MAX_PER_REPO', 50)
_KEYWORDS_MIN_FREQ = _config_registry.get_int('KEYWORDS_MIN_FREQ', 3)
_KEYWORDS_BOOST = _config_registry.get_float('KEYWORDS_BOOST', 1.3)
_KEYWORDS_AUTO_GENERATE = _config_registry.get_int('KEYWORDS_AUTO_GENERATE', 1)
_KEYWORDS_REFRESH_HOURS = _config_registry.get_int('KEYWORDS_REFRESH_HOURS', 24)


def reload_config():
    """Reload cached config values from registry."""
    global _KEYWORDS_MAX_PER_REPO, _KEYWORDS_MIN_FREQ, _KEYWORDS_BOOST
    global _KEYWORDS_AUTO_GENERATE, _KEYWORDS_REFRESH_HOURS
    _KEYWORDS_MAX_PER_REPO = _config_registry.get_int('KEYWORDS_MAX_PER_REPO', 50)
    _KEYWORDS_MIN_FREQ = _config_registry.get_int('KEYWORDS_MIN_FREQ', 3)
    _KEYWORDS_BOOST = _config_registry.get_float('KEYWORDS_BOOST', 1.3)
    _KEYWORDS_AUTO_GENERATE = _config_registry.get_int('KEYWORDS_AUTO_GENERATE', 1)
    _KEYWORDS_REFRESH_HOURS = _config_registry.get_int('KEYWORDS_REFRESH_HOURS', 24)
```

Why this is useful:

- The UI can show you the *effective* values and where they came from
- You can tweak keyword behavior (`*_BOOST`, `*_MIN_FREQ`, etc.) and reload
  without restarting AGRO
- The keyword service can be used both by the HTTP API and the CLI without
  duplicating config parsing logic


## Traces & evaluation

AGRO writes detailed traces for RAG queries and evaluation runs under
`out/<repo>/traces/`. These are JSON files that the UI can render in the
**Analytics → Tracing** and **Evaluation → Trace Viewer** tabs.

The service-layer entry point for listing and reading traces is
`server/services/traces.py`.

```py title="server/services/traces.py" linenums="1" hl_lines="7-23 26-38"
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
            for p in sorted(
                [x for x in base.glob('*.json') if x.is_file()],
                key=lambda x: x.stat().st_mtime,
                reverse=True,
            )[:50]:
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
        # ... error handling / empty response
```

A couple of things to note:

- The repo is taken from the argument or `REPO` env var, with a default of
  `agro`. This keeps the HTTP API simple while still working in multi-repo
  setups.
- `out_dir()` centralizes where "ephemeral" outputs go. If you move that
  directory, traces, eval snapshots, and other monitoring artifacts move with
  it.
- The service layer is intentionally defensive: exceptions are logged and
  turned into empty-ish responses so the UI doesn't explode when a trace file
  is missing or corrupted.


## Editor / DevTools integration

AGRO ships with an embedded editor / DevTools UI that can be used to inspect
and tweak configuration, run quick experiments, and inspect logs.

The backend for this is `server/services/editor.py`.

```py title="server/services/editor.py" linenums="1" hl_lines="12-23"
import json
import logging
from pathlib import Path
from typing import Any, Dict
from urllib.request import urlopen
from urllib.error import URLError

from server.services.config_registry import get_config_registry
from server.models.agro_config_model import AGRO_CONFIG_KEYS

logger = logging.getLogger("agro.api")


def _settings_path() -> Path:
    settings_dir = Path(__file__).parent.parent / "out" / "editor"
    settings_dir.mkdir(parents=True, exist_ok=True)
    return settings_dir / "settings.json"


def _status_path() -> Path:
    status_dir = Path(__file__).parent.parent / "out" / "editor"
    status_dir.mkdir(parents=True, exist_ok=True)
    return status_dir / "status.json"


def read_settings() -> Dict[str, Any]:
    """Read editor settings, preferring registry (agro_config.json/.env) with legacy file fallback."""
    registry = get_config_registry()
    settings = {
        "port": registry.get_int("EDITOR_PORT", 4440),
        "enabled": registry.get_bool("EDITOR_ENABLED", True),
        "embed_enabled": registry.get_bool("EDITOR_EMBED_ENABLED", True),
        "bind": registry.get_str("EDITOR_BIND", "local"),  # 'local' or 'public'
        # ... more fields
    }
    # ... merge with legacy settings.json if present
    return settings
```

Why this matters for monitoring:

- The editor can show live status (via `_status_path()`), including indexing
  progress and last error
- The same config registry is used to decide whether the editor is enabled,
  which port it binds to, and whether it should be reachable from outside
  `localhost`


## RAG query telemetry

RAG queries themselves are instrumented in `server/services/rag.py`. This is
where query events are logged, metrics are emitted, and (optionally) traces
are written.

```py title="server/services/rag.py" linenums="1" hl_lines="1-5 15-28 31-42"
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from retrieval.hybrid_search import search_routed_multi
from server.metrics import stage
from server.telemetry import log_query_event
from server.services.config_registry import get_config_registry
import uuid

logger = logging.getLogger("agro.api")

# Module-level config registry
_config_registry = get_config_registry()

_graph = None
CFG = {"configurable": {"thread_id": "http"}}


def _get_graph():
    global _graph
    if _graph is None:
        try:
            from server.langgraph_app import build_graph
            _graph = build_graph()
        except Exception as e:
            logger.warning("build_graph failed: %s", e)
            _graph = None
    return _graph


def do_search(q: str, repo: Optional[str], top_k: Optional[int], request: Optional[Request] = None) -> Dict[str, Any]:
    if top_k is None:
        try:
            # Try FINAL_K first, fall back to LANGGRAPH_FINAL_K
            top_k = _config_registry.get_int('FINAL_K', _config_registry.get_int('LANGGRAPH_FINAL_K', 10))
        except Exception:
            top_k = 10

    # ... run retrieval, log_query_event, wrap response
```

A few things to call out:

- `stage` from `server.metrics` is used to time and label different phases of
the RAG pipeline (retrieval, reranking, synthesis). Those metrics are what
Prometheus scrapes.
- `log_query_event` writes a structured event that can be used for analytics,
  evaluation, or training the learning reranker.
- `FINAL_K` and `LANGGRAPH_FINAL_K` are read from the config registry, so you
  can change how many results are returned without touching code.


## Config store & secrets in the UI

The **Admin → General / Integrations / Secrets** tabs in the web UI talk to
`server/services/config_store.py`. This module is responsible for:

- Reading and writing `agro_config.json`
- Masking secrets when sending config to the browser
- Atomically writing config files even on Docker Desktop / macOS volume
  mounts (which are notorious for `Device or resource busy` errors)

```py title="server/services/config_store.py" linenums="1" hl_lines="9-20 23-40"
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import ValidationError

from common.config_loader import _load_repos_raw
from common.paths import repo_root, gui_dir
from server.services.config_registry import get_config_registry
from server.models.agro_config_model import AGRO_CONFIG_KEYS

logger = logging.getLogger("agro.api")


SECRET_FIELDS = {
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
    'COHERE_API_KEY', 'VOYAGE_API_KEY', 'LANGSMITH_API_KEY',
    'LANGCHAIN_API_KEY', 'LANGTRACE_API_KEY', 'NETLIFY_API_KEY',
    'OAUTH_TOKEN', 'GRAFANA_API_KEY', 'GRAFANA_AUTH_TOKEN',
    'MCP_API_KEY', 'JINA_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY',
    'XAI_API_KEY', 'GROQ_API_KEY', 'FIREWORKS_API_KEY'
}


def _atomic_write_text(path: Path, content: str, max_retries: int = 3) -> None:
    """Atomically write text to a file with fallback for Docker volume mounts.

    Docker Desktop on macOS can fail with 'Device or resource busy' on os.replace()
    when the file is being watched. We try atomic first, then fall back to direct write.
    """
    import time

    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(max_retries):
        tmp = Path(tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")[1])
        try:
            tmp.write_text(content, encoding="utf-8")
            os.replace(tmp, path)
            return
        except OSError as e:
            logger.warning("Atomic write failed (%s), attempt %s/%s", e, attempt + 1, max_retries)
            time.sleep(0.1)
        finally:
            if tmp.exists():
                tmp.unlink(missing_ok=True)

    # Fallback: direct write
    path.write_text(content, encoding="utf-8")
```

This is one of those "not glamorous but important" pieces: without the
atomic write + fallback, saving config from the UI on macOS Docker can fail
randomly when file watchers are active.


## How this shows up in the web UI

The React components under `web/src/components/` are wired to these service
modules via the HTTP API. A few relevant ones for monitoring:

- `Dashboard/SystemStatus.tsx`, `SystemStatusPanel.tsx`, `SystemStatusSubtab.tsx`
- `Dashboard/MonitoringLogsPanel.tsx`, `Dashboard/MonitoringSubtab.tsx`
- `Analytics/Tracing.tsx`, `Analytics/Usage.tsx`, `Analytics/Performance.tsx`
- `Evaluation/TraceViewer.tsx`, `Evaluation/HistoryViewer.tsx`

They don't talk to Prometheus or Loki directly. Instead, they:

- Call AGRO's HTTP endpoints (documented in `api/endpoints.md`)
- Render whatever the service layer returns
- Let you drill into traces, index stats, and evaluation runs without
  needing to know where files live on disk


## Running with and without the full monitoring stack

You can run AGRO in a few different modes:

1. **Just AGRO, no external monitoring**

   - Only AGRO's own HTTP APIs and file-based traces are used
   - Useful for local experiments or CI jobs

2. **AGRO + Prometheus + Grafana**

   - Prometheus scrapes AGRO's `/metrics` endpoint and any sidecars
   - Grafana dashboards read from Prometheus
   - Loki can tail logs from `docker-compose` or your own logging setup

3. **AGRO + external observability (your own stack)**

   - You can ignore the bundled compose file and point your own Prometheus /
     Grafana / Loki at AGRO's endpoints and log files

The important part is that **AGRO itself doesn't care** which of these you
choose. The service layer always exposes the same:

- Indexing status
- Keyword stats
- Traces
- RAG query telemetry

The monitoring stack just decides how much of that you want to aggregate and
visualize.


## Debugging monitoring issues

A few practical tips if something looks off in the UI:

!!! tip "Check the config registry first"
    - Hit the **Admin → General** tab and inspect the effective values
    - Make sure `REPO`, `OUT_DIR`, and any monitoring-related keys are what
you expect

!!! tip "Look at the raw traces"
    - Go to `out/<repo>/traces/` and open the latest JSON file
    - If the UI trace viewer is blank but files exist, it's probably a
      frontend bug, not a backend one

!!! tip "Check index status from the API"
    - Use `curl` or the CLI to hit the indexing status endpoint
    - If `_INDEX_STATUS` never updates, the indexer subprocess may be
      failing early – check logs under `out/<repo>/logs/` or your Docker logs

If you run into something that isn't covered here, remember that **AGRO is
indexed on itself**. Go to the chat tab and ask it about
`server/services/config_registry.py`, `server/services/indexing.py`, or any
other module – the RAG engine will happily walk you through the code.
