#!/usr/bin/env python3
# pyright: reportMissingImports=false, reportMissingModuleSource=false
"""
Enhanced Docs Autopilot for AGRO.

Reads the local repository, builds a rich context bundle (AGENTS.md, config
models, service modules, existing docs, etc.) and asks OpenAI's Responses API
to emit full MkDocs pages that lean into the Material theme requirements.

Usage:
    python scripts/docs_ai/docs_autopilot_enhanced.py \
        --model gpt-5.1 \
        --max-output-tokens 6000 \
        --full-scan
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "mkdocs" / "docs"
DEFAULT_BASE = "origin/staging"

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


@dataclass
class DocumentationContext:
    agents_excerpt: str = ""
    readme_excerpt: str = ""
    config_schema: str = ""
    env_example: str = ""
    rag_pipeline: str = ""
    services_summaries: Dict[str, str] = field(default_factory=dict)
    web_components: List[str] = field(default_factory=list)
    existing_docs: Dict[str, str] = field(default_factory=dict)
    recent_files: List[str] = field(default_factory=list)
    repo_snapshot: str = ""


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def read_file(path: Path, *, max_chars: Optional[int] = None) -> str:
    try:
        data = path.read_text(encoding="utf-8")
    except Exception:
        return ""
    if max_chars is not None and len(data) > max_chars:
        return data[:max_chars] + "\n... [truncated]"
    return data


def run(cmd: str) -> Tuple[int, str, str]:
    proc = subprocess.run(
        cmd,
        shell=True,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return proc.returncode, proc.stdout, proc.stderr


def list_repo_files(limit: int = 800, include_ext: Sequence[str] = (
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".go",
    ".rs",
    ".md",
    ".yml",
    ".yaml",
    ".json",
)) -> List[str]:
    code, stdout, _ = run("git ls-files")
    if code != 0:
        return []
    files: List[str] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        if any(part in line for part in ("node_modules", "__pycache__", "dist/", "build/")):
            continue
        if not any(line.endswith(ext) for ext in include_ext):
            continue
        files.append(line)
        if len(files) >= limit:
            break
    return files


def gather_snippets(paths: Sequence[str], *, max_chars_per_file: int, max_total_chars: int) -> str:
    total = 0
    chunks: List[str] = []
    for rel in paths:
        file_path = ROOT / rel
        if not file_path.exists() or not file_path.is_file():
            continue
        text = read_file(file_path, max_chars=max_chars_per_file)
        block = f"=== FILE: {rel} ===\n{text}\n"
        if total + len(block) > max_total_chars:
            break
        chunks.append(block)
        total += len(block)
    return "\n".join(chunks)


def glob_snippets(base: Path, pattern: str, *, max_files: int, max_chars_per_file: int, max_total_chars: int) -> str:
    files = sorted(base.rglob(pattern))
    snippets: List[str] = []
    total = 0
    for idx, path in enumerate(files):
        if idx >= max_files:
            break
        if not path.is_file():
            continue
        text = read_file(path, max_chars=max_chars_per_file)
        rel = path.relative_to(ROOT)
        block = f"=== FILE: {rel} ===\n{text}\n"
        if total + len(block) > max_total_chars:
            break
        snippets.append(block)
        total += len(block)
    return "\n".join(snippets)


# --------------------------------------------------------------------------- #
# Context gathering
# --------------------------------------------------------------------------- #


def gather_context(base_ref: Optional[str], full_scan: bool) -> DocumentationContext:
    ctx = DocumentationContext()

    ctx.agents_excerpt = read_file(ROOT / "AGENTS.md", max_chars=4000)
    ctx.readme_excerpt = read_file(ROOT / "README.md", max_chars=4000)
    ctx.env_example = read_file(ROOT / ".env.example", max_chars=2500)

    config_sources = [
        "server/models/agro_config_model.py",
        "server/env_model.py",
        "agro_config.json",
    ]
    ctx.config_schema = gather_snippets(config_sources, max_chars_per_file=4000, max_total_chars=9000)

    rag_files = [
        "server/langgraph_app.py",
        "retrieval/hybrid_search.py",
        "retrieval/embed_cache.py",
        "retrieval/rerank.py",
        "server/services/rag.py",
        "server/langgraph_app.py",
    ]
    ctx.rag_pipeline = gather_snippets(rag_files, max_chars_per_file=3500, max_total_chars=12000)

    ctx.services_summaries = read_service_summaries()
    ctx.web_components = summarize_web_components()
    ctx.existing_docs = read_existing_docs(limit=60, preview_chars=400)

    ctx.recent_files = collect_recent_files(base_ref, full_scan)
    ctx.repo_snapshot = glob_snippets(ROOT, "*.py", max_files=40, max_chars_per_file=1200, max_total_chars=45000)

    return ctx


def read_service_summaries() -> Dict[str, str]:
    summaries: Dict[str, str] = {}
    service_dir = ROOT / "server" / "services"
    if not service_dir.exists():
        return summaries
    for path in sorted(service_dir.glob("*.py")):
        text = read_file(path, max_chars=1200)
        summaries[path.stem] = text
    return summaries


def summarize_web_components(max_items: int = 60) -> List[str]:
    components_dir = ROOT / "web" / "src" / "components"
    if not components_dir.exists():
        return []
    entries: List[str] = []
    for path in sorted(components_dir.rglob("*.tsx")):
        rel = path.relative_to(ROOT)
        entries.append(str(rel))
        if len(entries) >= max_items:
            break
    return entries


def read_existing_docs(limit: int, preview_chars: int) -> Dict[str, str]:
    docs: Dict[str, str] = {}
    if not DOCS_DIR.exists():
        return docs
    for idx, path in enumerate(sorted(DOCS_DIR.rglob("*.md"))):
        rel = path.relative_to(DOCS_DIR)
        docs[str(rel)] = read_file(path, max_chars=preview_chars)
        if idx + 1 >= limit:
            break
    return docs


def collect_recent_files(base_ref: Optional[str], full_scan: bool) -> List[str]:
    if full_scan or base_ref is None:
        return list_repo_files(limit=600)
    cmd = f"git diff --name-only {shlex.quote(base_ref)}..HEAD"
    code, stdout, _ = run(cmd)
    if code != 0:
        return []
    files = [line.strip() for line in stdout.splitlines() if line.strip()]
    return files[:400]


# --------------------------------------------------------------------------- #
# Prompt building
# --------------------------------------------------------------------------- #


def build_user_prompt(
    ctx: DocumentationContext,
    *,
    regenerate_all: bool,
    targets: Optional[Sequence[str]],
) -> str:
    parts: List[str] = []

    parts.append("Generate comprehensive AGRO documentation updates with the following context.")
    parts.append("")
    parts.append("## Top-level references")
    parts.append("### AGENTS.md (truncated)")
    parts.append(ctx.agents_excerpt or "(missing)")
    parts.append("")
    parts.append("### README.md (truncated)")
    parts.append(ctx.readme_excerpt or "(missing)")
    parts.append("")

    parts.append("## Configuration model snapshots")
    parts.append(ctx.config_schema or "(no config excerpts)")
    parts.append("")

    parts.append("## Environment example (sanitized)")
    parts.append(ctx.env_example or "(missing .env.example)")
    parts.append("")

    parts.append("## RAG pipeline & LangGraph")
    parts.append(ctx.rag_pipeline or "(missing retrieval excerpts)")
    parts.append("")

    parts.append("## Service layer summaries")
    for name, snippet in list(ctx.services_summaries.items())[:20]:
        parts.append(f"### server/services/{name}.py")
        parts.append(snippet)
        parts.append("")

    parts.append("## Web UI components (first 60)")
    parts.append("\n".join(f"- {entry}" for entry in ctx.web_components))
    parts.append("")

    parts.append("## Existing docs (preview)")
    for path, preview in ctx.existing_docs.items():
        parts.append(f"- {path}: {preview.replace(os.linesep, ' ')[:200]}...")
    parts.append("")

    scope_header = "## Full repository scan" if regenerate_all else "## Recent changes"
    parts.append(scope_header)
    if ctx.recent_files:
        listing = "\n".join(f"- {path}" for path in ctx.recent_files[:200])
        parts.append(listing)
    else:
        parts.append("(no diff information available)")
    parts.append("")

    parts.append("## Raw code snapshot (selected files)")
    parts.append(ctx.repo_snapshot or "(skipped)")
    parts.append("")

    parts.append("## Output contract")
    parts.append(
        """
Return a JSON object where:
  - Keys are Markdown file paths relative to mkdocs/docs (example: "features/rag.md").
  - Values are the COMPLETE Markdown documents using MkDocs Material components.
  - Each page should contain at least three admonitions, code tabs (Python/Node/curl),
    a mermaid diagram for flows, configuration tables, and explicit references to AGRO knobs.
  - Keep paths that already exist; create new ones under logical sections (features/, configuration/, api/, operations/).
"""
    )
    if targets:
        parts.append("")
        parts.append("### Only update these files")
        parts.extend(f"- {t}" for t in targets)
        parts.append("Do not create or modify any other paths.")

    return "\n".join(parts).strip()


# --------------------------------------------------------------------------- #
# OpenAI Responses API
# --------------------------------------------------------------------------- #


def call_responses_api(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str,
    temperature: float,
    max_output_tokens: int,
    max_retries: int,
    backoff_factor: float,
    reasoning_effort: Optional[str],
    verbosity: Optional[str],
) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/responses"
    payload: Dict[str, Any] = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        "max_output_tokens": max_output_tokens,
    }
    if reasoning_effort:
        payload["reasoning"] = {"effort": reasoning_effort}
    if not reasoning_effort or reasoning_effort == "none":
        payload["temperature"] = temperature
    if verbosity:
        payload.setdefault("text", {})["verbosity"] = verbosity
    if reasoning_effort:
        payload["reasoning"] = {"effort": reasoning_effort}
    if verbosity:
        payload.setdefault("text", {})["verbosity"] = verbosity
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for attempt in range(max_retries):
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                content = resp.read()
                return extract_output_text(json.loads(content))
        except urllib.error.HTTPError as err:
            status = err.code
            detail = err.read().decode("utf-8", "ignore")
            if status in {429, 500, 502, 503, 504} and attempt < max_retries - 1:
                delay = backoff_factor * (2 ** attempt)
                print(f"OpenAI error {status}; retrying in {delay:.1f}s...")
                time.sleep(delay)
                continue
            raise RuntimeError(f"OpenAI HTTP error ({status}): {detail}") from err
        except urllib.error.URLError as err:
            if attempt < max_retries - 1:
                delay = backoff_factor * (2 ** attempt)
                print(f"OpenAI request failed ({err}); retrying in {delay:.1f}s...")
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

    segments: List[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                segments.append(content.get("text", ""))

    if segments:
        return "\n".join(segments).strip()

    return json.dumps(payload, indent=2)


# --------------------------------------------------------------------------- #
# File writing
# --------------------------------------------------------------------------- #


def parse_docs_response(raw: str) -> Dict[str, str]:
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {k.strip(): str(v) for k, v in data.items()}
    except json.JSONDecodeError:
        pass

    docs: Dict[str, List[str]] = {}
    current_file: Optional[str] = None
    for line in raw.splitlines():
        if line.startswith("FILE:") or line.startswith("### FILE:"):
            current_file = line.split(":", 1)[1].strip()
            docs[current_file] = []
        elif current_file:
            docs[current_file].append(line)
    return {k: "\n".join(v) for k, v in docs.items()}


def write_docs(updates: Dict[str, str], *, dry_run: bool) -> None:
    if dry_run:
        print("=== DRY RUN OUTPUT ===")
        for path in updates:
            print(f"- mkdocs/docs/{path}")
        return

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    for rel_path, content in updates.items():
        dest = DOCS_DIR / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        rel = dest.relative_to(ROOT)
        print(f"Wrote {rel}")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enhanced documentation generator for AGRO.")
    parser.add_argument("--base", default=DEFAULT_BASE, help="Git ref to diff against (default origin/staging).")
    parser.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-5.1"), help="OpenAI Responses model.")
    parser.add_argument("--temperature", type=float, default=0.3, help="Sampling temperature.")
    parser.add_argument("--max-output-tokens", type=int, default=6000, help="Max tokens per Responses call.")
    parser.add_argument("--max-retries", type=int, default=5, help="OpenAI retry attempts.")
    parser.add_argument("--retry-backoff", type=float, default=2.0, help="Exponent base for retry delays.")
    parser.add_argument("--full-scan", action="store_true", help="Ignore diff and scan entire repo.")
    parser.add_argument("--regenerate-all", action="store_true", help="Alias for --full-scan.")
    parser.add_argument("--dry-run", action="store_true", help="Do not write files; list what would change.")
    parser.add_argument(
        "--prompt-only",
        action="store_true",
        help="Skip OpenAI call and print the constructed prompt for debugging.",
    )
    parser.add_argument(
        "--target",
        action="append",
        help="Limit generation to specific mkdocs/docs paths (e.g., configuration/models.md).",
    )
    parser.add_argument(
        "--reasoning-effort",
        choices=["none", "low", "medium", "high"],
        help="Set GPT-5.1 reasoning effort.",
    )
    parser.add_argument(
        "--verbosity",
        choices=["low", "medium", "high"],
        help="Set GPT-5.1 text verbosity.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    full_scan = args.full_scan or args.regenerate_all or args.base is None
    base_ref = None if full_scan else args.base

    print(f"Gathering repository context (base={base_ref or 'FULL_SCAN'}) ...")
    ctx = gather_context(base_ref, full_scan)

    print("Building prompt ...")
    user_prompt = build_user_prompt(ctx, regenerate_all=full_scan, targets=args.target)

    if args.prompt_only:
        print("=== SYSTEM PROMPT ===")
        print(SYSTEM_PROMPT)
        print("\n=== USER PROMPT ===")
        print(user_prompt)
        return

    print(f"Calling OpenAI Responses API (model={args.model}) ...")
    raw = call_responses_api(
        SYSTEM_PROMPT,
        user_prompt,
        model=args.model,
        temperature=args.temperature,
        max_output_tokens=args.max_output_tokens,
        max_retries=args.max_retries,
        backoff_factor=args.retry_backoff,
        reasoning_effort=args.reasoning_effort,
        verbosity=args.verbosity,
    )

    updates = parse_docs_response(raw)
    if not updates:
        print("No documentation updates returned.")
        return

    write_docs(updates, dry_run=args.dry_run)
    if not args.dry_run:
        print("Done. Review the updated markdown under mkdocs/docs/ and run 'mkdocs serve' to preview.")


if __name__ == "__main__":
    if not ROOT.exists():
        sys.exit("Repository root not found.")
    main()

