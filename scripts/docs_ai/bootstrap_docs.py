#!/usr/bin/env python3
# pyright: reportMissingImports=false, reportMissingModuleSource=false
"""
Docs Autopilot bootstrap for AGRO.

Reads curated source files for each documentation page, chunks the input to stay
under token limits, and calls OpenAI's Responses API (gpt-5.1) to generate
MkDocs pages. Designed for the large “catch-up” run where every page needs a
fresh rewrite without hammering AGRO's own API.
"""

import argparse
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

from dotenv import load_dotenv  # type: ignore[import-not-found]

ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "mkdocs" / "docs"

load_dotenv(ROOT / ".env", override=False)

# The system prompt for doc generation (do not change).
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

PROMPT_TEMPLATE = """=== SOURCE FILES TO DOCUMENT ===

{source}

=== YOUR TASK ===

{instruction}

Write the complete markdown documentation page. Use MkDocs Material formatting throughout.
Output ONLY the markdown content, no explanations or meta-commentary."""

# Map each doc page to the source files it should read
DOC_PAGES: Dict[str, Dict[str, Any]] = {
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

MAX_FILE_CHARS = 15_000
DEFAULT_PAGE_CHAR_LIMIT = 60_000


@dataclass(frozen=True)
class DocPage:
    slug: str
    title: str
    source_files: Sequence[str]
    instruction: str


def iter_pages(selected: Optional[Sequence[str]] = None) -> Iterable[DocPage]:
    if selected:
        missing = [slug for slug in selected if slug not in DOC_PAGES]
        if missing:
            raise KeyError(f"Unknown page(s): {', '.join(missing)}")
        ordered = []
        for slug in selected:
            if slug not in ordered:
                ordered.append(slug)
    else:
        ordered = list(DOC_PAGES.keys())

    for slug in ordered:
        config = DOC_PAGES[slug]
        yield DocPage(
            slug=slug,
            title=config["title"],
            source_files=config["source_files"],
            instruction=config["instruction"],
        )


def read_source_files(
    file_patterns: Sequence[str],
    *,
    max_file_chars: int = MAX_FILE_CHARS,
    max_total_chars: int = DEFAULT_PAGE_CHAR_LIMIT,
) -> str:
    content_parts: List[str] = []
    total = 0

    for pattern in file_patterns:
        if any(ch in pattern for ch in "*?["):
            matches = glob.glob(str(ROOT / pattern), recursive=True)
        else:
            matches = [str(ROOT / pattern)]

        if not matches:
            print(f"  Warning: No matches for pattern '{pattern}'")
            continue

        for filepath in matches:
            path = Path(filepath)
            if not path.exists() or not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except Exception as exc:
                print(f"  Warning: Could not read {path}: {exc}")
                continue

            if len(text) > max_file_chars:
                text = text[:max_file_chars] + "\n... [truncated]"

            try:
                rel_path = path.relative_to(ROOT)
            except ValueError:
                rel_path = path

            chunk = f"=== FILE: {rel_path} ===\n{text}\n"
            chunk_len = len(chunk)
            if total + chunk_len > max_total_chars:
                remaining = max_total_chars - total
                if remaining > 0:
                    content_parts.append(chunk[:remaining])
                    total += remaining
                print("  Reached max source characters limit; skipping remaining files.")
                return "\n".join(content_parts)

            content_parts.append(chunk)
            total += chunk_len

    return "\n".join(content_parts)


def build_user_prompt(page: DocPage, source: str) -> str:
    source_block = source or "(No source files available)"
    return PROMPT_TEMPLATE.format(source=source_block, instruction=page.instruction.strip())


def call_openai_responses(
    user_prompt: str,
    *,
    model: str,
    temperature: float,
    max_output_tokens: int,
    max_retries: int,
    backoff_factor: float,
) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/responses"
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for attempt in range(max_retries):
        request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                data = response.read()
                return extract_output_text(json.loads(data))
        except urllib.error.HTTPError as err:
            status = err.code
            detail = err.read().decode("utf-8", "ignore")
            if status in {429, 500, 502, 503, 504} and attempt < max_retries - 1:
                delay = backoff_factor * (2 ** attempt)
                print(f"  OpenAI error {status}; retrying in {delay:.1f}s...")
                time.sleep(delay)
                continue
            raise RuntimeError(f"OpenAI HTTP error ({status}): {detail}") from err
        except urllib.error.URLError as err:
            if attempt < max_retries - 1:
                delay = backoff_factor * (2 ** attempt)
                print(f"  OpenAI request failed ({err}); retrying in {delay:.1f}s...")
                time.sleep(delay)
                continue
            raise RuntimeError(f"OpenAI request failed: {err}") from err

    raise RuntimeError("OpenAI request exhausted retries")


def extract_output_text(payload: Dict[str, Any]) -> str:
    if "output_text" in payload and payload["output_text"]:
        text = payload["output_text"]
        if isinstance(text, list):
            return "\n".join(text).strip()
        return str(text).strip()

    chunks: List[str] = []
    for block in payload.get("output", []):
        if not isinstance(block, dict):
            continue
        for content in block.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"}:
                chunks.append(content.get("text", ""))

    if not chunks and isinstance(payload.get("content"), list):
        for content in payload["content"]:
            if isinstance(content, dict) and content.get("text"):
                chunks.append(content["text"])

    if not chunks:
        return json.dumps(payload, indent=2)

    return "\n".join(chunks).strip()


class DocBootstrapper:
    def __init__(
        self,
        *,
        model: str,
        temperature: float,
        max_output_tokens: int,
        max_source_chars: int,
        delay_seconds: float,
        max_retries: int,
        backoff_factor: float,
    ) -> None:
        self.model = model
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self.max_source_chars = max_source_chars
        self.delay_seconds = delay_seconds
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    def generate(self, selected: Optional[Sequence[str]], dry_run: bool) -> None:
        pages = list(iter_pages(selected))
        if not pages:
            print("No pages selected.")
            return

        total = len(pages)
        print(f"Generating {total} documentation page(s) with model {self.model}...")

        for index, page in enumerate(pages, start=1):
            print(f"\n[{index}/{total}] {page.slug} — {page.title}")
            source = read_source_files(
                page.source_files,
                max_total_chars=self.max_source_chars,
            )
            if not source:
                print("  Warning: No source files found; continuing anyway.")
            else:
                print(f"  Aggregated {len(source)} characters of source context.")

            prompt = build_user_prompt(page, source)

            try:
                markdown = call_openai_responses(
                    prompt,
                    model=self.model,
                    temperature=self.temperature,
                    max_output_tokens=self.max_output_tokens,
                    max_retries=self.max_retries,
                    backoff_factor=self.backoff_factor,
                )
            except Exception as exc:
                print(f"  Error: {exc}")
                continue

            if dry_run:
                preview = markdown[:1000].strip()
                suffix = "..." if len(markdown) > 1000 else ""
                print(f"  Preview:\n{preview}{suffix}")
            else:
                output_path = DOCS_DIR / f"{page.slug}.md"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(markdown, encoding="utf-8")
                rel = output_path.relative_to(ROOT)
                print(f"  Wrote {rel} ({len(markdown)} chars)")

            if index < total and self.delay_seconds > 0:
                time.sleep(self.delay_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap AGRO docs via OpenAI Responses API",
    )
    parser.add_argument(
        "--page",
        action="append",
        help="Generate only this page slug (can be passed multiple times).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview content without writing files.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available pages and exit.",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("OPENAI_MODEL", "gpt-5.1"),
        help="OpenAI model (Responses API). Default: gpt-5.1",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.3,
        help="Sampling temperature.",
    )
    parser.add_argument(
        "--max-output-tokens",
        type=int,
        default=5000,
        help="Maximum tokens to generate per page.",
    )
    parser.add_argument(
        "--max-source-chars",
        type=int,
        default=DEFAULT_PAGE_CHAR_LIMIT,
        help="Hard cap on combined source context per page.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="Seconds to sleep between pages to stay under rate limits.",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=5,
        help="Maximum retries for OpenAI rate-limit/server errors.",
    )
    parser.add_argument(
        "--retry-backoff",
        type=float,
        default=2.0,
        help="Base seconds for exponential backoff on retries.",
    )
    return parser.parse_args()


def list_pages() -> None:
    print("Available pages:")
    for slug, config in DOC_PAGES.items():
        print(f"  - {slug:<30} {config['title']}")


def main() -> None:
    args = parse_args()

    if args.list:
        list_pages()
        return

    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not set in environment or .env file.")
        sys.exit(1)

    bootstrapper = DocBootstrapper(
        model=args.model,
        temperature=args.temperature,
        max_output_tokens=args.max_output_tokens,
        max_source_chars=args.max_source_chars,
        delay_seconds=args.delay,
        max_retries=args.max_retries,
        backoff_factor=args.retry_backoff,
    )

    try:
        bootstrapper.generate(args.page, args.dry_run)
    except KeyError as exc:
        print(exc)
        print("Use --list to see valid page slugs.")
        sys.exit(1)

    if not args.dry_run:
        print("\nDone! Run 'mkdocs serve' to preview the docs.")


if __name__ == "__main__":
    main()
