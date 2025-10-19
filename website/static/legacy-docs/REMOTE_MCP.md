# Remote MCP over HTTPS

This guide shows how to expose the MCP server over HTTPS for remote agents and OpenAI evals.

**Note:** HTTP mode (`mcp_server_http.py`) exposes **2 tools** only: `answer`, `search` (RAG-only). The stdio mode (`mcp_server.py`) exposes 4 tools including `netlify_deploy` and `web_get`. See [MCP_README.md](MCP_README.md#tool-parity-stdio-vs-http) for full comparison.

Server options
- HTTP MCP (FastMCP): `mcp_server_http.py` exposes `/mcp` via FastMCP (HTTP transport)
  - Tools: `answer(repo, question)`, `search(repo, question, top_k=10)` - RAG retrieval and generation only
  - Env: `MCP_HTTP_HOST` (default `0.0.0.0`), `MCP_HTTP_PORT` (default `8013`), `MCP_HTTP_PATH` (default `/mcp`)
  - Start: `. .venv/bin/activate && python mcp_server_http.py`
- TLS: terminate with a reverse proxy (Caddy/Nginx) in front of `http://127.0.0.1:8013/mcp`

Quick start (local http)
```bash
. .venv/bin/activate
# Install fastmcp if not already installed
pip install fastmcp
export MCP_HTTP_HOST=0.0.0.0 MCP_HTTP_PORT=8013 MCP_HTTP_PATH=/mcp
python mcp_server_http.py
# Test (replace host if remote):
curl -s "http://127.0.0.1:8013/mcp/tools/list" | head -n1
```

Caddy (HTTPS)
```caddyfile
your.domain.com {
  encode gzip
  reverse_proxy /mcp 127.0.0.1:8013
}
```

Nginx (HTTPS)
```nginx
server {
  listen 443 ssl;
  server_name your.domain.com;
  ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

  location /mcp {
    proxy_pass http://127.0.0.1:8013;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

OpenAI evals integration (HTTP MCP)
- Point the eval harness to `https://your.domain.com/mcp`
- Ensure network egress from eval runner to your domain
- HTTP mode exposes 2 tools: `answer`, `search` (no `netlify_deploy` or `web_get` - use stdio mode for those)

Operational tips
- Keep Redis/Qdrant running (`bash scripts/up.sh`) to ensure LangGraph checkpoints and hybrid search work.
- Use `bash scripts/status.sh` to verify MCP and containers.
- Secure your proxy with IP allowlists or auth if exposing publicly.

