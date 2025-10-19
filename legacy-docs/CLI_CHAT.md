# CLI Chat Interface

Interactive terminal chat for the RAG service with conversation memory.

## Run It

After Quick Start (`cd agro/scripts && ./dev_up`), activate the venv and start chat:

```bash
cd ../  # repo root if you are still in scripts/
. .venv/bin/activate
export REPO=agro
export THREAD_ID=my-session
python -m cli.chat_cli
```

## Usage

### Basic Usage

```bash
export REPO=agro
export THREAD_ID=my-session
python -m cli.chat_cli
```

### Commands

| Command | Description |
|---------|-------------|
| `/repo <name>` | Switch repository (e.g., agro) |
| `/clear` | Clear conversation history (starts new thread) |
| `/save` | Save checkpoint (automatic with Redis) |
| `/help` | Show available commands |
| `/exit`, `/quit` | Exit chat |

### Examples

**Ask a question:**
```
repo-a > Where is OAuth token validated?
```

**Switch repos mid-conversation:**
```
repo-a > /repo repo-b
✓ Switched to repo: repo-b
repo-b > How do we handle inbound faxes?
```

**Get help:**
```
repo-a > /help
```

## Features

### Conversation Memory
- **Redis-backed**: Uses LangGraph checkpoints stored in Redis
- **Thread-based**: Each THREAD_ID gets its own conversation history
- **Persistent**: Conversations survive restarts

### Rich Terminal UI
- **Markdown rendering**: Answers displayed with proper formatting
- **Color coding**: Green for high confidence, yellow for medium
- **Citation display**: Shows top 3 sources with scores

### Repo Switching
Switch between repo-a and repo-b without losing conversation context.

## Configuration

### Environment Variables

```bash
# Required
export REPO=repo-a           # or repo-b
export THREAD_ID=my-session    # unique ID for this conversation

# Optional (set in .env)
OPENAI_API_KEY=...
REDIS_URL=redis://127.0.0.1:6379/0
```

### Multiple Conversations

Use different THREAD_ID values for separate conversations:

```bash
# Work conversation
export THREAD_ID=work-1
python -m cli.chat_cli

# Testing conversation
export THREAD_ID=test-1
python -m cli.chat_cli
```

## Troubleshooting

### "Failed to initialize graph"

Check Redis is running:
```bash
docker exec rag-redis redis-cli ping
# Should return: PONG
```

### "Missing 'rich' library"

```bash
pip install rich
```

### Conversation not persisting

Check Redis connection in `.env`:
```bash
REDIS_URL=redis://127.0.0.1:6379/0
```

Verify Redis is accessible:
```bash
docker exec rag-redis redis-cli ping
```

### Clear stuck conversation

Start a new thread:
```bash
export THREAD_ID=new-session-$(date +%s)
python -m cli.chat_cli
```

Or use `/clear` command in the chat.

## Integration with Other Tools

### Use with Eval Loop

Run evals while chatting to see quality metrics:

```bash
# Terminal 1: Chat
python -m cli.chat_cli

# Terminal 2: Eval watch mode
python -m eval.eval_loop --watch
```

### Use with MCP Server

The chat CLI and MCP server can run simultaneously - they use the same LangGraph backend.

```bash
# Terminal 1: Chat CLI
python -m cli.chat_cli

# Terminal 2: Use MCP via Codex
codex
# Then: "Use rag.search to find OAuth code"
```

## Tips

1. **Use specific questions**: "Where is OAuth validated?" works better than "Tell me about auth"
2. **Check citations**: Low confidence? Look at the sources shown
3. **Switch repos freely**: Use `/repo` to compare implementations
4. **Save your THREAD_ID**: Come back to conversations later with the same ID

---

**See also:**
- [README.md](../README.md) - Main setup guide
- [docs/QUICKSTART_MCP.md](QUICKSTART_MCP.md) - MCP agent setup
- [docs/MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) - Model options
