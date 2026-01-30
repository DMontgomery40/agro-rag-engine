---
Title: CLI Chat Interface
---

# CLI Chat Interface

The CLI chat is the fastest way to talk to your indexed codebase from a terminal. It’s a thin wrapper over the same HTTP API the web UI uses, wired into the same configuration registry and profiles.

You can:

- Chat with any indexed repo
- Switch models and profiles
- Inspect traces and evaluation runs
- Drive indexing and maintenance tasks from scripts

All without opening a browser.


## Entry points

The main entry point is:

```bash
python -m cli.chat_cli
```

or, if you installed AGRO as a package and exposed the console script:

```bash
agro chat
```

Under the hood this is just `cli/chat_cli.py` plus the `cli/commands/chat.py` command wiring.


## How it talks to the server

The CLI is not a separate RAG engine. It is a client for the running AGRO HTTP server:

- It reads connection details (host, port, TLS, auth) from the **configuration registry** (`server/services/config_registry.py`).
- It uses the same `.env` / `agro_config.json` precedence as everything else.
- It sends JSON over HTTP to the `/chat` and `/search` endpoints defined in the FastAPI app.

!!! note "Server must be running"
    The CLI does not start the backend for you. Make sure the AGRO server is up (via Docker or `python -m server.app`) before using `agro chat`.


## Basic usage

The simplest way to start a chat against the default repo:

```bash
agro chat
```

You’ll drop into an interactive REPL:

```text
Repo: agro  |  Model: anthropic/claude-3.5-sonnet  |  Profile: default
Type "/help" for commands, Ctrl+C to exit.

> how does indexing work?
...
```

Key points:

- **Default repo** comes from `REPO` in `.env` or `agro_config.json`.
- **Default model** comes from the model configuration (see `configuration/models.md`).
- **Default profile** is resolved via the profile system (`configuration/profiles.md`).


## Command-line flags

The CLI exposes a few core flags for scripting and quick overrides.

```bash
agro chat \
  --repo my-service \
  --model openai/gpt-4o-mini \
  --profile prod \
  --system-prompt "You are a strict code reviewer."
```

Typical flags:

| Flag              | Description                                                                 |
| :---------------- | :-------------------------------------------------------------------------- |
| `--repo NAME`     | Override the target repository (maps to `REPO` and profile repo settings). |
| `--model ID`      | Override the chat model for this session only.                              |
| `--profile NAME`  | Load a specific profile from `web/public/profiles`.                         |
| `--system-prompt` | Inline override of the system prompt for this session.                      |
| `--once`          | Run a single question and exit (good for scripts/CI).                       |

The exact set of flags is defined in `cli/commands/chat.py`; this documentation stays high‑level on purpose.


## In-REPL commands

Inside the chat REPL, lines starting with `/` are treated as **commands**, not questions. These are parsed locally and never sent to the model.

Common commands:

| Command                  | Effect                                                                 |
| :----------------------- | :--------------------------------------------------------------------- |
| `/help`                  | Show available commands and a short description.                       |
| `/model`                 | Show the current model and available configured models.                |
| `/model <id>`            | Switch to a different configured model for subsequent turns.           |
| `/repo`                  | Show the current repo.                                                 |
| `/repo <name>`           | Switch to a different indexed repo (if the server has it indexed).     |
| `/profile`               | Show the active profile.                                               |
| `/profile <name>`        | Switch to another profile on disk.                                     |
| `/trace`                 | Show the path or summary of the latest trace for the last answer.      |
| `/eval`                  | Attach the last answer to an evaluation run (see `features/evaluation`). |
| `/config`                | Print the resolved configuration for this session (read-only view).    |
| `/quit` or `/exit`       | Exit the REPL.                                                         |

The implementation for these lives in `cli/chat_cli.py` and reuses the same HTTP endpoints as the web UI for traces and evaluation.


## Single-shot mode (for scripts & CI)

For automation you usually don’t want an interactive REPL. Use `--once` (or the equivalent flag in your version) to send a single question and print the answer to stdout:

```bash
agro chat --repo my-service --model openai/gpt-4o-mini --once "summarize the error handling in payments.py"
```

This is intentionally simple:

- No REPL, no prompts, just a single request/response.
- Exit code is non-zero if the HTTP request fails or the server returns an error.
- Output is plain text by default so you can pipe it into other tools.


## How configuration flows into the CLI

The CLI does **not** invent its own config format. It reads from the same registry as the server:

1. `.env` is loaded first (`dotenv.load_dotenv(override=True)` in `config_registry.py`).
2. `agro_config.json` is parsed into `AgroConfigRoot` (Pydantic model).
3. Pydantic defaults fill in anything missing.

The CLI then:

- Uses `get_config_registry()` from `server/services/config_registry.py` to resolve values.
- Respects the same precedence rules (env > agro_config.json > defaults).
- Uses the same key names (`REPO`, `DEFAULT_CHAT_MODEL`, etc.).

This means:

- If the web UI is using a model, the CLI will see the same default.
- If you change `REPO` in `.env`, both server and CLI will default to that repo.


## Profiles and the CLI

Profiles are just JSON files under `GUI_DIR/profiles` (see `configuration/profiles.md`). The CLI can:

- **List** profiles (via `/profile` or a dedicated flag).
- **Activate** a profile for the current session.

When you pick a profile, the CLI:

- Loads the profile JSON.
- Applies its overrides on top of the base registry (without mutating files).
- Uses that merged view for all subsequent HTTP calls.

This is useful when you want:

- A “local-dev” profile with a small local model and aggressive caching.
- A “prod” profile that points at cloud models and stricter safety settings.


## Traces from the CLI

The CLI can surface the same traces you see in the web UI:

- After a query, the server may write a trace JSON file under `out/<repo>/traces`.
- `server/services/traces.py` exposes `/traces/latest` and `/traces/list` endpoints.
- The CLI can call those endpoints and print:
  - The path to the latest trace file.
  - A short summary (model, latency, number of chunks, etc.).

Example:

```bash
> why is indexing slow on this repo?
...
> /trace
latest trace: out/agro/traces/trace_2025-12-10T09-31-41Z.json
```

You can then open that JSON in your editor or feed it back into AGRO’s own chat (AGRO is indexed on itself) to debug the pipeline.


## Evaluation hooks

The CLI is wired into the evaluation system (`features/evaluation.md`):

- You can mark a question/answer pair as a **golden** example from the REPL.
- You can attach feedback (good/bad/partial) to the last answer.
- Under the hood this writes to the same `data/evaluation_dataset.json` / `data/golden.json` files the evaluation runner uses.

This is intentionally low-friction: if you’re already in a terminal reading an answer, you shouldn’t have to switch to the browser just to say “this answer was wrong, please learn from it.”


## When to use the CLI vs the web UI

Use the CLI when:

- You live in a terminal and want quick answers without context switching.
- You’re scripting AGRO (CI checks, nightly reports, regression tests).
- You want to integrate AGRO with other CLI tools (grep, jq, fzf, etc.).

Use the web UI when:

- You want to inspect traces visually.
- You’re tuning retrieval parameters and want live charts.
- You’re editing profiles, system prompts, or model configs.

Both surfaces talk to the same backend and share the same configuration registry, so you can freely switch between them.


## Rough edges & notes

- The CLI assumes the server is reachable; it doesn’t try to start Docker or the Python app for you.
- Error messages are intentionally plain (HTTP status + short description). If something looks off, check the server logs and `operations/troubleshooting.md`.
- The set of `/` commands may evolve; run `/help` in your version to see the authoritative list.
