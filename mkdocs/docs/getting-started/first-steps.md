# After AGRO Is Running

Once AGRO is up and the web UI is responding on `http://127.0.0.1:8012`, the next steps are:

1. Index a repository (GUI / CLI / API)
2. Try your first query
3. Explore the different interfaces
4. Run an evaluation to see how well things work

This page assumes:

- Docker stack (or your own process manager) is already running
- Qdrant is reachable at whatever you configured
- The AGRO server is listening on `:8012` (default)

---

## 1. Indexing a Repository

AGRO treats **indexing** as a first-class operation: collect files, chunk them, build BM25, embed into Qdrant, and keep IDs consistent across everything.

Under the hood, the main entrypoint is `indexer/index_repo.py`:

```python linenums="1" hl_lines="14 136 189 229"
def main():
    print(f"=== Clean Indexer v2 ===")
    print(f"Repo: {REPO}")
    print(f"Embedding: {EMBEDDING_TYPE}")
    
    # ...
    
    # 1. Collect files (respecting excludes and size limits)
    for base in bases:
        for root, dirs, files in os.walk(base):
            # prune dirs aggressively
            # ...
            for f in files:
                fp = os.path.join(root, f)
                if should_index(fp, repo_excludes):
                    all_files.append(fp)
    
    # 2. Chunk files (AST-aware when possible)
    file_chunks = chunk_code(src, rel_path, lang, target=900)
    # ...
    
    # 3. Build BM25 index
    bm25 = bm25s.BM25(method='lucene', k1=1.2, b=0.75)
    bm25.index(corpus_tokens)
    bm25.save(idx_dir, corpus=corpus)
    
    # 4. Embed and push to Qdrant
    embed_func, embed_dim = get_embedding_func()
    embeddings = embed_func(texts)
    qc.create_collection(
        collection_name=COLLECTION,
        vectors_config={'dense': models.VectorParams(size=embed_dim, distance=models.Distance.COSINE)}
    )
    qc.upsert(COLLECTION, points=points)
```

The rest of this section is how you *trigger* that from the GUI, CLI, or API.

---

### 1.1 What Gets Indexed (and What Doesn’t)

The indexer is opinionated about what it considers “code” and “junk”.

??? collapsible "Details: file and directory filters (from `index_repo.py`)"
    ```python linenums="1"
    SOURCE_EXTS = {
        '.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java',
        '.c', '.h', '.cpp', '.hpp', '.rb', '.sh', '.yaml', '.yml',
        '.json', '.toml', '.sql'
    }

    SKIP_DIRS = {
        'node_modules', '.venv', 'venv', 'env', '.env', 'vendor',
        'Pods', 'Godeps', '.bundle', 'bundle', 'packages',
        'dist', 'build', '.next', 'out', '__pycache__', '.cache',
        '.git', '.svn', '.hg', '.cursor', '.idea', '.vscode', '.editor_data',
        'checkpoints', 'models', 'coverage', '.pytest_cache', '.mypy_cache',
        'eggs', '*.egg-info', 'site-packages',
    }

    SKIP_FILES = {
        'tooltips.js', 'tooltips.ts', 'usetooltips.ts', 'usetooltips.tsx',
    }

    def should_index(path: str, repo_excludes: List[str] = None) -> bool:
        # extension filter
        # skip tooltips + hidden dirs
        # respect `repos.json` excludes
        # skip files > 1MB
    ```

!!! note
    - Only files with extensions in `SOURCE_EXTS` are considered.
    - Directories like `node_modules`, `.venv`, `dist`, `.git` are **always** skipped.
    - Files larger than ~1MB are skipped to avoid “one file dominates everything” problems.
    - You can add repo-specific excludes via `repos.json` (see the Config docs).

---

### 1.2 Indexing via GUI (:8012)

The GUI runs at:

```text
http://127.0.0.1:8012
```

You’ll see a few main areas: **Chat**, **Indexing**, **Config**, **Eval**, etc. The exact layout may evolve, but the flow is:

1. Open the **Indexing** tab (:material-database-search: or similar).
2. Select your repository from the dropdown (values come from `repos.json`).
3. Choose whether to build:
   - **BM25 only** (fast, often best for small codebases)
   - **BM25 + dense embeddings** (full hybrid search)
4. Click **Start Indexing**.

Behind the scenes the server calls the same code as `indexer/index_repo.py` and exposes status via:

- `GET /api/index/stats`
- `GET /api/index/status`

You can poll these in the UI or directly via curl.

```bash
curl "http://127.0.0.1:8012/api/index/status"
```

!!! tip
    For small repos or early experiments, it’s *totally fine* to run with just BM25. The dense side is more useful once your codebase gets large enough that keyword search starts to struggle.

---

### 1.3 Indexing via CLI

The CLI entrypoint is `cli/agro.py`. Once it’s on your PATH (via `pip install -e .` or similar), you can use the `index` command group.

=== "Quick start"

    ```bash
    # Show high-level CLI help
    agro help

    # List indexing help and subcommands
    agro help index
    ```

=== "Start indexing a repo"

    The exact subcommands live in `cli/commands/index.py`, but the pattern is:

    ```bash
    # Index the repo configured in your profile
    agro index start

    # Or index a specific repo name from repos.json
    agro index start --repo my-project
    ```

=== "Check indexing status"

    ```bash
    agro index-status
    ```

The CLI help is richer than the `--help` flags alone:

```bash
# Rich, formatted help with examples
agro help index
agro help index run
```

Under the hood, `index` commands are thin wrappers around the same FastAPI endpoints that the GUI uses.

---

### 1.4 Indexing via API

If you’d rather script this from CI, you can call the indexing endpoints directly.

The router is in `server/routers/indexing.py`:

```python linenums="1" hl_lines="11 17 22"
@router.post("/api/index/start")
def index_start(payload: Dict[str, Any] = None) -> Dict[str, Any]:
    return svc.start(payload)

@router.get("/api/index/stats")
def index_stats() -> Dict[str, Any]:
    return svc.stats()

@router.post("/api/index/run")
async def run_index(repo: str = Query(...), dense: bool = Query(True)):
    return await svc.run(repo, dense)

@router.get("/api/index/status")
def index_status() -> Dict[str, Any]:
    return svc.status()
```

=== "Start indexing (async job)"

```bash
curl -X POST "http://127.0.0.1:8012/api/index/start" \
  -H "Content-Type: application/json" \
  -d '{"repo": "agro", "dense": true}'
```

=== "Run indexing (await completion)"

```bash
curl -X POST "http://127.0.0.1:8012/api/index/run?repo=agro&dense=true"
```

=== "Check status / stats"

```bash
curl "http://127.0.0.1:8012/api/index/status"
curl "http://127.0.0.1:8012/api/index/stats"
```

!!! warning
    Indexing is I/O and network heavy (BM25, embeddings, Qdrant). For large repos, prefer `index/start` + `index/status` instead of blocking on `index/run`.

---

## 2. Interfaces Overview

Once you’ve indexed at least one repo, there are three main ways to use AGRO:

| Interface        | Port / Entry                  | Best for                                   |
|------------------|-------------------------------|-------------------------------------------|
| GUI              | `http://127.0.0.1:8012`       | Daily usage, browsing results, tweaking   |
| CLI Chat         | `python -m cli.chat_cli`      | Terminal workflows, quick repo Q&A        |
| HTTP API         | `http://127.0.0.1:8012/api`   | Tooling, MCP servers, automation          |

---

### 2.1 GUI (:8012)

Open:

```text
http://127.0.0.1:8012
```

You’ll typically see:

- **Chat**: Ask questions against a repo, inspect citations, and see scoring.
- **Indexing**: Kick off new indexes and inspect last index metadata (e.g., `last_index.json` from `indexer/index_repo.py`).
- **Config**: Tweak models, embedding backends, and repo-specific settings.
- **Eval**: Run and compare evaluation runs.

The GUI knows about:

- The **BM25 index** saved under `out_dir(REPO)/bm25_index`
- The **Qdrant collection** named `code_chunks_{REPO}` (by default)
- The **chunk metadata** stored in `chunks.jsonl`

So when you click on a citation in the UI, it’s using the same `file_path`, `start_line`, `end_line`, and `hash` that the indexer wrote.

---

### 2.2 CLI Chat

The interactive chat CLI is in `cli/chat_cli.py`. It talks to the HTTP API when possible and falls back to a local LangGraph pipeline when the API is down.

=== "Start the chat (simple)"

```bash
python -m cli.chat_cli
```

=== "Using config registry (recommended)"

AGRO uses a config registry so everything (GUI, CLI, MCP) shares the same settings:

```bash
# In your .env or environment
export REPO=agro
export THREAD_ID=my-session-1
export PORT=8012

python -m cli.chat_cli
```

The CLI will:

1. Try `POST /api/chat` on `API_BASE = http://127.0.0.1:${PORT}`
2. If that fails, it lazily initializes a local LangGraph with Redis checkpoints:

    ```python linenums="1" hl_lines="9 21"
    def _ensure_graph(self):
        if self._graph_fallback_ready:
            return
        try:
            self.graph = build_graph()
            self._graph_fallback_ready = True
            console.print("[green]✓[/green] Graph initialized locally (Redis checkpoints)")
        except Exception as e:
            console.print(f"[red]✗[/red] Failed to initialize local graph: {e}")
    ```

#### CLI Chat Commands

While in the chat loop, use:

```text
/repo <name>   Switch repository (from repos.json)
/model <name>  Switch generation model (gpt-4o, claude-3-5-sonnet, etc.)
/save          Save conversation checkpoint (Redis)
/clear         Clear history (new thread ID)
/help          Show command help
/exit or /quit Leave the chat
```

After each answer, you can rate it `1–5`. The CLI will post feedback back to the server:

```python linenums="1" hl_lines="3 16"
def submit_feedback(self, event_id: str, rating: int, note: Optional[str] = None):
    signal = f"star{rating}"
    payload = {"event_id": event_id, "signal": signal}
    if note:
        payload["note"] = note

    response = requests.post(f'{API_BASE}/api/feedback', json=payload, timeout=5)
```

This feeds into the evaluation and reranking parts of the system.

---

### 2.3 HTTP API

The HTTP API is what both the GUI and CLI use. You can treat it as a normal JSON API for:

- Chat with RAG
- Indexing
- Evaluation
- MCP integration

The routers live under `server/routers/`. For indexing we saw `indexing.py` earlier; chat and eval have similar shapes.

=== "Example: chat via API"

```bash
curl -X POST "http://127.0.0.1:8012/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
        "question": "How does the indexer ensure BM25 and Qdrant IDs match?",
        "repo": "agro"
      }'
```

Typical response shape:

```json
{
  "generation": "… answer text …",
  "documents": [
    {
      "file_path": "indexer/index_repo.py",
      "start_line": 180,
      "end_line": 240,
      "rerank_score": 0.91,
      "hash": "…"
    }
  ],
  "confidence": 0.83,
  "event_id": "event_1234"
}
```

You can then call `/api/feedback` with that `event_id` the same way the CLI does.

---

## 3. Running Your First Query

Once at least one repo is indexed, you can start asking questions.

---

### 3.1 From the GUI

1. Go to the **Chat** tab.
2. Select your repo (e.g., `agro`).
3. Ask something grounded in the code, for example:

    ```text
    How does AGRO decide which files to index in a repo?
    ```

4. Inspect:
   - The **answer text**
   - The **confidence** score
   - The **top sources**: file paths, line ranges, and scores

You should see citations pointing into `indexer/index_repo.py`, specifically the `should_index` function and the `SOURCE_EXTS` / `SKIP_DIRS` constants.

!!! tip
    If the answer seems off, click through the citations. Most “wrong” answers are really “wrong query scopes” (e.g., the repo isn’t what you think, or you’re hitting an old index). Re-run indexing if needed.

---

### 3.2 From the CLI Chat

Start the chat:

```bash
python -m cli.chat_cli
```

You’ll get a welcome panel like:

```text
# 🤖 RAG CLI Chat

Connected to: agro
Thread ID: cli-chat
API: http://127.0.0.1:8012
```

Then:

```text
agro > How are code chunks stored in Qdrant?
```

Behind the scenes, the CLI calls `POST /api/chat`, then formats the answer:

```python linenums="1" hl_lines="1 9"
def _format_answer(self, generation: str) -> str:
    lines = generation.split('\n')
    # Remove [repo: ...] header if present
    if lines and lines[0].startswith('[repo:'):
        return '\n'.join(lines[1:]).strip()
    return generation
```

You’ll see:

- A panel with the answer and confidence
- A short list of top sources, like:

    ```text
    1. indexer/index_repo.py:189-236 (score: 0.947)
    ```

You can rate the answer `1–5` to send feedback.

---

### 3.3 From the API

Same question via curl:

```bash
curl -X POST "http://127.0.0.1:8012/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
        "question": "How are code chunks stored in Qdrant?",
        "repo": "agro"
      }' | jq
```

Expect citations into the `Embedding and storing in Qdrant` section:

```python linenums="1" hl_lines="1 17 37"
# Embed and store in Qdrant
print(f"\n4. Embedding and storing in Qdrant...")

embed_func, embed_dim = get_embedding_func()
texts = [c['code'] for c in chunks]
embeddings = embed_func(texts)

qc = QdrantClient(url=QDRANT_URL)
qc.create_collection(
    collection_name=COLLECTION,
    vectors_config={'dense': models.VectorParams(size=embed_dim, distance=models.Distance.COSINE)}
)

points.append(models.PointStruct(
    id=pid,
    vector={'dense': emb},
    payload={k: v for k, v in payload.items() if v is not None}
))
```

---

## 4. Running an Evaluation

AGRO ships with an evaluation pipeline so you can measure how well retrieval + generation is working for your repo, not just “does it feel good”.

There are two main entry points:

- The **Eval** tab in the GUI
- The **`agro eval`** CLI group

Under the hood, these call into `cli/commands/eval.py` and evaluation services on the server side.

---

### 4.1 Evaluation via CLI

The CLI groups are wired in `cli/agro.py`:

```python linenums="1" hl_lines="30 40"
# Eval group
@cli.group()
def evaluation():
    """Evaluation suite."""
    pass
evaluation.add_command(eval.run)
evaluation.add_command(eval.status)
evaluation.add_command(eval.results)
evaluation.add_command(eval.save_baseline)
evaluation.add_command(eval.compare)
cli.add_command(evaluation, name="eval")
```

So from your shell:

=== "Show eval help"

```bash
agro help eval
```

=== "Run an evaluation"

The exact flags depend on how you set up your golden dataset, but structurally:

```bash
# Run eval for the current repo/profile
agro eval run

# Or explicitly specify a repo and dataset
agro eval run --repo agro --dataset my-golden-set
```

=== "Check status & results"

```bash
agro eval status
agro eval results
```

=== "Baselines & comparisons"

```bash
# Save the current run as a baseline
agro eval save-baseline --name "bm25-only"

# Compare a new run against the baseline
agro eval compare --baseline "bm25-only" --current "bm25+dense"
```

!!! note
    Evaluations are where the “turn on dense embeddings” decision should usually be made. If BM25-only is already hitting your recall/quality targets, there’s no need to complicate things.

---

### 4.2 Evaluation via GUI

In the GUI:

1. Open the **Eval** tab.
2. Select:
   - The **repo**
   - The **golden dataset** (if you’ve created one via the `golden` CLI group)
   - The **model profile** (if relevant)
3. Click **Run Evaluation**.

You’ll see:

- Progress (per-query or per-batch)
- Metrics (retrieval recall, answer correctness, etc.)
- Comparisons to previous runs / baselines

The GUI is just calling the same `eval.run`, `eval.status`, `eval.results` endpoints the CLI wraps.

---

## 5. Where to Go Next

At this point you should be able to:

- Index a repo (GUI / CLI / API)
- Query it (GUI / CLI / API)
- Run an evaluation and compare runs

From here, the deeper features start to matter:

- **Config profiles**: Different model backends per repo or per task.
- **Reranker training**: Use your feedback and golden sets to train a better reranker.
- **MCP servers**: Expose AGRO as tools to Claude Code, Codex, or your own agents without stuffing the entire codebase into context.
- **AGRO-on-AGRO**: Ask the system how *it* works. The AGRO repo is indexed into itself, so you can query the design decisions directly from the chat tab.

If you’re unsure what a parameter does in any of these areas, hover over it in the GUI. Every knob and lever is documented there, with links to the original papers and official docs. The goal is that you don’t have to leave AGRO—or this documentation—to understand what you’re tuning.