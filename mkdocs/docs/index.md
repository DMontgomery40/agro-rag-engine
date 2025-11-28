# AGRO

A local-first RAG engine for codebases.

!!! note "Documentation Status"
    This documentation is auto-generated and maintained by the Docs Autopilot system.
    Content is updated automatically when code changes are detected.

## Quick Links

- [Quick Start](getting-started/quickstart.md) - Get running in 5 minutes
- [Installation](getting-started/installation.md) - Full setup guide
- [MCP Integration](features/mcp.md) - Connect to Claude Code or Codex

## What is AGRO?

AGRO is a local-first RAG (Retrieval-Augmented Generation) engine designed for codebases. It provides:

- **Hybrid Search** - BM25 + dense vectors + cross-encoder reranking
- **Self-Learning Reranker** - Gets better as you use it
- **Multiple Interfaces** - GUI, CLI, API, MCP
- **Token Efficiency** - 91% reduction vs full-file reads

## Getting Started

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
make dev
```

Then open http://127.0.0.1:8012/ and follow the onboarding wizard.
