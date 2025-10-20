---
sidebar_position: 4
---

# Chat Interface

AGRO provides an interactive terminal chat interface for the RAG service with full conversation memory and persistence.

## Quick Start

After initial setup, activate the virtualenv and start chatting:

```bash
cd /path/to/agro-rag-engine
. .venv/bin/activate
export REPO=agro
export THREAD_ID=my-session
python -m cli.chat_cli
```

## Features

### Conversation Memory

- **Redis-backed**: Uses LangGraph checkpoints stored in Redis for persistence
- **Thread-based**: Each `THREAD_ID` gets its own conversation history
- **Persistent**: Conversations survive restarts - resume any time with the same thread ID

### Rich Terminal UI

- **Markdown rendering**: Answers displayed with proper formatting
- **Color coding**:
  - Green for high confidence answers (>0.7)
  - Yellow for medium confidence (0.4-0.7)
  - Red for low confidence (\<0.4lt;0.4)
- **Citation display**: Shows top 3 sources with rerank scores

### Multi-Repository Support

Switch between repositories without losing conversation context using the `/repo` command.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/repo <name>` | Switch repository | `/repo agro` |
| `/clear` | Clear conversation history (starts new thread) | `/clear` |
| `/save` | Save checkpoint (automatic with Redis) | `/save` |
| `/help` | Show available commands | `/help` |
| `/exit`, `/quit` | Exit chat | `/exit` |

## Usage Examples

### Basic Question

```
agro > Where is OAuth token validated?

[Searching agro repository...]

Answer (confidence: 0.82):
OAuth tokens are validated in the auth/middleware.py file...

Citations:
1. auth/middleware.py:45-67 (score: 0.85)
2. server/auth.py:120-145 (score: 0.78)
3. identity/oauth.py:89-110 (score: 0.72)
```

### Switch Repositories Mid-Conversation

```
agro > /repo another-repo
✓ Switched to repo: another-repo

another-repo > How do we handle authentication here?
```

### View Help

```
agro > /help

Available commands:
  /repo <name>  - Switch repository
  /clear        - Clear conversation history
  /save         - Save checkpoint
  /help         - Show this help
  /exit, /quit  - Exit chat
```

### Clear and Start Fresh

```
agro > /clear
✓ Conversation history cleared. Starting new thread.

agro > [Ask your first question in the new thread]
```

## Configuration

### Environment Variables

```bash
# Required
export REPO=agro              # Default repository
export THREAD_ID=my-session   # Unique conversation ID

# Optional (set in .env file)
OPENAI_API_KEY=sk-...
REDIS_URL=redis://127.0.0.1:6379/0
GEN_MODEL=gpt-4o-mini
```

### Multiple Conversations

Use different `THREAD_ID` values for separate conversations:

```bash
# Work conversation
export THREAD_ID=work-1
python -m cli.chat_cli

# Testing conversation (in another terminal)
export THREAD_ID=test-1
python -m cli.chat_cli
```

Each thread maintains its own independent conversation history.

### Model Selection

Set your preferred generation model:

```bash
# OpenAI models
export GEN_MODEL=gpt-4o-mini     # Default, good value
export GEN_MODEL=gpt-4o          # Higher quality

# Local Ollama models
export GEN_MODEL=qwen3-coder:30b
export OLLAMA_URL=http://127.0.0.1:11434/api
```

## Troubleshooting

### "Failed to initialize graph"

**Problem**: LangGraph backend couldn't initialize.

**Solution**: Check Redis is running:

```bash
docker exec rag-redis redis-cli ping
# Should return: PONG
```

If Redis is down, start infrastructure:

```bash
bash scripts/up.sh
```

### "Missing 'rich' library"

**Problem**: Required dependency not installed.

**Solution**: Install the rich library:

```bash
pip install rich
```

### Conversation Not Persisting

**Problem**: Messages are lost between sessions.

**Solution**:

1. Check Redis connection in `.env`:
   ```bash
   REDIS_URL=redis://127.0.0.1:6379/0
   ```

2. Verify Redis is accessible:
   ```bash
   docker exec rag-redis redis-cli ping
   ```

3. Ensure you're using the same `THREAD_ID`:
   ```bash
   echo $THREAD_ID
   # Should show your thread ID
   ```

### Clear Stuck Conversation

**Problem**: Conversation is in a bad state or corrupted.

**Solution**: Start a new thread with a fresh ID:

```bash
export THREAD_ID=new-session-$(date +%s)
python -m cli.chat_cli
```

Or use the `/clear` command within the chat.

### Low Quality Answers

**Problem**: Answers are generic or miss the mark.

**Solution**:

1. **Use specific questions**: "Where is OAuth validated?" works better than "Tell me about auth"
2. **Check citations**: Low confidence? Look at the sources shown
3. **Verify index is fresh**: Re-index if code has changed significantly:
   ```bash
   REPO=agro python index_repo.py
   ```
4. **Try different repo**: Use `/repo` to compare implementations

## Integration with Other Tools

### Use with Eval Loop

Run evals while chatting to see real-time quality metrics:

```bash
# Terminal 1: Chat interface
python -m cli.chat_cli

# Terminal 2: Eval watch mode
python -m eval.eval_loop --watch
```

Changes to retrieval quality will be reflected in eval results as you chat.

### Use with MCP Server

The chat CLI and MCP server share the same LangGraph backend and can run simultaneously:

```bash
# Terminal 1: Chat CLI
python -m cli.chat_cli

# Terminal 2: Use MCP via Codex
codex
# Then: "Use rag_search to find OAuth code"
```

Both interfaces work with the same index and Redis checkpoints.

## Tips for Best Results

1. **Use specific questions**: Be precise about what you're looking for
   - Good: "Where is OAuth token validation implemented?"
   - Bad: "How does authentication work?"

2. **Check citations**: Review the source files shown for context
   - High scores (>0.8) indicate strong relevance
   - Multiple low scores (\<0.5lt;0.5) might mean the index needs updating

3. **Switch repos freely**: Use `/repo` to compare implementations across codebases

4. **Save your THREAD_ID**: Export it in your shell profile to resume conversations:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export THREAD_ID=my-default-session
   ```

5. **Monitor confidence scores**:
   - Green (>0.7): High confidence, trust the answer
   - Yellow (0.4-0.7): Medium confidence, verify citations
   - Red (\<0.4lt;0.4): Low confidence, question may be too broad or index incomplete

## Advanced Usage

### Custom Generation Model

Override the generation model per session:

```bash
export GEN_MODEL=gpt-4o
export OPENAI_API_KEY=sk-...
python -m cli.chat_cli
```

### Verbose Debugging

Enable debug output to see retrieval details:

```bash
export LOG_LEVEL=DEBUG
python -m cli.chat_cli
```

### Session Recovery

To list all active thread IDs in Redis:

```bash
docker exec rag-redis redis-cli KEYS "checkpoint:*" | sed 's/checkpoint://'
```

Resume any thread by setting its `THREAD_ID`:

```bash
export THREAD_ID=<thread-id-from-above>
python -m cli.chat_cli
```

## See Also

- [MCP Integration](mcp.md) - Use AGRO with AI agents
- [API Reference](../api/reference.md) - HTTP API endpoints
- [Model Configuration](../configuration/models.md) - Model selection guide
