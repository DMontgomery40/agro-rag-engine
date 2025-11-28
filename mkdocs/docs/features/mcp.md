# MCP Integration

Connect AGRO to Claude Code or Codex.

## Overview

AGRO provides MCP (Model Context Protocol) servers for integration with AI coding assistants.

## Supported Transports

- **STDIO** - For local Claude Code, Codex CLI
- **HTTP** - For remote agents, web platforms
- **SSE** - Streaming responses
- **WebSocket** - Real-time bidirectional

## Claude Code Setup

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agro": {
      "command": "/path/to/agro/.venv/bin/python",
      "args": ["/path/to/agro/server/mcp/server.py"],
      "env": {
        "QDRANT_URL": "http://127.0.0.1:6333",
        "REDIS_URL": "redis://127.0.0.1:6379/0"
      }
    }
  }
}
```

Restart Claude Code. Then use:

> "Use rag_search to find authentication code in my-project"
