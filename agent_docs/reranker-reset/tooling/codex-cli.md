# Codex CLI Guardrails

- Profile: add to `~/.codex/config.toml`:
  ```toml
  [profiles.reranker-reset]
  model = "gpt-5-codex"
  sandbox = "workspace-write"
  ask_for_approval = "on-failure"
  cd = "/Users/davidmontgomery/agro-rag-engine"
  tools = { web_search = false }
  ```
- Launch via `codex --profile reranker-reset`.
- For scripted runs: `codex exec --profile reranker-reset --config ask_for_approval='"never"'` etc.
- Keep `shell_environment_policy` strict (include-only).
- Register necessary MCP servers under `[mcp_servers]` if used.
- Use `codex resume` + docs to avoid context loss.
