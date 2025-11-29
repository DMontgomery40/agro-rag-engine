# Quick Start: Run AGRO in 5 Minutes

This gets you from zero to a working AGRO stack as fast as possible.

---

## 1. Prerequisites

!!! warning "Required before you start"
    - :material-docker: **Docker** (Desktop, Colima, Rancher, etc.)  
      - Docker daemon must be running
    - :material-language-python: **Python 3.11+**
    - :material-git: **Git**
    - :material-console: **Make** (optional but recommended; comes with most UNIX-like systems)

??? note "Optional but useful"
    - :material-application-braces-outline: **VS Code** (for working with your codebase)
    - :material-cpu-64-bit: **Ollama** if you want fully-local generation out of the box

---

## 2. Clone and start the stack

=== "Linux / macOS"

    ```bash linenums="1"
    # 1. Clone
    git clone https://github.com/DMontgomery40/agro.git
    cd agro

    # 2. Start full stack (Qdrant, Redis, API, GUI, MCP, Grafana, etc.)
    make dev
    ```

=== "If you don't have `make`"

    ```bash linenums="1"
    git clone https://github.com/DMontgomery40/agro.git
    cd agro

    # Equivalent to `make dev`
    bash scripts/dev_up.sh
    ```

!!! note "What `make dev` actually does"
    Under the hood, `make dev` (via `scripts/dev_up.sh` + `scripts/up.sh`) will:
    
    - :material-docker: Check that Docker is reachable (auto-starts Colima if configured)
    - :material-database: Start infra via `docker compose up -d`:
        - Qdrant (vectors)
        - Redis (BM25 + checkpoints)
        - Prometheus + Grafana (metrics)
        - API + GUI (`api` / `agro-api`)
        - MCP servers
        - Embedded editor service
    - :material-rocket-launch: Verify key services (Qdrant, Redis, Prometheus, Grafana)
    - :material-eye: Optionally open the browser to the GUI (unless `OPEN_BROWSER=0`)

---

## 3. Run the onboarding wizard

Once `make dev` finishes:

1. Open the GUI:  
   - :material-web: http://127.0.0.1:8012/
2. The **Onboarding Wizard** walks you through:
   - Pointing AGRO at one or more repos
   - Basic RAG settings
   - (Optional) API keys for OpenAI/Cohere/etc.

!!! tip "Index your first repo"
    - You can let the wizard handle indexing, **or** from another terminal:
      ```bash linenums="1"
      cd /path/to/agro
      # Example: index the AGRO repo itself
      REPO=agro make index
      ```

---

## 4. Verify it’s working

Use any (or all) of these checks:

=== "Docker services"

    ```bash linenums="1"
    cd /path/to/agro

    # Show running containers
    docker compose ps
    ```

    You should see services like `api`, `qdrant`, `rag-redis`, `agro-grafana`, etc.

=== "API & GUI"

    - Open: http://127.0.0.1:8012/
    - Check API docs (Swagger): http://127.0.0.1:8012/docs

=== "Qdrant & Redis"

    ```bash linenums="1"
    # Qdrant
    curl -s http://127.0.0.1:6333/collections

    # Redis (inside container)
    docker exec rag-redis redis-cli ping
    ```

=== "CLI chat (optional)"

    ```bash linenums="1"
    cd /path/to/agro
    . .venv/bin/activate  # if you created a venv
    python -m cli.chat_cli
    ```

---

## 5. Where to go next

Use AGRO to explore itself; the docs are indexed into the engine.

- :material-book-open-page-variant: **Full docs site**  
  https://dmontgomery40.github.io/agro-rag-engine/
- :material-book-outline: **Docs index in repo**  
  `docs/README_INDEX.md`
- :material-robot: **MCP / Claude Code / Codex setup**  
  `docs/QUICKSTART_MCP.md`
- :material-clipboard-text: **API reference**  
  - Swagger: http://127.0.0.1:8012/docs  
  - Markdown: `docs/API_REFERENCE.md`
- :material-test-tube: **Evals & cost estimation**  
  `docs/PERFORMANCE_AND_COST.md`

!!! tip "Ask AGRO about AGRO"
    The entire codebase and docs are indexed.  
    Go to the **Chat** tab in the GUI and ask things like:
    
    - “How do I add a new model provider?”
    - “Where is hybrid search implemented?”
    - “Show me how MCP servers are configured.”