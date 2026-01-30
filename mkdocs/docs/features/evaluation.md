---
Title: Evaluation & Regression Testing
---

# Evaluation & Regression Testing

AGRO ships with a full evaluation loop for the RAG pipeline. The goal isn’t to chase a single “accuracy” number – it’s to make it easy to:

- Build and maintain a local golden dataset
- Run repeatable evaluations against your current config
- Compare runs over time as you tweak retrieval, models, and prompts
- Drill into failures and traces when something regresses

This page focuses on how the evaluation system actually works in the current codebase and how to use it effectively.


## Where evaluation data lives

All of the evaluation artifacts are plain JSON files on disk:

- `data/golden.json` – primary golden dataset (questions + expected answers / contexts)
- `data/evaluation_dataset.json` – additional evaluation questions (often larger / noisier)
- `data/evals/*.json` – individual evaluation runs
- `data/backups/evals_/*.json` – older baselines and snapshots
- `data/tracking/evals_latest.json` – pointer to the most recent run

On top of that, the web UI and CLI both talk to the same HTTP API to:

- Trigger an evaluation run
- Read/write golden questions
- Inspect historical runs and traces


## What an evaluation run actually does

At a high level, an evaluation run is:

1. Load a set of questions + expected answers from disk
2. For each question:
   - Run it through the same RAG pipeline as the normal `/rag` or chat endpoints
   - Capture retrieval stats, model outputs, and traces
3. Compute metrics (per‑question and aggregate)
4. Write a self‑contained JSON report under `data/evals/`

The important part is that evaluation uses the same code paths as production queries:

- Retrieval goes through `retrieval.hybrid_search.search_routed_multi`
- RAG answers go through `server/services/rag.py` (and `langgraph_app` if enabled)
- Configuration is read from the same registry (`server/services/config_registry.py`)

That means any change you make to:

- `agro_config.json`
- `.env`
- Indexing parameters
- Model configuration

…will be reflected in the next evaluation run.


## Golden dataset format

The golden dataset is intentionally simple JSON so you can edit it by hand or via the UI.

A minimal entry looks like this:

```json title="data/golden.json" linenums="1"
[
  {
    "id": "eval_001",
    "question": "How does AGRO decide FINAL_K for retrieval?",
    "answer": "AGRO reads FINAL_K from the config registry, falling back to LANGGRAPH_FINAL_K or 10.",
    "tags": ["config", "retrieval"],
    "metadata": {
      "file": "server/services/rag.py",
      "section": "do_search"
    }
  }
]
```

Typical fields:

| Field       | Description                                                                 |
| :---------- | :-------------------------------------------------------------------------- |
| `id`        | Stable identifier for the question (used for diffing runs)                 |
| `question`  | Natural language query to send into the RAG pipeline                       |
| `answer`    | Expected answer or reference explanation                                   |
| `tags`      | Free‑form labels (e.g. `"bm25"`, `"langgraph"`, `"config"`)              |
| `metadata`  | Optional extra info (e.g. target file, function, or scenario description)  |

AGRO doesn’t force a particular schema beyond what the evaluation runner expects. If you want to add extra fields for your own tooling, you can – they’ll be preserved in the run outputs.


## How configuration is captured per run

One of the more important design choices: every evaluation run captures the *effective* configuration that was used.

Internally, everything goes through the configuration registry:

- `.env` is loaded first via `python-dotenv`
- `agro_config.json` is parsed into `AgroConfigRoot` (Pydantic)
- Defaults live in the Pydantic model
- The registry exposes type‑safe getters (`get_int`, `get_float`, `get_bool`, `get_str`)

When an evaluation run starts, AGRO snapshots the relevant parts of this registry and writes them into the eval JSON. That way you can later answer questions like:

- “What was `FINAL_K` when this baseline was recorded?”
- “Were we using the learning reranker or pure dense search?”
- “Which provider/model pair was active for answers?”

This is why you’ll see a lot of `data/backups/evals_/*.json` – they’re just frozen views of “config + metrics + outputs” at a point in time.


## Running evaluations

You can run evaluations from three places:

- CLI (`cli/commands/eval.py`)
- Web UI (Evaluation tab)
- HTTP API (for automation)

The CLI is usually the most direct when you’re iterating on retrieval.

```bash
# Run evaluation against the default repo (REPO or agro)
python -m cli.agro eval run

# Run against a specific repo/profile
python -m cli.agro eval run --repo my-project

# Use a specific dataset file
python -m cli.agro eval run --dataset data/golden.json
```

Each run will:

- Use the current index for the selected repo
- Use whatever models and retrieval settings are active in `agro_config.json` / `.env`
- Write a new `data/evals/eval_YYYYMMDD_HHMMSS.json`
- Update `data/tracking/evals_latest.json` to point at it


## What’s inside an eval run file

A typical eval run JSON has three main sections:

- `config` – snapshot of relevant AGRO configuration
- `questions` – per‑question results and metrics
- `summary` – aggregated metrics and counts

A heavily simplified sketch:

```json title="data/evals/eval_20251204_214750.json" linenums="1"
{
  "id": "eval_20251204_214750",
  "repo": "agro",
  "config": {
    "FINAL_K": 12,
    "BM25_WEIGHT": 0.7,
    "DENSE_WEIGHT": 0.3,
    "RERANKER_ENABLED": true,
    "MODEL_ANSWER": "gpt-4.1-mini",
    "MODEL_EMBEDDING": "text-embedding-3-large"
  },
  "questions": [
    {
      "id": "eval_001",
      "question": "How does AGRO decide FINAL_K for retrieval?",
      "expected_answer": "...",
      "actual_answer": "...",
      "retrieval": {
        "top_k": 12,
        "bm25_hits": 12,
        "dense_hits": 12,
        "reranked": true,
        "hit_files": ["server/services/rag.py", "server/services/config_registry.py"]
      },
      "metrics": {
        "exact_match": 1,
        "contains_key_phrase": 1,
        "retrieval_hit": 1
      },
      "trace_path": "out/agro/traces/trace_eval_001.json"
    }
  ],
  "summary": {
    "num_questions": 42,
    "exact_match_rate": 0.52,
    "retrieval_hit_rate": 0.93
  }
}
```

The exact metric set is still evolving – the important part is that each question keeps a pointer to its trace file (see below) and enough retrieval metadata to debug failures.


## Traces and drill‑down

Evaluation runs are tightly integrated with the tracing system under `out/<repo>/traces/`.

The HTTP layer exposes a small helper in `server/services/traces.py`:

- `list_traces(repo)` – list recent trace files for a repo
- `latest_trace(repo)` – fetch the most recent trace (via `server.tracing.latest_trace_path`)

During evaluation, each question is typically run with tracing enabled, and the resulting trace path is stored in the eval JSON. That gives you a direct path from “metric dropped” → “show me exactly what the pipeline did for this question.”

In the web UI, the Evaluation tab wires this up to the Trace Viewer component so you can:

- Click into a failing question
- Inspect the retrieval candidates, scores, and reranker decisions
- See the exact prompts and model responses used


## Comparing runs

Because each run is a single JSON file, comparing runs is just diffing JSON:

- `data/evals/latest.json` – often a symlink or copy of the most recent run
- `data/backups/evals_/*.json` – older baselines you can diff against

A typical workflow when tuning retrieval:

1. Run an eval with your current settings → `eval_baseline.json`
2. Tweak `agro_config.json` (e.g. adjust BM25 weights, enable learning reranker)
3. Re‑index if necessary (e.g. changed chunking or embeddings)
4. Run eval again → `eval_new.json`
5. Diff the two files:

```bash
jq '.summary' data/evals/eval_baseline.json
jq '.summary' data/evals/eval_new.json

# Or a full diff
diff -u data/evals/eval_baseline.json data/evals/eval_new.json | less
```

Because the per‑question `id` is stable, you can also script more detailed comparisons (e.g. “which questions flipped from correct → incorrect?”).


## UI: Evaluation tab

The web UI has a dedicated Evaluation section built from several components:

- `EvaluationRunner.tsx` – start/stop runs, pick datasets
- `HistoryViewer.tsx` – browse past runs from `data/evals/`
- `EvalDrillDown.tsx` – per‑question view with metrics and traces
- `FeedbackPanel.tsx` – record manual feedback on answers
- `QuestionManager.tsx` – edit / add golden questions
- `SystemPromptsSubtab.tsx` – inspect and tweak system prompts used during eval
- `TraceViewer.tsx` – render the trace JSON referenced by each question

All of these talk to the same FastAPI endpoints that the CLI uses. There’s no separate “UI‑only” evaluation path.


## Working with multiple repos

AGRO is repo‑aware across the whole stack. Evaluation follows the same pattern:

- The active repo is determined by `REPO` (env) or request payload
- Indexes live under `out/<repo>/...`
- Traces live under `out/<repo>/traces/`
- Eval runs are tagged with `"repo": "<name>"`

When you call the evaluation endpoints or CLI with `--repo my-project`, the server:

- Uses `get_config_registry()` to resolve `REPO` and other settings
- Reads/writes eval files under the same data directory but with the correct repo tag
- Uses the correct Qdrant collection for retrieval

This matters if you’re running AGRO against multiple codebases from a single instance.


## Rough edges & things to know

A few honest caveats about the current evaluation implementation:

- Metrics are intentionally simple – they’re good for regression, not leaderboard‑style benchmarking
- The golden dataset format is stable but not “versioned” – if you change the shape, keep your own migration scripts
- Some older eval files under `data/backups/evals_` predate newer metrics; don’t expect them all to have identical schemas
- If you change low‑level config (e.g. chunking) without re‑indexing, evaluation will happily run against a stale index – it won’t try to be clever about that


## Extending the evaluation pipeline

Because everything is just Python + JSON, extending the evaluation loop is straightforward:

- Add new metrics to the eval runner and write them into the per‑question `metrics` block
- Store extra per‑question metadata (e.g. which MCP tools were used, which reranker checkpoint was active)
- Add new UI panels that read from the same eval JSON files

If you’re not sure where to hook in, open the AGRO chat tab and ask it about the evaluation code – the engine is indexed on itself, and it will point you at the relevant modules and functions.
