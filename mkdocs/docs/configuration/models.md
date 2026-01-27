---
Title: Model configuration
---

# Model configuration

AGRO treats "models" as configuration, not as a hard‑coded list.

All the knobs you see in the UI ultimately flow through Pydantic models (e.g. `agro_config.json` → `AgroConfigRoot` → config registry → HTTP API → web UI). You can point AGRO at **any** local or cloud model as long as you can describe it in JSON / env vars.

This page focuses on how model configuration is actually wired through the system, and how that shows up in the UI and service layer.

!!! note "Where model config actually lives"
    - Tunable RAG + model parameters: `agro_config.json`
    - Secrets / infra overrides: `.env`
    - Runtime view / editing: config registry + `/api/config` endpoints

    The registry merges these with clear precedence:

    1. `.env` (highest)
    2. `agro_config.json`
    3. Pydantic defaults (fallback)


## How model config flows through the backend

At runtime, everything goes through the **configuration registry** in `server/services/config_registry.py`:

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

The registry is the only thing that should know how to read `.env` and `agro_config.json`. Everything else (RAG, indexing, editor, keywords, etc.) just calls `get_config_registry()` and uses typed accessors:

```py title="example usage" linenums="1"
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()

EMBED_MODEL = _config_registry.get_str("EMBEDDING_MODEL", "text-embedding-3-large")
GEN_MODEL = _config_registry.get_str("GENERATION_MODEL", "gpt-4.1")
TOP_K = _config_registry.get_int("FINAL_K", 10)
```

Under the hood, the registry validates `agro_config.json` against `AgroConfigRoot` (in `server/models/agro_config_model.py`) and exposes a flat key space via `AGRO_CONFIG_KEYS`. That same key set is used by:

- The HTTP config API (`server/services/config_store.py`)
- The editor service (`server/services/editor.py`)
- The web UI admin panels (General / Models / Integrations subtabs)


### Why this matters for models

Because everything flows through the same registry:

- You can add a new model by **only** editing `agro_config.json` (or `.env` for secrets).
- The UI will automatically pick up new keys from `AGRO_CONFIG_KEYS` and show them with tooltips.
- MCP / CLI / HTTP all see the same model configuration.

You don't need to touch Python code to:

- Switch from OpenAI to Anthropic
- Point at a local vLLM / Ollama endpoint
- Add a second embedding model for experiments

As long as the Pydantic model knows about the field, the registry will surface it everywhere.


## Editing model config via the service layer

The web UI and CLI never write `agro_config.json` directly. They go through `server/services/config_store.py`, which:

- Validates changes against `AgroConfigRoot`
- Writes atomically to disk (with Docker volume fallbacks)
- Hides secret fields when returning config to the UI

```py title="server/services/config_store.py" linenums="1" hl_lines="5 18-26"
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
    # ...
```

This is the piece that makes "edit config in the browser" safe even when you're running AGRO under Docker with bind mounts and file watchers.

When you change a model in the UI:

1. The UI calls `/api/config` with a JSON patch.
2. `config_store` validates it against `AGRO_CONFIG_KEYS` / `AgroConfigRoot`.
3. The new config is written atomically.
4. The registry can be reloaded (hot) without restarting the server.


## Example: switching generation / embedding models

Assume you start with something like this in `agro_config.json`:

```json title="agro_config.json (excerpt)"
{
  "models": {
    "generation": {
      "provider": "openai",
      "model": "gpt-4.1",
      "temperature": 0.2
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-3-large",
      "dim": 3072
    }
  }
}
```

To switch to a local vLLM server for generation while keeping OpenAI embeddings:

```json title="agro_config.json (modified)" hl_lines="4-8"
{
  "models": {
    "generation": {
      "provider": "http",
      "base_url": "http://localhost:8001/v1",
      "model": "local-mixtral-8x7b",
      "temperature": 0.1
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-3-large",
      "dim": 3072
    }
  }
}
```

You don't need to change any Python code. The retrieval pipeline (`server/services/rag.py` → `retrieval/hybrid_search.py`) just asks the registry for the current model config and uses it.


## How other services consume model‑related config

Several backend services cache model‑related values at module import time for performance. They all use the same registry instance.

### RAG service (`server/services/rag.py`)

The RAG HTTP endpoint uses config for things like `FINAL_K` (how many chunks to return) and LangGraph parameters:

```py title="server/services/rag.py" linenums="1" hl_lines="23-33"
_config_registry = get_config_registry()


def do_search(q: str, repo: Optional[str], top_k: Optional[int], request: Optional[Request] = None) -> Dict[str, Any]:
    if top_k is None:
        try:
            # Try FINAL_K first, fall back to LANGGRAPH_FINAL_K
            top_k = _config_registry.get_int('FINAL_K', _config_registry.get_int('LANGGRAPH_FINAL_K', 10))
        except Exception:
            top_k = 10

    # ... call search_routed_multi(...) with the configured models / rerankers
```

If you change `FINAL_K` or swap out the reranker model in `agro_config.json`, this code picks it up via the registry.


### Indexing service (`server/services/indexing.py`)

Indexing uses config to decide which repo to index and whether to enrich chunks with model‑generated summaries:

```py title="server/services/indexing.py" linenums="1" hl_lines="15-28"
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
                _INDEX_STATUS.append("Enriching chunks with summaries via LLM...")
            # ... spawn indexer subprocess with env
```

`ENRICH_CODE_CHUNKS` is read by the indexer process and controls whether it calls your configured generation model to summarize code chunks.


### Keyword extraction (`server/services/keywords.py`)

Keyword generation / boosting is also driven by config, including whether to auto‑generate keywords using an LLM:

```py title="server/services/keywords.py" linenums="1" hl_lines="7-16 19-27"
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

If `KEYWORDS_AUTO_GENERATE` is enabled, the keyword pipeline will call your configured LLM to propose discriminative keywords based on your codebase and golden dataset.


## Editor / DevTools integration

The built‑in editor / DevTools panel is also driven by the same registry. Editor settings are read with a preference for `agro_config.json` / `.env`, and only fall back to a legacy `settings.json` file:

```py title="server/services/editor.py" linenums="1" hl_lines="15-26"
from server.services.config_registry import get_config_registry


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

This is mostly infra rather than "model" config, but it uses the same mechanism: Pydantic → registry → typed getters.


## How the UI knows what each parameter does

AGRO is intentionally self‑describing:

- Every config key in `AGRO_CONFIG_KEYS` has metadata (description, type, default).
- The web UI pulls that metadata and renders it as tooltips, with links to docs / papers where relevant.
- You can search for any parameter name in the UI and jump straight to its explanation.

Because the registry tracks **config source** (which file a value came from), the UI can also show you whether a value is coming from:

- `.env` (and therefore should be edited there), or
- `agro_config.json` (and can be changed via the UI), or
- Pydantic defaults (and hasn't been customized yet).

This is particularly useful for model configuration: you can see at a glance whether a model is being forced by an environment variable (e.g. in a CI profile) or coming from your local `agro_config.json`.


## MCP and external tools

The MCP server (see `features/mcp.md`) exposes AGRO's RAG engine and configuration to tools like Claude Code / Codex. Because MCP handlers also go through the same registry, any model changes you make in the UI or config files are immediately visible to MCP clients.

You don't need a separate MCP‑specific config file for models.


## Rough edges / things to be aware of

- Some services cache config values at import time (e.g. `keywords.py`). If you change those values at runtime, you may need to call the corresponding `reload_config()` or restart the server.
- The exact shape of `AgroConfigRoot` is still evolving. If you add custom fields, keep them under a namespaced section (e.g. `"models": {"my_experiment": ...}`) to avoid collisions with future versions.
- Secrets should live in `.env`, not `agro_config.json`. `config_store` will refuse to echo secret values back to the UI, but it won't stop you from putting them in JSON if you really insist.


## Summary

- Models are **pure configuration**: no hard‑coded lists, no special‑case branches.
- The **config registry** is the single source of truth, with clear precedence and type‑safe accessors.
- The **service layer** (`config_store`, `editor`, `rag`, `indexing`, `keywords`, etc.) all consume model‑related config via the same registry.
- The **UI** is driven by `AGRO_CONFIG_KEYS` and Pydantic metadata, so new model parameters show up automatically with documentation.

If you want to see exactly how a particular model parameter is used, the easiest path is:

1. Open the AGRO chat tab.
2. Ask it: *"Where is `EMBEDDING_MODEL` used in the codebase?"*
3. Follow the links into the repo and adjust `agro_config.json` / `.env` as needed.
