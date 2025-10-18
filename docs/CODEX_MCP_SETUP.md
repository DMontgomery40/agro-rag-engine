AGRO × Codex CLI / MCP — Quick Setup

Goal: make it one-shot to point Codex/Opus at this repo’s RAG tools. Use either stdio (recommended) or HTTP.

Stdio (recommended)

1) Activate your venv and run the server normally (GUI/API):
   - `python -m uvicorn server.app:app --host 127.0.0.1 --port 8012`
2) Register the MCP server with Codex CLI:
   - `codex mcp add rag-service -- python /absolute/path/to/agro/mcp_server.py`
   - Verify: `codex mcp list`
3) Smoke test tools directly (optional):
   - `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python mcp_server.py`

HTTP (optional)

1) Start the HTTP MCP shim:
   - `python mcp_server_http.py` (defaults: host 127.0.0.1, port 8013, path /mcp)
2) In GUI → Tools → “MCP & Channels”, set:
   - `MCP_HTTP_HOST` = 127.0.0.1
   - `MCP_HTTP_PORT` = 8013
   - `MCP_HTTP_PATH` = /mcp

Sample .mcp.json (ChatGPT/Opus)

Place this file at `examples/mcp/rag-service.mcp.json` or copy to your client’s MCP config directory and adjust the absolute path:

{
  "mcpServers": {
    "rag-service": {
      "command": "python",
      "args": ["/absolute/path/to/agro/mcp_server.py"]
    }
  }
}

Notes

- The GUI already exposes model overrides per channel (HTTP, MCP stdio, CLI) under Tools → “MCP & Channels”.
- Retrieval is strictly repo‑scoped. Use the GUI “Repos & Indexing” to set `REPO`, `OUT_DIR_BASE`, and `COLLECTION_NAME` consistently before starting Codex/Opus.
- If the MCP server returns `{count: 0}`, re‑apply the GUI config (writes `.env` and `repos.json`) and reindex from the GUI Indexing tab.

