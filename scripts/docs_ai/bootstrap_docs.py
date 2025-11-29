#!/usr/bin/env python3
"""
Bootstrap AGRO documentation by reading source files and generating docs via LLM.

This script:
1. Reads relevant source files for each doc topic
2. Sends them to AGRO's /answer endpoint (uses configured gen_model)
3. Generates complete documentation with MkDocs Material formatting

Usage:
    python scripts/docs_ai/bootstrap_docs.py
    python scripts/docs_ai/bootstrap_docs.py --page features/rag  # Single page only
    python scripts/docs_ai/bootstrap_docs.py --dry-run  # Preview without writing
"""

import argparse
import glob
import sys
import time
from pathlib import Path
from typing import List, Dict, Optional

import requests

ROOT = Path(__file__).parent.parent.parent
DOCS_DIR = ROOT / "mkdocs" / "docs"
API_URL = "http://127.0.0.1:8012"

# The system prompt for doc generation
SYSTEM_PROMPT = """You are writing documentation for AGRO (Another Good RAG Option), a local-first RAG engine for codebases.

AGRO is a recursive acronym - an attempt to gain mass credibility with greybeard devs who remember what YAML and GNU and PHP stand for. Did it work? Probably not, but here we are.

WRITING STYLE:
Primary mode (90% of the time): Thorough, technical, precise. Clear explanations of how things work and why. Good code examples. Accurate details. Use first person ("I built this because...", "I wanted...").

When appropriate: Direct, unpretentious. No marketing speak or hype. When something is genuinely novel or unique compared to typical RAG implementations, explain WHY it's useful - don't just say "amazing feature." If there's an obvious rough edge or work-in-progress, acknowledge it briefly and move on. This is a solo dev project - be honest about that when relevant.

KEY THINGS TO CONVEY (naturally, not as a checklist):

1. AGRO explains itself to you. Every parameter has detailed tooltips with links to official docs and arxiv papers. It's all searchable too. Users shouldn't have to run to an LLM or Google to understand what a complex parameter does - the RAG system should do that for them.

2. AGRO is indexed on itself. Questions about how to modify or extend AGRO? Go to the chat tab and ask. It's MIT licensed, change whatever you want.

3. MCP servers - explain the actual benefit for tools like Claude Code and Codex. DO NOT claim specific token savings with hard numbers - users aren't stupid, they'll see the benefits once they understand what it does.

4. Be honest about complexity: There are tons of features and knobs and levers, but you don't HAVE to use them all. Small codebases often perform better with just BM25. The fancy semantic stuff (beyond what Qdrant does out of the box) is there when you need it.

DON'T:
- Overdo the casual/funny stuff - this is documentation, not a comedy routine
- Use marketing language ("revolutionary", "game-changing", "seamlessly")
- Pretend rough edges don't exist
- Claim specific performance numbers or token savings - let users discover that

TECHNICAL ACCURACY:
- Models are NOT a finite list of choices. Users can add ANY local or cloud model they want. All config flows through Pydantic and populates everywhere automatically.
- Read every source file THOROUGHLY before writing. This is a complete rewrite, not a patch.
- When you see something genuinely cool in the code, explain WHY it's cool

MKDOCS MATERIAL FORMATTING (MANDATORY):
Reference: https://squidfunk.github.io/mkdocs-material/reference/

You MUST use these components where appropriate:
- Admonitions: !!! note, !!! tip, !!! warning, !!! danger, ??? collapsible
- Code blocks with line numbers, highlighting, annotations
- Content tabs: === "Tab 1" / === "Tab 2"
- Data tables for comparisons
- Diagrams (mermaid) for architecture
- Icons: :material-icon-name:
- Tooltips for technical terms
"""

# Map each doc page to the source files it should read
DOC_PAGES = {
    "index": {
        "title": "AGRO - Another Good RAG Option",
        "source_files": [
            "README.md",
            "server/app.py",
            "CLAUDE.md",
        ],
        "instruction": """Write the main landing page for AGRO documentation.

Include:
- What AGRO is (local-first RAG engine for codebases)
- The recursive acronym joke (Another Good RAG Option - like YAML, GNU, PHP)
- Key capabilities (hybrid search, self-learning reranker, MCP integration, embedded Grafana, etc.)
- Quick start snippet (git clone, make dev)
- Links to other doc sections

Make it inviting but not salesy. Technical users should immediately understand what this does.""",
    },

    "getting-started/quickstart": {
        "title": "Quick Start",
        "source_files": [
            "README.md",
            "Makefile",
            "scripts/up.sh",
            "docker-compose.services.yml",
        ],
        "instruction": """Write a quick start guide to get AGRO running in 5 minutes.

Include:
- Prerequisites (Docker, Python 3.11+, etc.)
- Clone and run commands
- What `make dev` actually does
- How to verify it's working
- Where to go next

Keep it short and actionable.""",
    },

    "getting-started/installation": {
        "title": "Installation",
        "source_files": [
            "README.md",
            "Makefile",
            "requirements.txt",
            "requirements-rag.txt",
            "docker-compose.services.yml",
            "infra/docker-compose.yml",
        ],
        "instruction": """Write detailed installation instructions.

Include:
- Full system requirements (RAM, disk, Python version)
- Docker containers and what each does (Qdrant, Redis, Grafana, Prometheus, etc.)
- Python environment setup
- Configuration overview
- Common installation issues

Be thorough - this is for users who want to understand what they're installing.""",
    },

    "getting-started/first-steps": {
        "title": "First Steps",
        "source_files": [
            "indexer/index_repo.py",
            "cli/agro.py",
            "cli/chat_cli.py",
            "server/routers/indexing.py",
        ],
        "instruction": """Write a guide for what to do after AGRO is running.

Include:
- How to index a repository (GUI, CLI, API)
- The different interfaces (GUI at :8012, CLI chat, API)
- Running your first query
- Running an evaluation

This bridges quickstart to deeper features.""",
    },

    "features/rag": {
        "title": "Hybrid Search",
        "source_files": [
            "retrieval/hybrid_search.py",
            "server/langgraph_app.py",
            "retrieval/rerank.py",
            "reranker/config.py",
        ],
        "instruction": """Write comprehensive documentation of AGRO's retrieval pipeline.

Include:
- Pipeline overview (BM25 + dense vectors + reranking)
- Reciprocal Rank Fusion (RRF) - how it combines results
- Cross-encoder reranking - what it does and why
- Tunable parameters (weights, top_k values, etc.)
- When to use what (small codebases might just need BM25)

Use a mermaid diagram for the pipeline flow. Be technical but explain the WHY.""",
    },

    "features/mcp": {
        "title": "MCP Integration",
        "source_files": [
            "server/mcp/server.py",
            "server/mcp/http.py",
            "node_mcp/server.js",
            "node_mcp/server.mjs",
        ],
        "instruction": """Document the MCP (Model Context Protocol) integration.

Include:
- What MCP is and why it matters for Claude Code/Codex
- Supported transports (stdio, HTTP/SSE)
- How to configure AGRO as an MCP server
- Available tools exposed via MCP
- Example claude_desktop_config.json setup

Explain the benefit for agentic coding tools without claiming specific token savings.""",
    },

    "features/cli-chat": {
        "title": "CLI Chat",
        "source_files": [
            "cli/chat_cli.py",
            "cli/commands/chat.py",
            "cli/agro.py",
        ],
        "instruction": """Document the CLI chat interface.

Include:
- How to start CLI chat
- Available commands and shortcuts
- Conversation memory and history
- Tips for effective use

Keep it practical.""",
    },

    "features/learning-reranker": {
        "title": "Learning Reranker",
        "source_files": [
            "server/learning_reranker.py",
            "reranker/config.py",
            "scripts/train_reranker.py",
        ],
        "instruction": """Document the self-learning reranker system.

Include:
- How it works (cross-encoder that trains on usage feedback)
- Training process and data collection
- How to trigger training
- What improvements to expect (without specific numbers)

This is genuinely cool - explain why a reranker that learns from your specific codebase queries is valuable.""",
    },

    "features/evaluation": {
        "title": "Evaluation",
        "source_files": [
            "eval/eval_rag.py",
            "eval/eval_loop.py",
            "server/routers/eval.py",
        ],
        "instruction": """Document the evaluation system.

Include:
- How to run evaluations
- Golden questions format
- Metrics tracked (MRR, Hit@K, etc.)
- Baseline comparison
- The eval drilldown feature - this is genuinely useful for understanding retrieval quality

Use content tabs for GUI vs CLI vs API approaches.""",
    },

    "configuration/models": {
        "title": "Models",
        "source_files": [
            "server/env_model.py",
            "server/models/agro_config_model.py",
            "common/config_loader.py",
        ],
        "instruction": """Document model configuration.

CRITICAL: Models are NOT a finite list. Users can add ANY local or cloud model. All config flows through Pydantic.

Include:
- Generation models (OpenAI, Anthropic, Gemini, local via Ollama, etc.)
- Embedding models (OpenAI, local sentence-transformers, etc.)
- Reranker options
- How to add custom models
- The Pydantic config flow

Use a table showing model types but make clear users can add their own.""",
    },

    "configuration/profiles": {
        "title": "Profiles",
        "source_files": [
            "server/routers/profiles.py",
            "server/services/config_store.py",
        ],
        "instruction": """Document the profile system.

Include:
- What profiles are (saved configurations)
- How to create, save, and apply profiles
- Use cases (different profiles for different repos/tasks)

Keep it concise.""",
    },

    "configuration/settings": {
        "title": "Settings",
        "source_files": [
            "server/models/agro_config_model.py",
            "server/services/config_store.py",
            "server/services/config_registry.py",
            "agro_config.json",
        ],
        "instruction": """Document all configuration options.

Include:
- agro_config.json structure
- Main setting categories
- Environment variables (.env)
- The Pydantic config system
- How settings flow from config to GUI to backend

Use collapsible sections for detailed option lists. Mention that tooltips explain each setting in the GUI.""",
    },

    "api/endpoints": {
        "title": "API Endpoints",
        "source_files": [
            "server/app.py",
            "server/routers/search.py",
            "server/routers/chat.py",
            "server/routers/config.py",
            "server/routers/indexing.py",
        ],
        "instruction": """Document the HTTP API.

Include:
- Main endpoints overview
- /answer endpoint (RAG query)
- /search endpoint (retrieval only)
- /api/config endpoints
- Request/response examples

Use code blocks with curl examples.""",
    },

    "api/openapi": {
        "title": "OpenAPI",
        "source_files": [
            "server/app.py",
        ],
        "instruction": """Document where to find the full OpenAPI spec.

Include:
- Swagger UI location (/docs)
- ReDoc location (/redoc)
- How to download the spec
- Brief note about auto-generated docs

Keep it short - point users to the interactive docs.""",
    },

    "operations/monitoring": {
        "title": "Monitoring",
        "source_files": [
            "server/alerts.py",
            "server/alert_config.py",
            "infra/docker-compose.yml",
            "infra/grafana/",
            "infra/prometheus/",
        ],
        "instruction": """Document monitoring and observability.

Include:
- Embedded Grafana dashboard (this is cool - it's right in the GUI)
- Prometheus metrics
- Available dashboards
- Slack/Discord alerts - can alert on ANY metric
- LangSmith tracing integration

The embedded Grafana and custom alerting are genuinely useful - explain why.""",
    },

    "operations/troubleshooting": {
        "title": "Troubleshooting",
        "source_files": [
            "README.md",
            "CLAUDE.md",
            "docker-compose.services.yml",
        ],
        "instruction": """Write a troubleshooting guide.

Include:
- Common connection issues (Docker, Qdrant, Redis)
- Indexing problems
- Search quality issues
- How to check logs
- Where to get help

Be practical and solution-oriented.""",
    },
}


def read_source_files(file_patterns: List[str]) -> str:
    """Read source files and return concatenated content."""
    content_parts = []

    for pattern in file_patterns:
        # Handle glob patterns
        if "*" in pattern:
            matches = glob.glob(str(ROOT / pattern), recursive=True)
        else:
            matches = [str(ROOT / pattern)]

        for filepath in matches:
            path = Path(filepath)
            if path.exists() and path.is_file():
                try:
                    text = path.read_text(encoding="utf-8")
                    # Truncate very large files
                    if len(text) > 15000:
                        text = text[:15000] + "\n... [truncated]"
                    rel_path = path.relative_to(ROOT)
                    content_parts.append(f"=== FILE: {rel_path} ===\n{text}\n")
                except Exception as e:
                    print(f"  Warning: Could not read {filepath}: {e}")

    return "\n".join(content_parts)


def generate_doc_via_agro(
    instruction: str,
    source_content: str,
    api_url: str = API_URL
) -> str:
    """Generate documentation by calling AGRO's /answer endpoint."""

    # Combine system prompt, source files, and instruction
    full_prompt = f"""{SYSTEM_PROMPT}

=== SOURCE FILES TO DOCUMENT ===

{source_content}

=== YOUR TASK ===

{instruction}

Write the complete markdown documentation page. Use MkDocs Material formatting throughout.
Output ONLY the markdown content, no explanations or meta-commentary."""

    try:
        r = requests.get(
            f"{api_url}/answer",
            params={"q": full_prompt, "repo": "agro"},
            timeout=300  # Long timeout for doc generation
        )
        r.raise_for_status()
        data = r.json()
        return data.get("answer", data.get("text", ""))
    except Exception as e:
        print(f"  Error calling AGRO: {e}")
        return f"# Error\n\nFailed to generate documentation: {e}"


def generate_doc_via_openai(
    instruction: str,
    source_content: str
) -> str:
    """Generate documentation by calling OpenAI Responses API."""
    import os

    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")

    full_prompt = f"""{SYSTEM_PROMPT}

=== SOURCE FILES TO DOCUMENT ===

{source_content}

=== YOUR TASK ===

{instruction}

Write the complete markdown documentation page. Use MkDocs Material formatting throughout.
Output ONLY the markdown content, no explanations or meta-commentary."""

    url = "https://api.openai.com/v1/responses"
    model = os.getenv("OPENAI_MODEL", "gpt-5.1")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    data = {
        "model": model,
        "input": full_prompt,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=300)
        r.raise_for_status()
        return r.json()["output_text"]
    except Exception as e:
        print(f"  Error calling OpenAI: {e}")
        return f"# Error\n\nFailed to generate documentation: {e}"


def generate_doc_via_anthropic(
    instruction: str,
    source_content: str
) -> str:
    """Generate documentation by calling Anthropic directly."""
    import os

    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    full_prompt = f"""{SYSTEM_PROMPT}

=== SOURCE FILES TO DOCUMENT ===

{source_content}

=== YOUR TASK ===

{instruction}

Write the complete markdown documentation page. Use MkDocs Material formatting throughout.
Output ONLY the markdown content, no explanations or meta-commentary."""

    url = "https://api.anthropic.com/v1/messages"
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    data = {
        "model": model,
        "max_tokens": 8000,
        "temperature": 0.3,
        "messages": [{"role": "user", "content": full_prompt}]
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=300)
        r.raise_for_status()
        return r.json()["content"][0]["text"]
    except Exception as e:
        print(f"  Error calling Anthropic: {e}")
        return f"# Error\n\nFailed to generate documentation: {e}"


def generate_page(
    page_key: str,
    config: Dict,
    dry_run: bool = False,
    api_url: str = API_URL,
    llm: Optional[str] = None
) -> str:
    """Generate a single documentation page."""
    print(f"\nGenerating: {page_key}")
    print(f"  Title: {config['title']}")
    print(f"  Reading {len(config['source_files'])} source file patterns...")

    # Read source files
    source_content = read_source_files(config["source_files"])
    if not source_content:
        print("  Warning: No source files found!")
        source_content = "(No source files available)"
    else:
        print(f"  Read {len(source_content)} characters of source code")

    # Generate documentation
    if llm == "openai":
        print("  Generating documentation via OpenAI...")
        content = generate_doc_via_openai(config["instruction"], source_content)
    elif llm == "anthropic":
        print("  Generating documentation via Anthropic...")
        content = generate_doc_via_anthropic(config["instruction"], source_content)
    else:
        print("  Generating documentation via AGRO...")
        content = generate_doc_via_agro(config["instruction"], source_content, api_url)

    if dry_run:
        print(f"  Would write to: mkdocs/docs/{page_key}.md")
        print(f"  Content preview:\n{content[:1000]}...")
    else:
        output_path = DOCS_DIR / f"{page_key}.md"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
        print(f"  Wrote: {output_path}")

    return content


def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap AGRO docs by reading source files and generating via LLM"
    )
    parser.add_argument(
        "--page",
        help="Generate only this page (e.g., 'features/rag')"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without writing files"
    )
    parser.add_argument(
        "--api-url",
        default=API_URL,
        help="AGRO API URL"
    )
    parser.add_argument(
        "--llm",
        choices=["agro", "openai", "anthropic"],
        default="agro",
        help="LLM provider: 'agro' uses /answer endpoint, 'openai' calls OpenAI directly, 'anthropic' calls Anthropic directly"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available pages"
    )
    args = parser.parse_args()

    if args.list:
        print("Available pages:")
        for key, config in DOC_PAGES.items():
            print(f"  {key}: {config['title']}")
        return

    api_url = args.api_url
    llm = args.llm if args.llm != "agro" else None

    # Check API is running (only needed for agro mode)
    if not llm:
        try:
            r = requests.get(f"{api_url}/health", timeout=5)
            r.raise_for_status()
            print(f"Connected to AGRO API at {api_url}")
        except Exception as e:
            print(f"Error: Cannot connect to AGRO API at {api_url}")
            print(f"Make sure the server is running: make dev")
            sys.exit(1)
    else:
        print(f"Using {llm.upper()} directly (bypassing AGRO /answer endpoint)")

    if args.page:
        if args.page not in DOC_PAGES:
            print(f"Unknown page: {args.page}")
            print(f"Available pages: {', '.join(DOC_PAGES.keys())}")
            sys.exit(1)
        generate_page(args.page, DOC_PAGES[args.page], args.dry_run, api_url, llm)
    else:
        print(f"Generating {len(DOC_PAGES)} documentation pages...")
        for page_key, config in DOC_PAGES.items():
            generate_page(page_key, config, args.dry_run, api_url, llm)
            time.sleep(1)  # Rate limiting between pages

    print("\nDone!")
    if not args.dry_run:
        print("Run 'mkdocs serve' to preview the docs.")


if __name__ == "__main__":
    main()
