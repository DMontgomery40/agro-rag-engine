# Claude Code Guardrails

> Before using Claude Code, re-read [`AGENTS.md`](../AGENTS.md). For full CLI docs see [Claude Code settings reference](https://docs.anthropic.com/en/docs/claude-code/settings).

- Repo-level `.claude/settings.json` should enforce:
  ```json
  {
    "permissions": {
      "allow": ["Bash(pnpm test:playwright*)", "Read(./**)"] ,
      "ask": ["Write(./**)", "Bash(git push:*)"],
      "deny": ["Read(./.env)", "Read(./secrets/**)", "WebFetch(*)"]
    },
    "sandbox": { "enabled": true, "autoAllowBashIfSandboxed": true },
    "hooks": { "PreToolUse": { "Bash": "bin/claude-preflight.sh" } }
  }
  ```
- Encourage `.claude/settings.local.json` for personal tweaks only.
- User-level settings restrict global filesystem access.
- Populate `CLAUDE.md` with reranker reset reminders.
- Use slash commands/hooks for reranker smoke tests.
