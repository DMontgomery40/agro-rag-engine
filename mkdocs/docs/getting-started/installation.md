# Installation & Setup

This page walks through installing AGRO from scratch, what each component does, and common issues you might hit along the way.

AGRO is designed to be *local‑first* but not “everything in one binary”. There’s a small set of services (Qdrant, Redis, optional observability stack), plus a Python app that runs the API, GUI, and MCP servers.

---

## System requirements

AGRO is a RAG engine for **codebases**, not a toy demo. You *can* run it on a laptop, but you should know what you’re signing up for.

### Host OS

- Linux (x86_64) – primary target, best tested
- macOS (Apple Silicon or Intel)
- Windows via WSL2 (Ubuntu/Debian recommended)

!!! note
    Native Windows without WSL is not a priority. You *might* get it working, but most scripts assume a POSIX shell and Docker / Compose that behave like Linux.

### Python

- **Python 3.10–3.12** recommended
- Python **3.13** works, but:
  - `tree_sitter_languages` is conditionally skipped
  - You’ll fall back to regex-based chunking instead of tree-sitter

AGRO uses `pydantic>=2.11` and modern LangChain/LangGraph, so older Python versions are not supported.

!!! tip
    If you’re on macOS with both system Python and `brew` Python, use the `brew` one and create a venv explicitly:
    ```bash
    /usr/local/bin/python3.12 -m venv .venv
    ```

### RAM & CPU

This depends entirely on what models you use.

| Use case | Typical setup | RAM guidance | Notes |
|---------:|---------------|-------------|-------|
| Basic RAG over small repo | BM25 + small local embedding model or OpenAI embeddings | 8–16 GB | Fine on a laptop; no GPU required |
| Medium codebase, local 7B model via Ollama | Qdrant + Redis + Ollama 7B model | 16–32 GB | Good balance of speed and quality |
| Large mono-repo + 30B local model | Qdrant + Redis + Ollama 30B / custom server | 32+ GB | This is where you should expect to tune and monitor resources |

AGRO itself (FastAPI, LangGraph, Qdrant, Redis) is relatively lightweight; the heavy part is whatever models you choose.

### Disk

Very rough guidance:

- Base repo: a few hundred MB for Python deps + Qdrant + Redis metadata
- Per indexed repo:
  - **BM25** index: tens to hundreds of MB depending on size
  - **Vector index**: roughly `num_chunks * vector_dim * 4 bytes` (for `float32`)  
    plus overhead; quantization (int4) helps a lot.

!!! tip
    AGRO includes storage estimation in the GUI (see the *Cost / Storage* panels). Use that instead of guessing when you start indexing large repos.

---

## High-level architecture

AGRO splits responsibilities across a few containers and a Python app.

```mermaid
flowchart LR
    subgraph Host
        subgraph Docker
            Q[Qdrant\nVectors]
            R[Redis\nCheckpoints + cache]
            P[Prometheus\n:material-chart-line:]
            G[Grafana\n:material-monitor:]
            L[Loki\nLogs]
            A[Alertmanager\nAlerts]
        end

        subgraph Python App
            API[FastAPI + LangGraph\nserver/app.py]
            MCP_STDIO[MCP server (stdio)\nserver/mcp/server.py]
            MCP_HTTP[MCP server (HTTP)\nserver/mcp/http.py]
        end
    end

    API --> Q
    API --> R
    MCP_STDIO --> API
    MCP_HTTP --> API
    P --> G
    L --> G
    API --> P
    API --> L
```

### Core containers

| Service | Role | Why AGRO uses it |
|--------|------|------------------|
| **Qdrant** | Vector database | Stores dense embeddings for your code chunks and “cards”. Handles vector search, filtering, and payloads. |
| **Redis Stack** | Checkpoints, caches, and BM25 index | Used by LangGraph for conversational state, plus some caching. BM25 indices are stored on disk in your repo, but Redis is still used heavily. |
| **Prometheus** (optional) | Metrics scraping | Collects metrics from the AGRO API process (Prometheus client). |
| **Alertmanager** (optional) | Alert routing | Fires alerts based on Prometheus rules (e.g., indexing failures, high error rates). |
| **Loki** (optional) | Log aggregation | Collects logs from Docker and the host. Useful when you’re running long evals or multiple agents. |
| **Promtail** (optional) | Log shipping | Sends Docker and host logs into Loki. |
| **Grafana** (optional) | Dashboard UI | Embedded in the AGRO GUI via iframe. Preconfigured dashboards for search quality, evals, and basic health. |

!!! note
    The `infra/docker-compose.yml` file in the repo is **deprecated** and kept only for reference. The active configuration is the root‑level `docker-compose.services.yml` (used by the `Makefile` and scripts).

---

## Quick start

If you just want everything running with defaults:

```bash
git clone https://github.com/DMontgomery40/agro.git
cd agro

# Start infra + API + MCP + GUI
make dev

# Run onboarding CLI to register repos, etc.
cd scripts
bash setup.sh
# or, from repo root:
# make setup repo=/abs/path/to/your/repo name=my-repo

# GUI at:
# http://127.0.0.1:8012/
```

!!! note
    `make dev` uses Docker Compose to start Qdrant, Redis, API, MCP servers, and observability stack (Prometheus, Grafana, Loki, etc.), then opens the browser to the GUI. If you don’t want the browser to open (e.g., for CI or Playwright), use `make dev-headless`.

---

## Detailed installation

### 1. Clone the repo

```bash
git clone https://github.com/DMontgomery40/agro.git
cd agro
```

If you plan to customize AGRO itself, this is where you’ll be working. The system is fully indexed on itself, so once it’s running you can ask AGRO questions about its own code.

---

### 2. Infrastructure (Docker)

AGRO ships with Compose configs to run Qdrant, Redis, and observability services.

#### Recommended: use provided scripts

=== "Start everything (dev)"
```bash
make dev
```

=== "Infra only"
```bash
# Start Qdrant + Redis + observability stack without API
bash scripts/up.sh
```

=== "Stop everything"
```bash
make down
# or
bash scripts/down.sh
```

The `Makefile` maps to:

```makefile
up:
	bash scripts/up.sh

down:
	bash scripts/down.sh

dev:
	bash scripts/dev_up.sh
```

You usually don’t need to touch Compose directly unless you’re debugging.

#### Docker services and names

The main API service is:

- **Compose service name**: `api`
- **Container name**: `agro-api`

Use the **service name** with `docker compose`:

```bash
# Build and start API
docker compose -f docker-compose.services.yml up -d api

# View logs via Compose
docker compose -f docker-compose.services.yml logs -f api
```

Use the **container name** with `docker`:

```bash
# Exec into running container
docker exec -it agro-api bash

# Tail logs directly
docker logs -f agro-api
```

!!! tip
    If something seems off (e.g., GUI not loading), start by checking:
    ```bash
    docker compose -f docker-compose.services.yml ps
    docker compose -f docker-compose.services.yml logs -f api
    ```

---

### 3. Python environment

You only need a Python environment if:

- You want to run the API outside Docker (e.g., local dev, debugging)
- You’re running CLI tools or evals directly (`python index_repo.py`, `python -m cli.chat_cli`, etc.)

#### Create and activate venv

```bash
cd /path/to/agro

python3 -m venv .venv
. .venv/bin/activate
```

#### Install dependencies

There are two requirements files:

- `requirements-rag.txt` – minimal stack for RAG, indexing, and API
- `requirements.txt` – superset, includes CLI niceties (`rich`), Docker client, websockets, etc.

=== "Minimal (RAG + API)"
```bash
pip install -r requirements-rag.txt
```

=== "Full dev"
```bash
pip install -r requirements-rag.txt
pip install -r requirements.txt
```

You can verify core dependencies:

```bash
python -c "import langgraph, qdrant_client, bm25s, sentence_transformers; print('✓ OK')"
```

!!! note
    `torch==2.8.0` and `transformers==4.57.0` are pinned. On some platforms, especially with older GPUs or unusual CUDA toolkits, you may need to adjust these. For CPU-only setups, the default pins are usually fine.

---

### 4. Environment configuration

The **recommended** way to set most config is via the GUI:

- Open the GUI: `http://127.0.0.1:8012/`
- Go to **Settings → Misc**
- Adjust values and click **Apply All Changes**

Under the hood, everything flows through Pydantic models, so once you define a model or setting in one place it propagates everywhere (API, MCP, GUI).

For scripting, CI, or debugging, you can use a `.env` file.

#### Example `.env`

```bash
cd /path/to/agro

cat > .env <<'EOF'
# Infrastructure
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379/0

# RAG Configuration
REPO=agro                     # Default repo for operations
MQ_REWRITES=4                 # Multi-query expansion count

# Reranker (default: Cohere with local fallback)
RERANK_BACKEND=cohere         # cohere | hf | local
COHERE_API_KEY=               # Set this to enable Cohere rerank
COHERE_RERANK_MODEL=rerank-3.5

# Generation (default: local Qwen 3 via Ollama)
OLLAMA_URL=http://127.0.0.1:11434/api
GEN_MODEL=qwen3-coder:30b     # or qwen2.5-coder:7b for lower RAM

# Optional: OpenAI for generation (instead of Ollama)
# OPENAI_API_KEY=sk-proj-...
# GEN_MODEL=gpt-4o-mini

# Optional: Embeddings provider
EMBEDDING_TYPE=openai         # openai | local | voyage | gemini
OPENAI_API_KEY=
VOYAGE_API_KEY=

# Optional: Netlify multi-site deploys for MCP tool
NETLIFY_DOMAINS=site-a.com,site-b.com
NETLIFY_API_KEY=

# LangChain (optional tracing)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=rag-service
EOF

chmod 600 .env
```

!!! tip
    You don’t have to pick “one true model”. AGRO lets you define **profiles** (e.g. `Docs-search`, `Plan_Refactor`) that pick different gen / embedding / rerank models per task, and even per MCP transport (HTTP vs stdio vs WebSocket). The GUI has a full explanation of each parameter, with tooltips and links to papers.

---

### 5. RAG ignore & filtering

This is one of the most important steps to get good results.

AGRO uses three layers of filtering:

#### 1. Built‑in filtering

In `common/filtering.py`, AGRO automatically skips:

- Directories like:
  - `node_modules/`, `vendor/`, `dist/`, `build/`, `.git/`, etc.
- Non-code file types:
  - Only common code extensions are indexed (`.py`, `.js`, `.ts`, `.rb`, `.go`, etc.)

You don’t need to configure this; it’s applied by default during indexing.

#### 2. Project-specific excludes

Edit `data/exclude_globs.txt` to add glob patterns that apply across repos:

```bash
cd /path/to/agro

# View existing patterns
cat data/exclude_globs.txt

# Add your own
echo "**/my-vendor-dir/**"       >> data/exclude_globs.txt
echo "**/*.generated.ts"         >> data/exclude_globs.txt
echo "**/migrations/**"          >> data/exclude_globs.txt
```

Common patterns (strongly recommended):

```bash
# Virtual environments (CRITICAL)
**/.venv/**
**/venv/**
**/env/**
**/.virtualenv/**
**/virtualenv/**
**/.pyenv/**

# Build artifacts
**/dist/**
**/build/**
**/.next/**
**/.turbo/**
**/.svelte-kit/**

# Generated code
**/*.generated.*
**/*.min.js
**/*.min.css
**/*.bundle.js
**/*.map

# Tests and fixtures
**/test/**
**/tests/**
**/*.spec.ts
**/*.spec.js
**/*.test.ts
**/*.test.js
**/fixtures/**
**/mocks/**
**/__mocks__/**
**/test-data/**

# Large binary-ish data
**/*.json.gz
**/*.png
**/*.jpg
**/*.jpeg
**/*.gif
**/*.svg

# Vendor / dependencies
**/third_party/**
**/external/**
**/node_modules/**
**/vendor/**
**/Pods/**

# Lockfiles
**/package-lock.json
**/yarn.lock
**/pnpm-lock.yaml
**/poetry.lock

# Migrations and install scripts
**/migrations/**
**/install/**
```

#### 3. Auto-generate keywords (optional)

AGRO ships with analysis scripts to help you tune search for a specific repo:

```bash
cd /path/to/agro/scripts

# Basic analysis
python analyze_keywords.py /path/to/your/repo

# Enhanced analysis
python analyze_keywords_v2.py /path/to/your/repo
```

These scripts output:

- Most common file types
- Directory structure overview
- Suggested keywords for `hybrid_search.py`
- Recommended path boosts

You can then wire those into your retrieval config (via GUI or YAML profiles) to bias results toward core code paths.

---

### 6. Index a repo

Once infra, Python env, and filtering are in place, you can index.

#### Using Makefile

```bash
# From repo root
# Usage: make setup repo=/abs/path/to/repo name=my-repo
make setup repo=/abs/path/to/your/repo name=my-repo

# Index the repo (Python venv required)
make index REPO=my-repo
```

The `index` target runs:

```makefile
index:
	. .venv/bin/activate && REPO=$(REPO) python index_repo.py
```

#### Docker-first indexing (no local venv)

If you don’t want Python on the host, you can index inside the API container:

```bash
# Ensure api service is up
docker compose -f docker-compose.services.yml up -d api

# Index using the container
make index-docker REPO=my-repo
# which runs:
# docker compose -f docker-compose.services.yml exec -T api \
#   bash -lc "REPO=${REPO:-agro} OUT_DIR_BASE=/app/out python index_repo.py"
```

Indexing will:

- Walk the repo with filtering rules
- Chunk files (AST-based where possible, regex fallback otherwise)
- Build BM25 indices
- Compute embeddings and upsert to Qdrant
- Build “cards” (summarized chunks) and card-level BM25

---

### 7. Start API and GUI

If you used `make dev`, the API and GUI should already be running.

#### Start API (production-style)

```bash
# Uses Gunicorn + Uvicorn workers
make api
# internally:
# bash scripts/api_up.sh
```

API docs and GUI:

- Swagger / OpenAPI: `http://127.0.0.1:8012/docs`
- GUI: `http://127.0.0.1:8012/`

#### CLI chat

For local terminal chat with memory:

```bash
. .venv/bin/activate
python -m cli.chat_cli
```

---

## Observability stack

If you want to actually see what AGRO is doing (and not just hope), the observability stack is worth turning on. `make dev` already does this.

### Components

| Service | Ports | Purpose |
|--------|-------|---------|
| **Prometheus** | `9090` | Metrics scraping from AGRO API |
| **Alertmanager** | `9093` | Alerts based on Prometheus rules |
| **Loki** | `3100` | Centralized logs |
| **Promtail** | – | Ships logs from host + Docker into Loki |
| **Grafana** | `3000` | Dashboards, embedded in AGRO |

#### Handy Make targets

```bash
# Prometheus UI
make prom
# -> http://127.0.0.1:9090

# Grafana UI
make grafana
# -> http://127.0.0.1:3000
# Default login: admin / Trenton2023

# Generate/import Grafana dashboard JSON
make dash
```

!!! warning
    The Grafana admin password is baked into the infra config for **local dev only**:
    ```bash
    GF_SECURITY_ADMIN_USER=admin
    GF_SECURITY_ADMIN_PASSWORD=Trenton2023
    ```
    If you expose this stack beyond localhost, change these values and lock down access.

---

## Common installation issues

This section is intentionally blunt: what usually breaks and how to fix it.

### Docker / Compose not found

**Symptom**

- `make dev` prints errors like `docker: command not found` or `docker compose: command not found`.

**Fix**

- Install Docker and Docker Compose:
  - Linux: use your distro’s packages or Docker’s official install
  - macOS: Docker Desktop
- For old setups where `docker-compose` is separate:
  - Update scripts to use `docker-compose` instead of `docker compose`, or upgrade Docker.

---

### API not reachable at `http://127.0.0.1:8012/`

**Checklist**

1. Is the container running?

    ```bash
    docker compose -f docker-compose.services.yml ps
    ```

    Look for `api` with state `Up`.

2. Logs look sane?

    ```bash
    docker compose -f docker-compose.services.yml logs -f api
    ```

3. Anything already bound to port `8012`?

    ```bash
    lsof -i :8012
    ```

    If another process is using it, either stop that process or change AGRO’s port (via env or Compose).

---

### Qdrant / Redis not reachable

**Symptom**

- API logs mention connection errors to Qdrant or Redis.
- Indexing fails early.

**Checklist**

```bash
# Check containers
docker ps | grep -E 'qdrant|rag-redis'

# Test Qdrant
curl -s http://127.0.0.1:6333/collections

# Test Redis
docker exec rag-redis redis-cli ping
# -> PONG
```

**Fixes**

- If containers are missing: `bash scripts/up.sh` or `make dev`.
- If ports are changed, update `QDRANT_URL` and `REDIS_URL` in `.env` or GUI.

---

### Python dependency issues

**Symptom**

- `pip install` fails on `torch`, `tree_sitter_languages`, or `rerankers`.

**Common causes & fixes**

- **No compatible wheels for `torch`**:
  - Use a Python version with good wheel support (3.10–3.12).
  - For GPU installs, follow PyTorch’s official instructions, then install the rest of requirements without `torch` pinned.
- **`tree_sitter_languages` fails on Python 3.13**:
  - This is expected; the requirement is conditional:
    ```text
    tree_sitter_languages==1.10.2; python_version < "3.13"
    ```
  - On 3.13, you’ll see a warning but chunking falls back to regex. No need to fix unless you care deeply about AST-based chunking.

---

### Nothing shows up in search for a repo

**Symptom**

- GUI loads, but search results are empty or obviously wrong for a repo you thought you indexed.

**Checklist**

1. Did indexing actually run?

    ```bash
    # Host
    REPO=my-repo python index_repo.py
    # or
    make index REPO=my-repo

    # Docker
    make index-docker REPO=my-repo
    ```

2. Check index logs:

    ```bash
    docker logs -f agro-api  # if indexing inside container
    ```

3. Verify Qdrant collections:

    ```bash
    curl -s http://127.0.0.1:6333/collections | jq
    ```

4. Confirm `REPO` value in `.env` or GUI matches the repo you indexed.

If you see lots of “skipping file” logs, your `exclude_globs` might be too aggressive.

---

### Grafana not embedding in GUI

**Symptom**

- Standalone Grafana at `http://127.0.0.1:3000` works, but inside AGRO’s GUI you see blocking / refused.

**Cause**

- Grafana’s security settings prevent iframe embedding by default.

**Fix**

The infra config already sets:

```yaml
GF_SECURITY_ALLOW_EMBEDDING=true
GF_AUTH_ANONYMOUS_ENABLED=true
GF_AUTH_ANONYMOUS_ORG_ROLE=Editor
GF_SECURITY_COOKIE_SAMESITE=disabled
```

If you changed these, restore them or adjust the AGRO GUI settings to point to a Grafana instance that allows embedding.

---

### MCP tools not visible in Claude Code / Codex

**Symptom**

- You expect AGRO’s MCP server to show up as a tool but it doesn’t.

**Checklist**

1. Confirm MCP server is running (stdio or HTTP, depending on your agent).
2. Check the server definition:
    - `server/mcp/server.py` – stdio MCP server
    - `server/mcp/http.py` – HTTP MCP server
3. Confirm your agent config points to:
    - Correct transport (stdio / HTTP / WebSocket)
    - Correct host/port (for HTTP/WebSocket)