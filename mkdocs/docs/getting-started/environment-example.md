---
title: Example .env file
---

# Example `.env` file

This page is a concrete, copy‑pasteable `.env` template for AGRO. It’s derived from how the backend services actually read configuration, not from a hand‑maintained list.

Under the hood, everything flows through the configuration registry in `server/services/config_registry.py`:

1. `.env` (highest precedence – secrets, infra overrides)
2. `agro_config.json` (tunable RAG behavior, models, retrieval knobs)
3. Pydantic defaults (fallbacks)

You don’t need every key here – most have sensible defaults. Start with the **minimal** section, then add the others as you wire up more features.

!!! warning
    This is an example, not a drop‑in production config. Never commit real API keys to Git.

---

## Minimal local setup

This is enough to:

- run the web UI
- index a local repo
- query via BM25 / dense search (with a local or cloud LLM you configure)

```bash title=".env" linenums="1"
# --- Core repo / indexing ---
# Name of the repo profile. Used for index names, paths under ./data, etc.
REPO=agro

# Where AGRO should look for the repo on disk. If unset, defaults to the
# AGRO repo itself (via common.paths:repo_root()).
# Example: /home/me/src/my-project
REPO_ROOT=

# --- HTTP server ---
# Bind address for the FastAPI app.
# "0.0.0.0" to listen on all interfaces, "127.0.0.1" for local only.
HOST=0.0.0.0
PORT=8012

# --- Basic editor / devtools ---
# Embedded code editor in the DevTools tab.
EDITOR_ENABLED=true
EDITOR_EMBED_ENABLED=true
# "local" = bind to localhost only, "public" = bind to HOST.
EDITOR_BIND=local
EDITOR_PORT=4440

# --- Logging / debug ---
LOG_LEVEL=INFO

# --- Model provider keys (optional, set what you actually use) ---
# These are read via SECRET_FIELDS in server/services/config_store.py
# and never echoed back in clear text.
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
COHERE_API_KEY=
VOYAGE_API_KEY=
JINA_API_KEY=
MISTRAL_API_KEY=
GROQ_API_KEY=
FIREWORKS_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=

# If you use LangSmith / LangChain / LangTrace for external tracing.
LANGSMITH_API_KEY=
LANGCHAIN_API_KEY=
LANGTRACE_API_KEY=
```

!!! note
    If you leave `REPO_ROOT` empty, AGRO will treat the AGRO repo itself as the target and index its own source tree. That’s intentional – the system is indexed on itself so you can ask it how it works.

---

## Indexing & retrieval knobs (env‑overridable)

Most retrieval behavior is configured in `agro_config.json` and validated by `AgroConfigRoot`, but some keys are explicitly overridable via `.env` for convenience or infra reasons.

These are read through the config registry (`get_config_registry()`), then cached in the relevant services.

```bash title=".env" linenums="1"
# --- Indexing process ---
# Controls the indexer subprocess started by server/services/indexing.py

# If true, enrich code chunks with structured summaries / metadata during indexing
# when you trigger indexing with the "enrich" flag in the UI or API.
ENRICH_CODE_CHUNKS=false

# Maximum number of concurrent indexing workers (depends on your CPU / IO).
INDEX_WORKERS=4

# --- Retrieval top-k ---
# Used by server/services/rag.py when top_k is not provided explicitly.
# FINAL_K is preferred; LANGGRAPH_FINAL_K is a legacy / graph-specific fallback.
FINAL_K=10
LANGGRAPH_FINAL_K=10

# --- Keyword extraction / discriminative keywords ---
# These are read once at import time in server/services/keywords.py and can be
# reloaded via reload_config(). They control the discriminative keyword layer
# that sits on top of BM25 + dense search.

# Max number of discriminative keywords to keep per repo.
KEYWORDS_MAX_PER_REPO=50

# Minimum frequency for a term to be considered as a discriminative keyword.
KEYWORDS_MIN_FREQ=3

# Multiplicative boost applied to keyword matches in hybrid scoring.
KEYWORDS_BOOST=1.3

# Whether to auto-generate discriminative keywords from the indexed corpus.
# 1 = enabled, 0 = disabled.
KEYWORDS_AUTO_GENERATE=1

# How often (in hours) to refresh auto-generated keywords.
KEYWORDS_REFRESH_HOURS=24
```

??? tip "When to touch these"
    For small codebases, you can leave all of these at defaults and often get better behavior by just tuning BM25 and dense weights in `agro_config.json`. The keyword layer is there for larger or noisy repos where you need extra discriminative power.

---

## Web UI & editor integration

The web UI has a few toggles that are backed by the config registry and can be overridden via `.env`. These are surfaced in the **DevTools → Editor** and **Infrastructure** subtabs.

```bash title=".env" linenums="1"
# --- Embedded editor service (DevTools / Editor tab) ---

# Enable/disable the editor service entirely.
EDITOR_ENABLED=true

# Allow embedding the editor in iframes (used by the UI).
EDITOR_EMBED_ENABLED=true

# Where the editor binds:
#   local  -> 127.0.0.1 only
#   public -> same as HOST
EDITOR_BIND=local

# Port for the editor HTTP server.
EDITOR_PORT=4440

# Optional: override the editor Docker image if you run it as a sidecar.
# This is read via server/services/editor.py and the Docker UI components.
EDITOR_IMAGE=
```

!!! note
    The editor service writes its own small `settings.json` and `status.json` under `server/out/editor/`. Those are *not* part of the main config registry; they’re just runtime state for the DevTools UI.

---

## MCP / external tools

If you use AGRO as an MCP server for tools like Claude Code / Codex, you’ll typically set a few extra keys. These are read via the same secret handling in `config_store.py`.

```bash title=".env" linenums="1"
# --- MCP / tool integration ---

# Generic API key for MCP backends that need it.
MCP_API_KEY=

# Optional: Grafana / monitoring integration (used by GrafanaSubtabs, etc.).
GRAFANA_API_KEY=
GRAFANA_AUTH_TOKEN=

# Optional: Netlify / webhook integrations.
NETLIFY_API_KEY=
OAUTH_TOKEN=
```

The actual MCP wiring is documented in more detail in [`features/mcp.md`](../features/mcp.md). The important bit here is that all of these secrets live in `.env` and are never written back into `agro_config.json` or any of the JSON profiles.

---

## Monitoring & tracing

AGRO ships with a full monitoring stack (Prometheus, Loki, Grafana) and its own trace viewer. Most of that is configured via JSON under `data/config/` and Docker compose, but a few environment variables are useful when running outside Docker.

```bash title=".env" linenums="1"
# --- Tracing / telemetry ---

# Optional: enable external tracing backends.
# These are read by server.telemetry and the evaluation / tracing UI.
LANGSMITH_API_KEY=
LANGCHAIN_API_KEY=
LANGTRACE_API_KEY=

# Optional: override where traces are written. By default, traces live under
#   out/<REPO>/traces
# and are listed by server/services/traces.py.
TRACES_DIR=
```

!!! note
    The built‑in trace viewer (`Evaluation → Trace Viewer` and `Analytics → Tracing`) reads JSON traces from disk via `server/tracing.py` and `server/services/traces.py`. You don’t need any external service to use it.

---

## Putting it together

A realistic local `.env` for a single‑repo setup might look like this:

```bash title=".env" linenums="1"
REPO=my-project
REPO_ROOT=/home/me/src/my-project
HOST=127.0.0.1
PORT=8012

EDITOR_ENABLED=true
EDITOR_BIND=local
EDITOR_PORT=4440

FINAL_K=12
KEYWORDS_AUTO_GENERATE=1
KEYWORDS_MAX_PER_REPO=80

OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=ls-...
```

From there, you tune everything else in `agro_config.json` via the UI (Admin → Settings) or by editing the file directly. The config registry will merge `.env` and `agro_config.json` on startup and expose a single, type‑checked view of configuration to the rest of the system.
