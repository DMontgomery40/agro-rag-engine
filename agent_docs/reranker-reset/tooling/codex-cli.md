# Codex CLI Guardrails

> Follow [`AGENTS.md`](../AGENTS.md) first. The profile below enforces those policies for Codex. Full CLI reference: [Codex CLI configuration](https://github.com/openai/codex/blob/main/docs/config.md).

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
- For scripted runs: `codex exec --profile reranker-reset --config ask_for_approval='"never"' --config shell_environment_policy.inherit=\"none\"` etc.
- Keep `shell_environment_policy` strict (include-only).
- Register necessary MCP servers under `[mcp_servers]` if used (see [MCP integration docs](https://github.com/openai/codex/blob/main/docs/config.md#mcp_integration)).
- Use `codex resume` + docs to avoid context loss.
