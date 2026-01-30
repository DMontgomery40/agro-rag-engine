---
title: Installation & Setup
---

# Installation & Setup

This page walks through installing AGRO from scratch, what each component does, and common issues you might hit along the way.

AGRO is designed to be *local‑first* but not “everything in one binary.” There’s a Python backend, a React/TypeScript web UI, optional monitoring stack, and (if you want it) MCP / LSP‑style integrations.

You don’t have to run all of it. For a single‑repo, “just answer questions about this codebase” setup, you can keep things minimal.


## 1. Prerequisites

You’ll need:

- Python 3.10+ (CPython)
- `pip` and `venv` (or your preferred environment manager)
- Git
- Node.js 18+ (only if you want to build the web UI yourself)
- Docker (optional, but recommended if you want monitoring / Qdrant in containers)

AGRO is just Python + FastAPI + a React frontend. There’s no custom C++ runtime or opaque binary.


## 2. Clone the repository

```bash
git clone https://github.com/your-org/agro.git
cd agro
```

The repo root is what the backend treats as `REPO_ROOT` internally (via `common.paths.repo_root()`), and a lot of paths are computed relative to it.


## 3. Create a virtual environment

You can use whatever you like here; I’ll show `venv`:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install --upgrade pip
```


## 4. Install Python dependencies

From the repo root:

```bash
pip install -r requirements.txt
```

This pulls in:

- FastAPI / Uvicorn for the HTTP API
- Qdrant client for vector search
- Pydantic for configuration models
- pygls / lsprotocol / cattrs / attrs / packaging, etc. (used for the editor / LSP‑style pieces and some internal tooling)

You don’t have to think about those libraries directly; they’re just how the server wires things together.


## 5. Example environment configuration

AGRO expects two main configuration surfaces:

- `agro_config.json` – tunable RAG behavior, models, retrieval knobs
- `.env` – secrets and infrastructure overrides

The backend loads `.env` **first**, before any `os.environ` access (`server/services/config_registry.py` calls `load_dotenv(override=True)` at import time). Then it loads and validates `agro_config.json` via Pydantic (`AgroConfigRoot`).

The precedence is:

1. `.env` (highest)
2. `agro_config.json`
3. Pydantic defaults (lowest)

!!! note "Where to put `.env`"
    `.env` is read from the process working directory. In practice, just put it at the repo root next to `agro_config.json` and run the server from there.

There’s a dedicated page with a copy‑pasteable example:

- [Example `.env` file](environment-example.md)

At minimum, you’ll usually want:

```bash
# What repo to index by default
REPO=agro

# HTTP server
HOST=127.0.0.1
PORT=8012

# Editor / DevTools
EDITOR_ENABLED=true
EDITOR_PORT=4440

# One model provider (pick whatever you actually use)
OPENAI_API_KEY=...
# or ANTHROPIC_API_KEY=...
```

The backend also has a list of fields it treats as secrets when writing config back out (`server/services/config_store.py` → `SECRET_FIELDS`), so those won’t be echoed in cleartext through the API.


## 6. Verify `agro_config.json`

There’s a checked‑in `agro_config.json` at the repo root. It’s parsed into `AgroConfigRoot` and then exposed through the config registry.

You don’t have to understand every field up front. The important part is that it parses and validates.

To sanity‑check it without starting the whole stack:

```bash
python -m server.models.agro_config_model
```

(or run any small script that imports `AgroConfigRoot`; Pydantic will throw if something is badly typed).

If you want to change models or retrieval defaults, see:

- [Model configuration](../configuration/models.md)
- [Profiles](../configuration/profiles.md)


## 7. Start the backend server

The FastAPI app lives in `server.asgi:create_app`. There’s a small legacy entrypoint in `server/app.py`, but everything goes through the ASGI app.

From the repo root, with your virtualenv active:

```bash
uvicorn server.asgi:create_app \
  --host ${HOST:-127.0.0.1} \
  --port ${PORT:-8012} \
  --reload
```

- `--reload` is optional but useful during development.
- The app will read `.env` on import, then `agro_config.json`, then start serving.

Once it’s up, you should see:

- OpenAPI docs at `http://127.0.0.1:8012/docs`
- The raw OpenAPI JSON at `http://127.0.0.1:8012/openapi.json`

More details on the HTTP surface:

- [HTTP API](../api/endpoints.md)
- [OpenAPI schema](../api/openapi.md)


## 8. Start the web UI

The React/TypeScript frontend lives under `web/`. The backend serves a small status API and configuration endpoints; the UI talks to those.

From `web/`:

```bash
cd web
npm install
npm run dev   # or npm run build && npm run preview
```

By default this will start a dev server on something like `http://127.0.0.1:5173`.

The UI expects the backend at `http://127.0.0.1:8012` unless you’ve configured it differently.


## 9. Index a repository

Once the backend and UI are running, you need to build an index for at least one repo.

You can do this from:

- The **Dashboard → Indexing** panels in the web UI (see components like `Dashboard/IndexDisplayPanels.tsx`, `Dashboard/LiveTerminalPanel.tsx`)
- The CLI (`cli/agro.py` and `cli/commands/index.py`)
- The HTTP API (`/api/index/start`)

Under the hood, indexing is kicked off by `server/services/indexing.py`:

```py title="server/services/indexing.py" linenums="1" hl_lines="15-27"
from server.services.config_registry import get_config_registry
from common.paths import repo_root

_config_registry = get_config_registry()


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
            # ... spawn indexer subprocess here ...
        except Exception as e:
            _INDEX_STATUS.append(f"Indexing failed: {e}")

    threading.Thread(target=run_index, daemon=True).start()
    return {"status": "started"}
```

The important bits:

- It reads `REPO` from the config registry (`.env` → `agro_config.json` → defaults).
- It sets `REPO_ROOT` and `PYTHONPATH` so the indexer resolves paths correctly.
- If you pass `{"enrich": true}` it will set `ENRICH_CODE_CHUNKS=true` and add extra summaries to chunks.

You can watch indexing progress via:

- The UI’s **Dashboard → System Status / Live Terminal** panels
- The `/api/index/status` endpoint


## 10. Try your first query

Once indexing finishes, you can:

- Open the **Chat** tab in the UI (`web/src/components/Chat/ChatInterface.tsx`)
- Or use the CLI chat (`cli/chat_cli.py`, documented in [CLI Chat Interface](../features/cli-chat.md))

The RAG pipeline entrypoint on the server side is `server/services/rag.py`:

```py title="server/services/rag.py" linenums="1" hl_lines="27-40"
from retrieval.hybrid_search import search_routed_multi
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()


def do_search(q: str, repo: Optional[str], top_k: Optional[int], request: Optional[Request] = None) -> Dict[str, Any]:
    if top_k is None:
        try:
            top_k = _config_registry.get_int('FINAL_K', _config_registry.get_int('LANGGRAPH_FINAL_K', 10))
        except Exception:
            top_k = 10

    repo = (repo or os.getenv('REPO', 'agro')).strip()

    results = search_routed_multi(
        query=q,
        repo=repo,
        top_k=top_k,
        # ... other routing / filters ...
    )
    return {"results": results, "repo": repo}
```

You don’t need to touch this to get started, but it’s useful to know where `top_k` and repo selection actually come from. They’re just config registry lookups.


## 11. Optional: Editor / DevTools

AGRO ships with an embedded “editor” / DevTools surface that can:

- Show live settings
- Embed in other tools
- Expose some LSP‑style behavior

The settings are read from the same config registry, with a small legacy JSON fallback:

```py title="server/services/editor.py" linenums="1" hl_lines="16-25"
from server.services.config_registry import get_config_registry


def read_settings() -> Dict[str, Any]:
    """Read editor settings, preferring registry (agro_config.json/.env) with legacy file fallback."""
    registry = get_config_registry()
    settings = {
        "port": registry.get_int("EDITOR_PORT", 4440),
        "enabled": registry.get_bool("EDITOR_ENABLED", True),
        "embed_enabled": registry.get_bool("EDITOR_EMBED_ENABLED", True),
        "bind": registry.get_str("EDITOR_BIND", "local"),  # 'local' or 'public'
        # ...
    }
    # ... merge with legacy settings.json if present ...
    return settings
```

To use it, set in `.env`:

```bash
EDITOR_ENABLED=true
EDITOR_PORT=4440
```

Then hit whatever route your deployment exposes for the editor (this is still evolving; check the UI’s **DevTools → Editor** tab and the `/api/editor/*` endpoints).


## 12. Optional: Monitoring & observability

If you want Prometheus / Grafana / Loki wired in, there’s a `docker-compose.yml` and a set of UI components under `web/src/components/Grafana/` and `web/src/components/Infrastructure/`.

The high‑level flow is:

1. Bring up the infra stack with Docker Compose (Prometheus, Loki, Grafana, etc.).
2. Point AGRO at those endpoints via `.env` (e.g. `GRAFANA_API_KEY`, `GRAFANA_AUTH_TOKEN`, etc.).
3. Use the **Infrastructure** and **Grafana** subtabs in the UI to verify connectivity.

Details live in:

- [Monitoring & Observability](../operations/monitoring.md)


## 13. How configuration actually works (service layer)

You don’t have to care about this to run AGRO, but if you’re going to extend it, it helps to know how config is wired.

The central piece is `server/services/config_registry.py`:

```py title="server/services/config_registry.py" linenums="1" hl_lines="1-20 40-52"
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

from dotenv import load_dotenv

# Load .env FIRST before any os.environ access
load_dotenv(override=True)

from server.models.agro_config_model import AgroConfigRoot, AGRO_CONFIG_KEYS

# ... registry implementation ...

def get_config_registry():
    """Return the singleton config registry instance."""
    # Lazily construct and cache a thread-safe registry
    # that knows how to read .env + agro_config.json
    ...
```

Every service layer module that needs configuration calls `get_config_registry()` at import time and then caches values as needed. For example, `server/services/keywords.py`:

```py title="server/services/keywords.py" linenums="1" hl_lines="7-15 18-26"
from server.services.config_registry import get_config_registry

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

If you change `.env` or `agro_config.json` at runtime and want those changes to take effect without a restart, you can:

- Call the appropriate reload function (like `reload_config()` above) from your own code, or
- Use the configuration endpoints exposed by the API / UI (see [Configuration](../configuration/settings.md)).


## 14. Common installation issues

!!! warning
    This is a solo‑dev project. There are rough edges. If something here doesn’t match what you see in the code, trust the code and file an issue.

**Problem: `ModuleNotFoundError` for `server.*` or `common.*`**

- Make sure you’re running commands from the repo root.
- Ensure `PYTHONPATH` includes the repo root. The indexer explicitly sets `PYTHONPATH=repo_root()` when it spawns; for ad‑hoc scripts you may need:

  ```bash
  export PYTHONPATH=$(pwd)
  ```

**Problem: Config values not updating when I edit `.env`**

- The registry loads `.env` at import time. If the process is already running, you’ll need to restart it or explicitly trigger a reload path that calls back into the registry.

**Problem: Editor / DevTools not showing up**

- Check `EDITOR_ENABLED` and `EDITOR_PORT` in `.env`.
- Look at `server/services/editor.py` to see where it writes `out/editor/settings.json` and `out/editor/status.json`.


## 15. Next steps

Once AGRO is installed and the first repo is indexed:

- [After AGRO Is Running](first-steps.md)
- [Retrieval pipeline details](../features/rag.md)
- [Evaluation & regression testing](../features/evaluation.md)
- [MCP integration](../features/mcp.md)

AGRO is indexed on itself, so once you have it running you can also just go to the **Chat** tab and ask it:

> “How does configuration precedence work?”

or

> “Where does the indexer get `REPO_ROOT` from?”

and it will walk you through the actual code paths.
