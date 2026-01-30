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
import re
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

# Load .env file (overrides shell env)
_env_file = ROOT / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ[key.strip()] = value.strip()
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

MKDOCS MATERIAL FORMATTING - USE WHERE APPROPRIATE:
Reference: https://squidfunk.github.io/mkdocs-material/reference/

ADMONITIONS:
!!! note "Title"
    Content indented 4 spaces

!!! warning
    Warning without custom title

??? tip "Collapsible"
    Click to expand (use ??? instead of !!!)

???+ info "Expanded by default"
    Use ???+ to start expanded

Types: note, abstract, info, tip, success, question, warning, failure, danger, bug, example, quote

CODE BLOCKS:
```py title="example.py" linenums="1" hl_lines="2 3"
def example():
    highlighted = True
    return highlighted
```

Code annotations:
```yaml
theme:
  features:
    - content.code.annotate # (1)
```
1. This annotation explains the line above

CONTENT TABS:
=== "Python"
    ```python
    print("Hello")
    ```

=== "JavaScript"
    ```javascript
    console.log("Hello")
    ```

DATA TABLES:
| Method | Description |
| :----- | :---------- |
| `GET`  | Fetch resource |
| `POST` | Create resource |

Alignment: :--- left, :--: center, ---: right

MERMAID v11 DIAGRAMS:
```mermaid
graph LR
  A[Start] --> B{Decision?}
  B -->|Yes| C[Action]
  B -->|No| D[End]
```

```mermaid
sequenceDiagram
  Client->>Server: Request
  Server-->>Client: Response
```

Mermaid v11 syntax:
- Shape syntax: `A@{ shape: cyl, label: "Database" }`
- Shapes: circle, diam, hex, cyl, stadium, card, rect, rounded, ellipse
- Reference: https://mermaid.js.org/syntax/flowchart.html

ICONS & EMOJIS:
:material-account-circle: :fontawesome-brands-github: :octicons-heart-fill-24:

TASK LISTS:
- [x] Completed task
- [ ] Pending task

DEFINITION LISTS:
`Term`
:   Definition text here

TOOLTIPS:
[Hover text](# "Tooltip content here")
*[API]: Application Programming Interface

GRIDS:
<div class="grid cards" markdown>
- :material-clock-fast: __Title__ Description
- :material-github: __Another__ More text
</div>
"""


@dataclass
class DocumentationContext:
    env_example: str = ""
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
        if any(part in line for part in (
            "node_modules", "__pycache__", "dist/", "build/",
            "agent_docs/", "internal_docs", "docs/", "README.md",
            "gui/", "tests/", "playwright-report/", "reports/",
            "telemetry/", "tools/", "checkpoints/", "bin/",
        )) or line.startswith("."):
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

    ctx.env_example = read_file(ROOT / ".env.example", max_chars=2500)
    ctx.services_summaries = read_service_summaries()
    ctx.web_components = summarize_web_components()
    ctx.existing_docs = read_existing_docs(limit=60, preview_chars=400)
    ctx.recent_files = collect_recent_files(base_ref, full_scan)
    # Read all files - let token overflow be handled by continuation logic
    ctx.repo_snapshot = glob_snippets(ROOT, "*.py", max_files=1000, max_chars_per_file=10000, max_total_chars=500000)

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

    parts.append("## Environment example")
    parts.append(ctx.env_example or "(missing .env.example)")
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
  - Use Material UI components and Mermaid diagrams where appropriate - let the content dictate what makes sense.
  - Keep paths that already exist; create new ones under logical sections (features/, configuration/, api/, operations/).
"""
    )
    if targets:
        parts.append("")
        parts.append("### Only update these files")
        parts.extend(f"- {t}" for t in targets)
        parts.append("Do not create or modify any other paths.")

    return "\n".join(parts).strip()


def parse_mkdocs_nav_targets() -> List[str]:
    """Extract .md targets from mkdocs.yml nav in order."""
    mkdocs_yml = ROOT / "mkdocs.yml"
    if not mkdocs_yml.exists():
        return []
    try:
        text = mkdocs_yml.read_text(encoding="utf-8")
    except Exception:
        return []
    matches = re.findall(r"([A-Za-z0-9_./-]+\.md)", text)
    ordered: List[str] = []
    for m in matches:
        if m not in ordered:
            ordered.append(m)
    return ordered


def list_existing_doc_targets() -> List[str]:
    if not DOCS_DIR.exists():
        return []
    ordered: List[str] = []
    for path in sorted(DOCS_DIR.rglob("*.md")):
        rel = path.relative_to(DOCS_DIR)
        ordered.append(str(rel))
    return ordered


def normalize_target(t: str) -> str:
    t = t.strip().lstrip("/")
    if t.startswith("mkdocs/docs/"):
        t = t[len("mkdocs/docs/") :]
    return t


def resolve_targets(args: argparse.Namespace, ctx: DocumentationContext, full_scan: bool) -> Optional[List[str]]:
    if args.target:
        return [normalize_target(t) for t in args.target]
    if not full_scan:
        return None
    nav_targets = parse_mkdocs_nav_targets()
    existing = list_existing_doc_targets() or list(ctx.existing_docs.keys())
    combined: List[str] = []
    for t in nav_targets + existing:
        t = normalize_target(t)
        if t not in combined:
            combined.append(t)
    return combined or None


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
        payload["text"] = {"verbosity": verbosity}
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


def _estimate_tokens(s: str) -> int:
    """Estimate token count (~1 token per 4 chars)."""
    return max(1, len(s) // 4)


def _json_complete(text: str) -> bool:
    """Check if JSON output appears complete (has opening and closing braces)."""
    text = text.strip()
    return text.startswith("{") and text.endswith("}")


def call_with_continuations(
    system_prompt: str,
    initial_prompt: str,
    *,
    model: str,
    temperature: float,
    max_output_tokens: int,
    max_retries: int,
    backoff_factor: float,
    reasoning_effort: Optional[str],
    verbosity: Optional[str],
    rate_limit_delay: float,
    max_continuations: int,
) -> str:
    """Call Responses API and attempt JSON continuations when truncated."""
    raw = call_responses_api(
        system_prompt,
        initial_prompt,
        model=model,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
        reasoning_effort=reasoning_effort,
        verbosity=verbosity,
    )

    attempts = 0
    while not _json_complete(raw) and attempts < max_continuations:
        attempts += 1
        print(f"Output incomplete, continuation attempt {attempts}/{max_continuations}...")
        if rate_limit_delay > 0:
            time.sleep(rate_limit_delay)
        continuation_prompt = (
            "You were generating JSON documentation for AGRO.\n"
            "Here is the partial JSON you already produced:\n\n"
            f"{raw}\n\n"
            "Continue from where it left off.\n"
            "Do not repeat existing entries.\n"
            "Finish any incomplete entries and close all JSON braces.\n"
            "Output ONLY valid JSON (no prose)."
        )
        more = call_responses_api(
            system_prompt,
            continuation_prompt,
            model=model,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            max_retries=max_retries,
            backoff_factor=backoff_factor,
            reasoning_effort=reasoning_effort,
            verbosity=verbosity,
        )
        raw = raw.rstrip() + "\n" + more.strip()

    if attempts > 0:
        print(f"Completed after {attempts} continuation(s)")
    return raw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enhanced documentation generator for AGRO.")
    parser.add_argument("--base", default=DEFAULT_BASE, help="Git ref to diff against (default origin/staging).")
    parser.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-5.1"), help="OpenAI Responses model.")
    parser.add_argument("--temperature", type=float, default=0.3, help="Sampling temperature.")
    parser.add_argument("--max-output-tokens", type=int, default=16000, help="Max tokens per API call.")
    parser.add_argument("--max-retries", type=int, default=5, help="API retry attempts.")
    parser.add_argument("--retry-backoff", type=float, default=2.0, help="Exponent base for retry delays.")
    parser.add_argument("--rate-limit-delay", type=float, default=0, help="Delay in seconds between API calls.")
    parser.add_argument("--max-continuations", type=int, default=3, help="Max continuation attempts for incomplete output.")
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
        help="Set reasoning effort (for supported models).",
    )
    parser.add_argument(
        "--verbosity",
        choices=["low", "medium", "high"],
        help="Set text verbosity (for supported models).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    full_scan = args.full_scan or args.regenerate_all or args.base is None
    base_ref = None if full_scan else args.base

    print(f"Gathering repository context (base={base_ref or 'FULL_SCAN'}) ...")
    ctx = gather_context(base_ref, full_scan)

    targets = resolve_targets(args, ctx, full_scan)

    def _print_prompt(system_prompt: str, user_prompt: str) -> None:
        print("=== SYSTEM PROMPT ===")
        print(system_prompt)
        print("\n=== USER PROMPT ===")
        print(user_prompt)

    all_updates: Dict[str, str] = {}

    if targets:
        total_targets = len(targets)
        print(f"Generating docs for {total_targets} target(s) ...")
        for idx, target in enumerate(targets, start=1):
            target = normalize_target(target)
            print(f"\n[{idx}/{total_targets}] Target: {target}")
            user_prompt = build_user_prompt(ctx, regenerate_all=full_scan, targets=[target])

            if args.prompt_only:
                _print_prompt(SYSTEM_PROMPT, user_prompt)
                continue

            if args.rate_limit_delay > 0:
                print(f"Rate limit delay: {args.rate_limit_delay}s...")
                time.sleep(args.rate_limit_delay)

            print(f"Calling OpenAI API (model={args.model}) ...")
            raw = call_with_continuations(
                SYSTEM_PROMPT,
                user_prompt,
                model=args.model,
                temperature=args.temperature,
                max_output_tokens=args.max_output_tokens,
                max_retries=args.max_retries,
                backoff_factor=args.retry_backoff,
                reasoning_effort=args.reasoning_effort,
                verbosity=args.verbosity,
                rate_limit_delay=args.rate_limit_delay,
                max_continuations=args.max_continuations,
            )
            updates = parse_docs_response(raw)
            if not updates:
                # If model returned markdown directly, assume it's for the target.
                updates = {target: raw.strip()}

            # Keep only the explicit target if multiple keys returned.
            if target in updates:
                all_updates[target] = updates[target]
            else:
                for k, v in updates.items():
                    k_norm = normalize_target(k)
                    if k_norm == target:
                        all_updates[target] = v
                        break
                else:
                    # Fallback: write first returned doc to target.
                    first_key = next(iter(updates.keys()))
                    all_updates[target] = updates[first_key]

        if args.prompt_only:
            return
    else:
        print("Building prompt ...")
        user_prompt = build_user_prompt(ctx, regenerate_all=full_scan, targets=None)
        if args.prompt_only:
            _print_prompt(SYSTEM_PROMPT, user_prompt)
            return
        if args.rate_limit_delay > 0:
            print(f"Rate limit delay: {args.rate_limit_delay}s...")
            time.sleep(args.rate_limit_delay)
        print(f"Calling OpenAI API (model={args.model}) ...")
        raw = call_with_continuations(
            SYSTEM_PROMPT,
            user_prompt,
            model=args.model,
            temperature=args.temperature,
            max_output_tokens=args.max_output_tokens,
            max_retries=args.max_retries,
            backoff_factor=args.retry_backoff,
            reasoning_effort=args.reasoning_effort,
            verbosity=args.verbosity,
            rate_limit_delay=args.rate_limit_delay,
            max_continuations=args.max_continuations,
        )
        all_updates = parse_docs_response(raw)

    if not all_updates:
        print("No documentation updates returned.")
        return

    write_docs(all_updates, dry_run=args.dry_run)
    if not args.dry_run and not args.prompt_only:
        print("Done. Review the updated markdown under mkdocs/docs/ and run 'mkdocs serve' to preview.")


if __name__ == "__main__":
    if not ROOT.exists():
        sys.exit("Repository root not found.")
    main()
