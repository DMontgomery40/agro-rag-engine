# CLI Chat Interface

The CLI chat is the fastest way to talk to your indexed codebase from a terminal. It supports multiple repos, per‑thread history, model switching, and feedback, with an HTTP API fallback to a local LangGraph graph.

---

## Starting the CLI chat

=== "From shell (`agro` installed)"

```bash
# Default repo and config from config registry
$ agro chat

# Explicit repo
$ agro chat --repo my-project

# Override the generation model
$ agro chat --repo my-project --model gpt-4o

# Let AGRO pick repo from config profile
$ agro config apply-profile my-profile
$ agro chat
```

=== "Direct Python entry point"

```bash
# Make sure server is running on the expected port first
export REPO=agro          # default repo name
export THREAD_ID=my-run   # optional, defaults to 'cli-chat'
export PORT=8012          # must match AGRO server port

python -m cli.chat_cli
```

!!! note "Environment and config sources"
    - `agro chat` reads defaults from the **config registry** (e.g. `REPO`, `THREAD_ID`) rather than env vars directly.
    - `cli.chat_cli` also loads a project‑level `.env` (if `python-dotenv` is installed) and then uses the config registry.
    - If you’re not sure what repo you’re talking to, just look at the prompt header or run `/help` from inside the chat.

---

## Basic workflow

Once started, you’ll see something like:

```text
# 🤖 RAG CLI Chat

Connected to: agro
Thread ID: cli-chat
API: http://127.0.0.1:8012

Type your question or use `/help` for commands.
```

Then the main loop:

1. Type a question or a command.
2. AGRO sends it to the HTTP API at `/api/chat` (if reachable).
3. If the API is down, it lazily initializes a **local LangGraph** and runs the query there.
4. The answer appears inside a Rich panel, with:
   - The **answer** (Markdown formatted).
   - A **confidence score**.
   - Top **source snippets** (file path, line range, rerank score).
5. If the API handled the query, you’ll be prompted to rate the answer (1–5).

---

## Commands and shortcuts

Commands start with `/` and are handled before anything is sent to the server.

### Command reference

| Command                      | Description                                                                                          |
|------------------------------|------------------------------------------------------------------------------------------------------|
| `/repo <name>`              | Switch to another indexed repository (must exist in `repos.json`).                                  |
| `/model <name>`             | Override the generation model (e.g. `gpt-4o`, `claude-3-5-sonnet`).                                  |
| `/save`                     | Save conversation checkpoint (currently just logs success; LangGraph uses Redis checkpoints).       |
| `/clear`                    | Clear conversation history by creating a new thread ID.                                              |
| `/help`                     | Show in‑CLI help (Markdown) with commands and interaction notes.                                    |
| `/exit`, `/quit`           | Cleanly exit the chat loop.                                                                          |

??? example "Command examples"
    ```text
    agro > /repo my-service
    ✓ Switched to repo: my-service

    my-service > /model gpt-4o
    ✓ Switched model to: gpt-4o

    my-service > /clear
    ✓ Cleared history (new thread: cli-chat-1733052481)

    my-service > /exit
    Goodbye!
    ```

!!! warning "Valid repositories only"
    `/repo` validates against `list_repos()` (which reads your `repos.json`).  
    If you get:

    ```text
    ✗ Invalid repo. Allowed: ['agro', 'my-service', ...]
    ```

    then the repo you typed isn’t configured for indexing yet.

---

## Conversation memory & threads

AGRO treats each CLI session as a **thread** identified by `thread_id`.

### How thread IDs work

- Default thread ID (via config registry): `cli-chat`
- When you run `agro chat`, AGRO passes that thread ID down to the chat API.
- The server uses this to:
  - Attach messages to the right **LangGraph conversation**.
  - Store state in **Redis checkpoints** (if configured).

When the HTTP API is unavailable, `ChatCLI` falls back to a **local LangGraph instance**:

```python
state = {
    "question": question,
    "documents": [],
    "generation": "",
    "iteration": 0,
    "confidence": 0.0,
    "repo": self.repo
}
result = self.graph.invoke(state, self._get_config())
```

The same `thread_id` is passed in `configurable.thread_id`, so memory still behaves per‑thread even in fallback mode.

!!! note "Local graph vs API server"
    - **API mode** (normal):
        - `/api/chat` handles retrieval + generation.
        - Returns `event_id` for feedback.
        - Uses the main AGRO server config and any remote models you’ve defined.
    - **Local graph fallback**:
        - Initialized lazily via `build_graph()`.
        - Uses Redis checkpoints for memory (if configured).
        - No `event_id` (so no feedback submission).
        - Currently ignores the `/model` override.

### Clearing history

`/clear` doesn’t wipe Redis; it **creates a new thread**:

```python
self.thread_id = f"cli-chat-{int(time.time())}"
```

So old context is still there and can be resumed if you reuse the same `THREAD_ID` value in a future session, but your current CLI chat will start fresh.

!!! tip "Practical thread patterns"
    - **One thread per task**: e.g. `THREAD_ID=bug-1234` when debugging a specific issue.
    - **Daily threads**: `THREAD_ID=cli-2025-03-01` so history is naturally bounded.
    - **Ephemeral scratch**: just use `/clear` whenever the context feels polluted.

---

## Model selection

You can override the generation model at runtime without restarting:

```text
agro > /model gpt-4o
✓ Switched model to: gpt-4o

agro > /model claude-3-5-sonnet
✓ Switched model to: claude-3-5-sonnet
```

Under the hood:

- The model name is stored in `self.model`.
- For **API calls**, it’s sent as `payload['model'] = self.model`.
- The server decides how to route that to your configured providers (OpenAI, Anthropic, local, etc.).
- For the **local graph fallback**, the model override is currently **not applied**:

```python
# Note: Local graph doesn't support 'model' override easily unless passed in state/config hacks
# We'll ignore self.model for local fallback for now
```

!!! warning "Model override only applies in API mode"
    If you see:

    ```text
    API unreachable (...). Falling back to local graph...
    ```

    then `/model` changes will not affect that query. The local graph will use whatever default model is configured in the graph itself.

---

## Feedback and answer quality

When the API is reachable, each answer comes with an `event_id` and you’ll see:

```text
Rate (1-5) or Enter to skip:
```

If you type `1`–`5`:

- AGRO sends a POST to `/api/feedback`:

  ```python
  payload = {"event_id": event_id, "signal": f"star{rating}"}
  ```

- Optional text notes can be attached (the CLI code supports a `note`, though the interactive prompt only asks for a rating).

If the answer came from the **local graph fallback**, there is **no `event_id`**, and you’ll see:

```text
No event ID available for feedback (local run?)
```

!!! tip "When to rate answers"
    Feedback is most useful when:
    - The answer is **clearly wrong** but seemed confident.
    - The answer is **great** and used the right sources.
    - You’re iterating on retrieval/reranking and want a quick way to mark good/bad responses.

---

## Reading answers and sources

Every answer is wrapped in a Rich panel with a confidence score:

```text
┌ Answer (confidence: 0.78) ┐
│ (Markdown answer here)    │
└───────────────────────────┘
```

Then AGRO prints top citations:

```text
Top sources:
  1. src/service/user.py:120-160 (score: 0.842)
  2. src/db/models.py:45-80     (score: 0.791)
  3. README.md:1-30             (score: 0.732)
```

Where:

- `file_path` is relative to the repo root.
- `start_line` / `end_line` define the snippet.
- `rerank_score` is the post‑reranker relevance score.

!!! tip "Jumping to sources in your editor"
    Combine this with your editor’s “open file at line” feature:

    - **vim / neovim**: `vim +120 src/service/user.py`
    - **VS Code**: `code -g src/service/user.py:120`
    - **Helix**: `hx src/service/user.py:120`

---

## Tips for effective use

### 1. Start simple, then refine

- Begin with a **plain English question**:
  ```text
  agro > How does the user authentication flow work?
  ```
- If the answer is vague:
  - Narrow the scope:
    ```text
    agro > Focus on the FastAPI auth endpoints only.
    ```
  - Ask for file references explicitly:
    ```text
    agro > List the key files involved and their responsibilities.
    ```

### 2. Use the repo switch for multi‑project work

If you have multiple codebases indexed:

```text
agro > /repo payments-service
payments-service > How do we handle idempotency for charge requests?

payments-service > /repo web-frontend
web-frontend > Where is the checkout form validation implemented?
```

This keeps each conversation tied to the right context and retrieval index.

### 3. Reset context when it gets “muddy”

If the model starts over‑anchoring on previous questions:

```text
agro > /clear
✓ Cleared history (new thread: cli-chat-1733052481)

agro > Explain how the background job scheduler works, ignoring previous topics.
```

### 4. Be explicit about what you want

The more specific your intent, the better the answer:

- “Show me the **exact function** that sends password reset emails.”
- “Compare the **current implementation** of X with the **previous one** (before commit abc123).”
- “Summarize this module in **3 bullet points** suitable for a README.”

### 5. Use models that fit your task

- For **careful refactors or API design questions**, pick your strongest model:
  ```text
  agro > /model claude-3-5-sonnet
  ```
- For **quick navigational questions** (where retrieval matters more than generation), a cheaper/faster model is usually fine.

### 6. Know when you’re in fallback mode

If you see:

```text
API unreachable (...). Falling back to local graph...
✓ Graph initialized locally (Redis checkpoints)
```

Then:

- Model overrides won’t apply.
- Feedback won’t be recorded.
- You’re still talking to the same repo, but through the local LangGraph.

If you **expected** to be using the HTTP API, check:

- Is the AGRO server running?
- Does `PORT` in your `.env` / config match the CLI’s `PORT`?

---

## Rich help via `agro help`

For a quick reminder of CLI chat usage:

```bash
$ agro help chat
```

This shows:

- A description of the chat command.
- Usage syntax.
- Copy‑pasteable examples.

The `agro help` system is meant to be the “docs you have in your terminal,” so you don’t have to leave your shell to remember an option or see a minimal example.