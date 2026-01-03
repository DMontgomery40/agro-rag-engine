---
title: Troubleshooting Guide
---

# Troubleshooting Guide

This page collects the most common problems I’ve seen while running AGRO and how to debug them quickly.

Use this as a “first pass” before diving into the code or filing an issue. When in doubt, remember that almost everything in AGRO is just:

- a FastAPI app
- a Pydantic‑validated config registry
- a set of small service modules under `server/services`

If you know which layer is misbehaving, you can usually fix it in a few minutes.


## 1. Configuration & Environment Issues

AGRO’s behavior is driven by two main surfaces:

- `.env` – infrastructure, secrets, and hard overrides
- `agro_config.json` – tunable RAG behavior, models, retrieval knobs

Under the hood, everything flows through the **configuration registry** in `server/services/config_registry.py`.

```mermaid
flowchart TD
  A[.env file] -->|highest precedence| R[ConfigRegistry]
  B[agro_config.json] -->|validated via Pydantic| R
  C[Pydantic defaults] -->|fallback| R
  R --> S[Services
  (rag, indexing, editor,
  keywords, etc.)]
```

If something “mysteriously” ignores your settings, the registry is the first place to look.


### 1.1 My `.env` changes aren’t taking effect

AGRO loads `.env` **once**, at import time, via `python-dotenv`:

```py title="server/services/config_registry.py" hl_lines="8-11" linenums="1"
from dotenv import load_dotenv

# Load .env FIRST before any os.environ access
load_dotenv(override=True)
```

Common failure modes:

- You edited the wrong `.env` (e.g. host vs container)
- You changed `.env` but didn’t restart the server
- You’re setting a key that AGRO doesn’t actually read

Steps to debug:

1. **Confirm which `.env` is being used**

   In Docker, the `.env` that matters is usually next to `docker-compose.yml`. On bare metal, it’s whatever is in the current working directory when you start `uvicorn`/`server.app`.

2. **Check the effective value via the config registry**

   Use the HTTP config API or the UI’s Admin → Settings view to inspect the value. Internally, everything goes through `get_config_registry()`:

   ```py title="server/services/config_registry.py" linenums="1"
   from server.services.config_registry import get_config_registry

   registry = get_config_registry()
   print(registry.get_str("REPO"))
   ```

3. **Restart the backend**

   The registry is process‑local. If you change `.env`, you must restart the FastAPI process (and the indexer container if you’re running Docker).


### 1.2 `agro_config.json` validation errors

`agro_config.json` is validated by Pydantic models in `server/models/agro_config_model.py`. If the file is malformed or contains unknown keys, the registry will log a `ValidationError` and fall back to defaults.

Symptoms:

- UI loads, but your changes to `agro_config.json` don’t seem to apply
- Logs show something like `pydantic.ValidationError` when starting the server

How to debug:

1. **Check the logs**

   Look for messages from the `agro.config` logger:

   ```text
   agro.config ERROR Failed to load agro_config.json: 1 validation error for AgroConfigRoot
   ```

2. **Validate the file manually**

   Run a quick check in a Python shell:

   ```py title="validate_config.py" linenums="1"
   import json
   from pathlib import Path
   from server.models.agro_config_model import AgroConfigRoot

   data = json.loads(Path("agro_config.json").read_text())
   cfg = AgroConfigRoot(**data)
   print(cfg.model_dump())
   ```

   If this raises, fix the offending field and retry.

3. **Use only known keys**

   The allowed keys are defined in `AGRO_CONFIG_KEYS`. Unknown keys are ignored by the registry layer that merges config for the web UI (`server/services/config_store.py`). If you typo a key, it simply won’t show up.


### 1.3 Environment vs config precedence confusion

The registry enforces a clear precedence:

1. `.env` (highest)
2. `agro_config.json`
3. Pydantic defaults

There are also **legacy aliases** and a small set of **infrastructure keys** that must be overridable via environment variables.

Example: `MQ_REWRITES` is aliased to `MAX_QUERY_REWRITES`:

```py title="server/services/config_registry.py" linenums="1" hl_lines="1-4"
LEGACY_KEY_ALIASES = {
    'MQ_REWRITES': 'MAX_QUERY_REWRITES',
}
```

If you set `MQ_REWRITES` in `.env` and `MAX_QUERY_REWRITES` in `agro_config.json`, the `.env` value wins.

To see where a value came from, use the registry’s source tracking (exposed via the config API / UI). If you’re debugging in code, log both the value and its source.


## 2. Indexing Problems

Indexing is orchestrated by `server/services/indexing.py`. It shells out to the indexer using the same Python interpreter and passes a small environment block.

```py title="server/services/indexing.py" linenums="1" hl_lines="18-32"
from common.paths import repo_root
from server.index_stats import get_index_stats as _get_index_stats
from server.services.config_registry import get_config_registry

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
            root = repo_root()
            env = {**os.environ, "REPO": repo, "REPO_ROOT": str(root), "PYTHONPATH": str(root)}
            if payload.get("enrich"):
                env["ENRICH_CODE_CHUNKS"] = "true"
                _INDEX_STATUS.append("Enriching chunks with summaries...")
            # ... spawn subprocess here ...
        except Exception as e:
            _INDEX_STATUS.append(f"Indexing failed: {e}")
```

The web UI polls `_INDEX_STATUS` and `_INDEX_METADATA` to show progress.


### 2.1 Indexing never starts or hangs

Symptoms:

- Clicking “Index” in the UI shows “Indexing started…” but nothing else
- No new Qdrant collections or index files appear under `data/`

Checklist:

1. **Check the configured repo**

   The indexer uses `REPO` from the config registry:

   ```py
   repo = _config_registry.get_str("REPO", "agro")
   ```

   Make sure:

   - `REPO` points to a valid profile / repo name
   - `REPO_ROOT` (in the environment) matches the actual checkout path

2. **Inspect indexer logs**

   The indexer runs as a separate process. If you’re using Docker, check the `indexer` container logs. On bare metal, look for logs under `data/out/<repo>/logs` or wherever you configured logging.

3. **Verify Python path**

   The indexer process is started with `PYTHONPATH` set to `repo_root()`. If you’ve moved the code or are running from a different working directory, imports inside the indexer may fail.


### 2.2 “Indexing failed: …” in the UI

If `_INDEX_STATUS` contains a line like `Indexing failed: <error>`, the exception was caught in `run_index()`.

Steps:

1. **Open browser dev tools → Network** and inspect the `/api/index/status` response to see the full `_INDEX_STATUS` list.
2. **Reproduce from the CLI** using the same environment:

   ```bash
   REPO=my-repo REPO_ROOT=/path/to/root PYTHONPATH=/path/to/root \
   python cli/agro.py index --repo my-repo
   ```

   This often gives a more complete traceback.


## 3. RAG / Search Issues

The HTTP search and chat endpoints ultimately call `server/services/rag.py`.

```py title="server/services/rag.py" linenums="1" hl_lines="21-40"
from retrieval.hybrid_search import search_routed_multi
from server.services.config_registry import get_config_registry

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
            top_k = _config_registry.get_int('FINAL_K', _config_registry.get_int('LANGGRAPH_FINAL_K', 10))
        except Exception:
            top_k = 10
    # ... call search_routed_multi(...) ...
```


### 3.1 Empty or obviously wrong results

Before blaming embeddings or rerankers, check the **simple stuff**:

1. **BM25 only sanity check**

   For small repos, BM25 alone is often better than a misconfigured dense stack. In the UI, set the retrieval mode to “BM25 only” (or disable dense search in `agro_config.json`) and retry.

2. **Verify `FINAL_K` / `LANGGRAPH_FINAL_K`**

   If `FINAL_K` is set too low, you may be seeing only a tiny slice of the candidate set. The code falls back to 10 if both keys are missing or invalid.

3. **Check discriminative keywords**

   AGRO supports discriminative / semantic keywords via `server/services/keywords.py`. If you’ve cranked `KEYWORDS_BOOST` or set `KEYWORDS_MAX_PER_REPO` to something extreme, BM25 scoring can get skewed.

   The module caches config at import time:

   ```py title="server/services/keywords.py" linenums="1" hl_lines="8-16"
   _config_registry = get_config_registry()
   _KEYWORDS_MAX_PER_REPO = _config_registry.get_int('KEYWORDS_MAX_PER_REPO', 50)
   _KEYWORDS_MIN_FREQ = _config_registry.get_int('KEYWORDS_MIN_FREQ', 3)
   _KEYWORDS_BOOST = _config_registry.get_float('KEYWORDS_BOOST', 1.3)
   _KEYWORDS_AUTO_GENERATE = _config_registry.get_int('KEYWORDS_AUTO_GENERATE', 1)
   _KEYWORDS_REFRESH_HOURS = _config_registry.get_int('KEYWORDS_REFRESH_HOURS', 24)
   ```

   If you change these at runtime, call `reload_config()` in that module or restart the server.


### 3.2 LangGraph errors or missing graph behavior

AGRO can optionally run a LangGraph‑based orchestration layer (`server.langgraph_app`). If `build_graph()` fails, the RAG service logs a warning and continues without a graph:

```py title="server/services/rag.py" hl_lines="11-19" linenums="1"
_graph = None


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
```

If you expect graph‑driven behavior (multi‑step tools, custom nodes) but don’t see it:

1. **Check logs for `build_graph failed`**
2. **Import `server.langgraph_app` in a REPL** and call `build_graph()` manually to see the traceback.
3. If you’re iterating on the graph code, remember that `_graph` is cached at module level; restart the server after changes.


## 4. Editor & DevTools Integration

AGRO ships with an embedded “editor” / devtools panel, controlled by `server/services/editor.py`.

```py title="server/services/editor.py" linenums="1" hl_lines="15-25"
from server.services.config_registry import get_config_registry


def read_settings() -> Dict[str, Any]:
    """Read editor settings, preferring registry (agro_config.json/.env) with legacy file fallback."""
    registry = get_config_registry()
    settings = {
        "port": registry.get_int("EDITOR_PORT", 4440),
        "enabled": registry.get_bool("EDITOR_ENABLED", True),
        "embed_enabled": registry.get_bool("EDITOR_EMBED_ENABLED", True),
        "bind": registry.get_str("EDITOR_BIND", "local"),  # 'local' or 'public'
        # ... more keys ...
    }
    # legacy file fallback under server/out/editor/settings.json
    return settings
```


### 4.1 Editor panel not showing up in the UI

The web UI checks `read_settings()` to decide whether to show the embedded editor.

- Ensure `EDITOR_ENABLED=true` in `.env` or `agro_config.json`
- If you’ve previously written `server/out/editor/settings.json`, those values may override defaults; delete the file to reset to registry‑only behavior


### 4.2 Editor server not reachable

If the embedded editor runs as a separate process (e.g. a code‑server container), the UI needs to know where to find it:

- `EDITOR_PORT` – port the editor listens on
- `EDITOR_BIND` – `local` vs `public` (affects how URLs are constructed)

Check the DevTools network tab for failing requests to `/editor/...` and cross‑check with `read_settings()`.


## 5. Traces & Evaluation

AGRO writes traces for RAG runs and evaluation under `out/<repo>/traces`. The service layer for listing and fetching traces lives in `server/services/traces.py`.

```py title="server/services/traces.py" linenums="1" hl_lines="7-23"
from common.config_loader import out_dir
from server.tracing import latest_trace_path


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
```


### 5.1 “No traces found” in the UI

If the Evaluation / Tracing tabs show no traces:

1. **Check the repo name**

   `list_traces()` uses the `repo` query param or falls back to `REPO` from the environment. If your UI is pointing at `repo=agro` but you indexed `my-repo`, you’ll see an empty list.

2. **Inspect the filesystem**

   Look under `out/<repo>/traces` (or whatever `out_dir(repo)` resolves to). If there are no `.json` files, tracing may be disabled or the RAG pipeline never wrote any traces.

3. **Check for exceptions in `list_traces`**

   Any filesystem errors are logged via `logger.exception`. If you’re running inside a container, make sure the `out/` directory is writable and mounted correctly.


### 5.2 “latest trace” endpoint fails

`latest_trace(repo)` wraps `server.tracing.latest_trace_path` and returns a small JSON payload. If `latest_trace_path` raises, the service logs and returns an empty result.

If the UI shows an error when loading the latest trace:

- Check logs for `latest_trace_path failed`
- Verify that at least one trace file exists under `out/<repo>/traces`
- Confirm that trace filenames follow the expected pattern (the helper usually looks for the newest `*.json`)


## 6. File Writes & Docker Volume Quirks

When AGRO writes config or settings files from the API / UI, it uses an **atomic write helper** with a Docker‑specific fallback in `server/services/config_store.py`.

```py title="server/services/config_store.py" linenums="1" hl_lines="15-32"
SECRET_FIELDS = {
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
    # ... many more ...
}


def _atomic_write_text(path: Path, content: str, max_retries: int = 3) -> None:
    """Atomically write text to a file with fallback for Docker volume mounts.

    Docker Desktop on macOS can fail with 'Device or resource busy' on os.replace()
    when the file is being watched. We try atomic first, then fall back to direct write.
    """
    import time

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.gettempdir()) / f".{path.name}.tmp"

    for i in range(max_retries):
        try:
            tmp.write_text(content, encoding="utf-8")
            os.replace(tmp, path)
            return
        except OSError as e:
            if "Device or resource busy" in str(e) and i < max_retries - 1:
                time.sleep(0.1 * (i + 1))
                continue
            # Fallback: direct write (non‑atomic)
            path.write_text(content, encoding="utf-8")
            return
```


### 6.1 “Device or resource busy” when saving config

On Docker Desktop for macOS, `os.replace()` on a bind‑mounted file can intermittently fail with `EBUSY` if something is watching the file.

AGRO already retries and falls back to a non‑atomic write, but if you still see errors:

- Ensure the mount point is not being aggressively watched by external tools
- Consider moving `data/` and `out/` to a Docker volume instead of a host bind mount


### 6.2 Secrets not persisting or showing up blank

Secrets (API keys, tokens) are treated specially:

- The set of secret field names is in `SECRET_FIELDS`
- When reading config for the UI, these values are **redacted**
- When writing, the API will avoid echoing them back

If you save a secret in the UI and then re‑open the page, seeing an empty field is expected. To verify persistence:

- Inspect the underlying config file on disk (e.g. `agro_config.json` or the profile JSON under `web/public/profiles`)
- Or call the config API directly and check the raw JSON (outside the UI’s redaction logic)


## 7. When All Else Fails: Let AGRO Explain Itself

Two meta‑features are worth remembering when debugging:

1. **Config registry is indexed into AGRO’s own RAG**

   You can go to the Chat tab and ask things like:

   > “How does `KEYWORDS_AUTO_GENERATE` work?”

   or

   > “Where is `FINAL_K` used in the retrieval pipeline?”

   The system will pull from `server/services`, `retrieval/`, and the Pydantic models to answer.

2. **Every knob has documentation attached**

   The web UI surfaces tooltips for each parameter, often with links to the relevant arXiv papers or provider docs. If a setting behaves differently than you expect, hover it first; if that’s not enough, search for the key name in the repo.


## 8. Quick Triage Checklist

Use this as a fast path before deeper debugging:

<div class="grid cards" markdown>

- :material-cog-outline: **Config not applying**  
  - Confirm `.env` location and restart backend  
  - Validate `agro_config.json` with `AgroConfigRoot`  
  - Check registry values via Admin → Settings

- :material-database-search: **Indexing issues**  
  - Verify `REPO` / `REPO_ROOT`  
  - Run `cli/agro.py index` manually  
  - Inspect indexer logs / `data/` contents

- :material-magnify: **Bad search results**  
  - Try BM25‑only  
  - Check `FINAL_K` and keyword boosts  
  - Look for LangGraph warnings

- :material-file-search-outline: **Missing traces / evals**  
  - Confirm `out/<repo>/traces` exists  
  - Check `repo` param vs `REPO` env  
  - Look for exceptions in `server/services/traces.py`

</div>
