## Contributing

> Heads-up: working on a RAG that indexes code can get meta fast.

When you test this system against your own folders, it adapts to your environment (repos.json, indexes, local model choices). If you then ship from that same working copy, you might accidentally ship "your" tailored RAG instead of a blank-slate tool.

Guidelines
- Keep your "dev/test" setup separate from the version you ship.
  - Use a clean clone or a devcontainer for testing changes.
  - Keep local `repos.json`, `out/*` indexes, and `.venv` out of the copy you publish.
- Prefer reproducible environments.
  - Devcontainers or pinned Docker images can save you from CI/CD headaches.
  - Be careful with version bumps; run the eval harness (`python eval_loop.py`) after changes.
- Avoid committing machine-specific paths or credentials.
  - The docs intentionally avoid author-specific paths. Follow that pattern.

A note on humor (and reality)
- Yes, this can be a CI/CD nightmare if you aren’t strict about separating “the RAG you test” from “the RAG you ship.” Use containers, respect `.gitignore`, and version thoughtfully.

Thanks for helping keep this tool modular and portable.
