---
 title: AGRO - Another Good RAG Option
 hide:
   - toc
---

<style>
.md-content__inner h1:first-child { display: none; }
</style>

<figure markdown="span">
  ![AGRO Banner](assets/agro-banner.svg){ width="100%" }
</figure>

<div class="grid cards" markdown>

-   :material-console-network: **Local‑first RAG engine**  
    Index your own codebases, run everything locally by default, and only talk to cloud models when you explicitly configure them.

-   :material-tune-variant: **Configurable, not hard‑coded**  
    Models, retrieval behavior, evaluation, and tooling are all driven by Pydantic config and JSON files – not buried in the code.

-   :material-book-information-variant: **Self‑documenting UI**  
    Every knob in the web UI has a tooltip, links to papers or docs, and is searchable. AGRO is indexed on itself, so you can just ask it how things work.

-   :material-code-json: **MCP + LSP tooling**  
    Exposes the RAG engine over Model Context Protocol for tools like Claude Code / Codex, and ships a language‑server‑style editor backend for working with indexed repos.

</div>

---

## What AGRO actually is

AGRO is a local‑first RAG engine aimed at codebases. It’s built around a few ideas:

- Retrieval and ranking should be **transparent and debuggable**.
- Configuration should be **centralized and type‑checked**, not scattered across env vars and magic constants.
- The system should be able to **explain itself** – you shouldn’t need a second LLM just to understand what a parameter does.

At a high level, the stack looks like this:

```mermaid
flowchart LR
  subgraph User
    UI[Web UI]
    CLI[CLI]
    MCP[Claude Code / Codex]
  end

  subgraph Server
    API[FastAPI HTTP API]
    CFG[Config Registry\n(.env + agro_config.json)]
    RAG[Retrieval & RAG Pipeline]
    IDX[Indexing Worker]
    EVAL[Evaluation & Traces]
  end

  subgraph Storage
    Q[Qdrant: dense + metadata]
    FS[(Filesystem: chunks, evals, traces)]
  end

  User --> UI --> API
  User --> CLI --> API
  MCP --> API

  API --> RAG
  API --> IDX
  API --> EVAL

  RAG --> Q
  IDX --> Q
  IDX --> FS
  EVAL --> FS

  CFG --> API
  CFG --> RAG
  CFG --> IDX
```

Everything hangs off a small FastAPI app (`server.asgi:create_app`) and a central configuration registry. The rest of the system – indexer, evaluation loop, MCP server, editor backend – are just clients of that API and config layer.

---

## Configuration model: one registry, three sources

AGRO’s configuration is intentionally opinionated:

- **`.env`** – infrastructure and secrets (API keys, ports, Docker overrides).  
- **`agro_config.json`** – tunable RAG behavior, model definitions, retrieval knobs.  
- **Pydantic defaults** – safe fallbacks when you haven’t set anything.

The core of this is the **configuration registry** in `server/services/config_registry.py`:

```py title="server/services/config_registry.py" linenums="1" hl_lines="9-20 39-44"
"""Configuration Registry for AGRO RAG Engine.

Precedence (highest to lowest):
1. .env file (secrets and infrastructure overrides)
2. agro_config.json (tunable RAG parameters)
3. Pydantic defaults (fallback values)
"""

from dotenv import load_dotenv
from pydantic import ValidationError

# Load .env FIRST before any os.environ access
load_dotenv(override=True)

from server.models.agro_config_model import AgroConfigRoot, AGRO_CONFIG_KEYS

class ConfigRegistry:
    def get_int(self, key: str, default: int | None = None) -> int: ...
    def get_float(self, key: str, default: float | None = None) -> float: ...
    def get_bool(self, key: str, default: bool | None = None) -> bool: ...
    def get_str(self, key: str, default: str | None = None) -> str: ...

_registry: ConfigRegistry | None = None

def get_config_registry() -> ConfigRegistry:
    global _registry
    if _registry is None:
        _registry = ConfigRegistry()
    return _registry
```

Every backend service imports `get_config_registry()` and never touches `os.getenv` directly. That gives you:

- **Thread‑safe reloads** – the registry owns the lock and can re‑read `.env` and `agro_config.json` without races.
- **Type‑safe accessors** – `get_int`, `get_float`, `get_bool`, `get_str` all validate and coerce values.
- **Source tracking** – the registry knows whether a value came from `.env`, `agro_config.json`, or a Pydantic default.

The web UI surfaces this as a single **Configuration** tab. When you hover a parameter, you see:

- A plain‑English explanation of what it does.
- Links to relevant docs or arXiv papers where it makes sense.
- Where the current value came from (env vs config vs default).

You can also ask AGRO itself:

> “What does `FINAL_K` do and how does it interact with `LANGGRAPH_FINAL_K`?”

The chat backend is indexed on this repository, so it can answer by pointing at `server/services/rag.py` and the config model.

---

## Service layer: how the pieces fit together

AGRO’s Python backend is split into small service modules under `server/services/`. They all share the same config registry and are designed to be easy to read and modify.

### Configuration store & secrets

`server/services/config_store.py` is the thin API layer that the web UI talks to when you edit settings.

Key points:

- **Secrets are treated differently** – there’s a `SECRET_FIELDS` set of keys like `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc. The API will:
  - Mask them in responses to the UI.
  - Write them to `.env` (or equivalent) via an atomic write helper.
- **Atomic writes with Docker quirks in mind** – `_atomic_write_text` tries `os.replace` into a temp file first, then falls back to a direct write for Docker Desktop on macOS where volume mounts can be “busy”.
- **Validation through Pydantic** – any change to `agro_config.json` is round‑tripped through `AgroConfigRoot`, so invalid configs fail fast with a clear error.

This is the layer that keeps “clicking around in the UI” and “editing JSON on disk” in sync.

### Editor service

`server/services/editor.py` backs the **DevTools → Editor** tab in the UI and the embedded code editor.

It:

- Reads editor‑related settings from the config registry (`EDITOR_PORT`, `EDITOR_ENABLED`, `EDITOR_BIND`, etc.).
- Persists a small `settings.json` and `status.json` under `server/out/editor/` for the frontend to poll.
- Falls back to legacy files if you’re upgrading from an older version.

The interesting bit is that editor behavior is just more config – you can drive it entirely from `.env` / `agro_config.json` if you don’t want to touch the UI.

### Indexing service

`server/services/indexing.py` is the entry point for (re)indexing a repo from the HTTP API and UI.

```py title="server/services/indexing.py" linenums="1" hl_lines="15-33 36-44"
from common.paths import repo_root
from server.index_stats import get_index_stats as _get_index_stats
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()

_INDEX_STATUS: list[str] = []
_INDEX_METADATA: dict[str, Any] = {}


def start(payload: dict[str, Any] | None = None) -> dict[str, Any]:
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
            env = {
                **os.environ,
                "REPO": repo,
                "REPO_ROOT": str(root),
                "PYTHONPATH": str(root),
            }
            if payload.get("enrich"):
                env["ENRICH_CODE_CHUNKS"] = "true"
                _INDEX_STATUS.append("Enriching chunks with summaries and symbols...")

            # spawn indexer subprocess with same interpreter
            ...
        except Exception as e:
            _INDEX_STATUS.append(f"Indexing failed: {e}")

    threading.Thread(target=run_index, daemon=True).start()
    return {"status": _INDEX_STATUS}
```

A few design choices here:

- **Same interpreter, explicit `PYTHONPATH`** – the indexer subprocess runs under the same Python that started the server, with `REPO_ROOT` and `PYTHONPATH` set so imports behave the same.
- **Config‑driven behavior** – `REPO`, enrichment flags, and other knobs all come from the registry.
- **In‑memory status** – `_INDEX_STATUS` and `_INDEX_METADATA` are simple module‑level globals. The UI polls them to render the “Live Terminal” and “Indexing Status” panels.

If you want to change how indexing works, you edit the indexer script and this service – there’s no hidden scheduler.

### Keyword extraction service

`server/services/keywords.py` manages discriminative / semantic keywords that can be mixed into BM25 and hybrid search.

It:

- Reads a handful of tuning parameters at import time:
  - `KEYWORDS_MAX_PER_REPO`
  - `KEYWORDS_MIN_FREQ`
  - `KEYWORDS_BOOST`
  - `KEYWORDS_AUTO_GENERATE`
  - `KEYWORDS_REFRESH_HOURS`
- Caches them in module‑level variables for fast access.
- Exposes `reload_config()` so you can hot‑reload those values from the registry without restarting the server.

This is one of the places where the “lots of knobs, but you don’t have to touch them” philosophy shows up. For small repos, you can leave this alone or even disable auto‑generation and just rely on BM25.

### RAG service

`server/services/rag.py` is the HTTP entry point for search and RAG answers.

It wires together:

- The **hybrid retrieval** layer (`retrieval.hybrid_search.search_routed_multi`).
- Optional **LangGraph** orchestration (`server.langgraph_app.build_graph`), if you’ve enabled it.
- Telemetry hooks (`server.metrics`, `server.telemetry`).
- Config‑driven defaults for things like `FINAL_K`.

```py title="server/services/rag.py" linenums="1" hl_lines="23-37 40-49"
from retrieval.hybrid_search import search_routed_multi
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()


def do_search(q: str, repo: str | None, top_k: int | None, request: Request | None = None) -> dict[str, Any]:
    if top_k is None:
        try:
            # Try FINAL_K first, fall back to LANGGRAPH_FINAL_K
            top_k = _config_registry.get_int(
                "FINAL_K",
                _config_registry.get_int("LANGGRAPH_FINAL_K", 10),
            )
        except Exception:
            top_k = 10

    repo = (repo or _config_registry.get_str("REPO", "agro")).strip()

    results = search_routed_multi(
        query=q,
        repo=repo,
        top_k=top_k,
        # other routing / filter params also come from config
    )

    # Optionally run through LangGraph if configured
    graph = _get_graph()
    if graph is not None:
        ...

    return {"results": results, "top_k": top_k, "repo": repo}
```

The important part is that **retrieval behavior is still just configuration**:

- You can change `FINAL_K`, BM25 weights, dense model names, reranker settings, etc. in `agro_config.json` or via the UI.
- The RAG service doesn’t know about specific providers – it just calls into the retrieval stack, which is itself configured via Pydantic models.

### Traces service

`server/services/traces.py` is a small helper around the evaluation / tracing subsystem.

It:

- Lists recent trace files under `out/<repo>/traces/*.json`.
- Returns the latest trace path via `server.tracing.latest_trace_path`.
- Handles errors defensively and logs them instead of failing the whole API.

The UI uses this to power the **Analytics → Tracing** and **Evaluation → Trace Viewer** panels.

---

## Web UI: how the services surface to you

The React frontend under `web/src/components` is organized around the same concepts as the backend services:

- **Admin** (`AdminSubtabs.tsx`, `GeneralSubtab.tsx`, `SecretsSubtab.tsx`, …)  
  - Talks to `config_store` and the config registry.
  - Lets you edit `agro_config.json` fields, manage profiles, and set secrets.

- **Dashboard** (`DashboardSubtabs.tsx`, `IndexDisplayPanels.tsx`, `SystemStatus.tsx`, …)  
  - Polls indexing status, Qdrant stats, and system health.
  - Surfaces storage breakdown, indexing costs, and live logs.

- **Chat** (`ChatInterface.tsx`, `ChatSettings.tsx`)  
  - Calls the RAG service for answers.
  - Exposes per‑thread model selection and retrieval settings.

- **DevTools** (`Editor.tsx`, `Reranker.tsx`, `Testing.tsx`)  
  - Wraps the editor service, reranker training endpoints, and evaluation APIs.

- **Infrastructure / MCP** (`InfrastructureSubtabs.tsx`, `MCPSubtab.tsx`)  
  - Configures the MCP server so tools like Claude Code can talk directly to AGRO.

Most of the UI components are thin shells over the HTTP API. If you want to script something, you can usually just copy the network call the UI is making.

---

## MCP integration (high‑level)

AGRO exposes its RAG engine over the **Model Context Protocol (MCP)** so that external tools can:

- Ask questions about your codebase.
- Fetch files or symbols by reference.
- Run searches without you copy‑pasting context.

The MCP server is configured like everything else:

- API keys and ports live in `.env`.
- Behavior (which repos, which tools are exposed) lives in `agro_config.json`.

The benefit is not “magic token savings” – it’s that tools like Claude Code can treat AGRO as a first‑class context provider instead of you trying to jam your entire repo into a single prompt.

For details, see: `features/mcp.md`.

---

## You don’t have to use every knob

AGRO ships with a lot of features:

- Hybrid retrieval (BM25 + dense + reranker).
- Self‑learning cross‑encoder reranker.
- Evaluation harness with golden datasets and regression tracking.
- MCP server, editor backend, monitoring stack.

You don’t need all of that to get value:

- For a small repo, **BM25 only** often works well. You can disable dense embeddings and reranking entirely.
- You can run **without Prometheus / Grafana** if you just want a local tool.
- You can ignore MCP and just use the web UI or CLI.

The point of the extra machinery is to be there when you need it – not to force you into a particular stack.

---

## Next steps

<div class="grid cards" markdown>

-   :material-rocket-launch: **Get it running**  
    Read the [Quickstart](getting-started/quickstart.md) and [Installation](getting-started/installation.md) guides.

-   :material-file-code: **Set up your environment**  
    See [Environment configuration](getting-started/environment.md) and the [example `.env`](getting-started/environment-example.md) derived from how the services actually read config.

-   :material-database-search: **Understand retrieval**  
    Dive into [Retrieval Pipeline](features/rag.md) and [Self‑learning reranker](features/learning-reranker.md).

-   :material-clipboard-text-clock: **Add evaluation**  
    Use [Evaluation & Regression Testing](features/evaluation.md) to keep changes honest.

-   :material-code-braces: **Ask AGRO about itself**  
    Once indexed, open the Chat tab and ask things like “Where is `ConfigRegistry` defined?” or “How do I add a new model provider?”.

</div>
