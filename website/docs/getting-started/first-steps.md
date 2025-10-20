---
sidebar_position: 3
---

# First Steps

Your first queries with AGRO.

## Try the CLI Chat

```bash
source .venv/bin/activate
export REPO=agro
python -m cli.chat_cli
```

## Make Your First Query

```
You: Where is the FastAPI server defined?

AGRO: The FastAPI server is defined in server/app.py...

📎 Citations:
  server/app.py:1-50 (score: 0.92)
  server/langgraph_app.py:15-30 (score: 0.78)
```

## Next Steps

See [MCP Integration](../features/mcp) to connect AI agents.
