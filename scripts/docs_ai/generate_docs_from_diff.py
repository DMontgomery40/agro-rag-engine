#!/usr/bin/env python3
"""
Docs Autopilot for AGRO - LLM-assisted documentation updates using AGRO's own gen model.

This script:
1. Detects code changes via git diff
2. Builds a heuristic plan of suggested doc updates
3. Optionally calls AGRO's /answer endpoint to generate doc patches

Usage:
    # Plan only (no LLM)
    python scripts/docs_ai/generate_docs_from_diff.py --base origin/main

    # Use AGRO's gen model to produce patches
    python scripts/docs_ai/generate_docs_from_diff.py --base origin/main --llm agro --apply
"""

import argparse
import subprocess
import shlex
import json
import sys
from pathlib import Path
from typing import List, Tuple, Optional

# Add project root to path for imports
ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


def run(cmd: str, check: bool = True) -> str:
    """Run a shell command and return stdout."""
    p = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=ROOT)
    if check and p.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{p.stderr}")
    return p.stdout


def git_diff_names(base: str) -> List[str]:
    """Get list of changed files between base and HEAD."""
    out = run(f"git diff --name-only {shlex.quote(base)}..HEAD")
    return [ln.strip() for ln in out.splitlines() if ln.strip()]


def _read(path: Path) -> str:
    """Read file contents, return empty string on failure."""
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def build_plan(base_ref: str) -> str:
    """
    Build a heuristic plan of suggested documentation updates based on changed files.
    AGRO-specific: looks at server/, retrieval/, indexer/, reranker/, web/, cli/, etc.
    """
    changed = git_diff_names(base_ref)

    # Read context files
    claude_md = _read(ROOT / "CLAUDE.md")
    env_example = _read(ROOT / ".env.example")
    readme = _read(ROOT / "README.md")

    # Try to get OpenAPI spec
    openapi = ""
    try:
        import requests
        r = requests.get("http://127.0.0.1:8012/openapi.json", timeout=5)
        if r.ok:
            openapi = r.text[:3000]  # Truncate for context
    except Exception:
        pass

    bullets = []

    # Server/API changes
    if any(p.startswith("server/routers/") for p in changed):
        bullets.append("Update API endpoint documentation - routers changed")
    if any(p.startswith("server/services/") for p in changed):
        bullets.append("Review service layer changes; may affect feature docs")
    if any("langgraph" in p.lower() for p in changed):
        bullets.append("Update RAG pipeline documentation - LangGraph changes detected")

    # Retrieval changes
    if any(p.startswith("retrieval/") for p in changed):
        bullets.append("Update hybrid search documentation - retrieval module changed")
    if any("rerank" in p.lower() for p in changed):
        bullets.append("Update reranker/learning reranker documentation")

    # Indexer changes
    if any(p.startswith("indexer/") for p in changed):
        bullets.append("Update indexing documentation - indexer changed")

    # CLI changes
    if any(p.startswith("cli/") for p in changed):
        bullets.append("Update CLI documentation - cli module changed")

    # Config changes
    if any(p.startswith("server/models/") and "config" in p.lower() for p in changed):
        bullets.append("Update configuration documentation - Pydantic config models changed")
    if any("agro_config" in p for p in changed):
        bullets.append("Review settings documentation - agro_config.json schema may have changed")

    # Web/GUI changes
    if any(p.startswith("web/") for p in changed):
        bullets.append("Consider updating GUI-related documentation")

    # MCP changes
    if any("mcp" in p.lower() for p in changed):
        bullets.append("Update MCP integration documentation")

    # Eval changes
    if any(p.startswith("eval/") for p in changed):
        bullets.append("Update evaluation documentation")

    # Docker/infra changes
    if any(p.startswith("infra/") or "docker" in p.lower() for p in changed):
        bullets.append("Update installation/infrastructure documentation")

    if not bullets:
        bullets.append("Routine doc hygiene: links, anchors, small fixes.")

    sections = [
        "# Docs Autopilot Plan (heuristic)",
        f"Base: {base_ref}",
        "",
        "## Changed files",
        *[f"- {p}" for p in changed[:100]],  # Limit to 100 files
        "",
        "## Suggested updates",
        *[f"- {b}" for b in bullets],
        "",
        "## Context snapshots",
        "### CLAUDE.md (excerpt)",
        (claude_md or "")[:2000],
        "",
        "### README.md (excerpt)",
        (readme or "")[:2000],
        "",
        "### .env.example (excerpt)",
        (env_example or "")[:1500],
        "",
        "### OpenAPI (truncated)",
        openapi[:1500] if openapi else "(not available - server may not be running)",
    ]
    return "\n".join(sections)


def call_agro_llm(prompt: str, api_url: str = "http://127.0.0.1:8012") -> str:
    """
    Call AGRO's own /answer endpoint to generate documentation patches.
    Uses whatever gen_model is configured in agro_config.json.
    """
    import requests

    # Use the /answer endpoint with a doc-focused query
    params = {
        "q": prompt,
        "repo": "agro",  # Use AGRO's own indexed codebase for context
    }

    try:
        r = requests.get(f"{api_url}/answer", params=params, timeout=120)
        r.raise_for_status()
        data = r.json()
        return data.get("answer", data.get("text", str(data)))
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to call AGRO API: {e}")


def call_external_llm(prompt: str, provider: str) -> str:
    """Call external LLM (OpenAI or Anthropic) for doc generation."""
    import os
    import requests

    provider = provider.lower().strip()

    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY not set")
        url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1/chat/completions")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a senior technical writer for a RAG engine project. Output unified diffs for MkDocs documentation files only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        r = requests.post(url, headers=headers, json=data, timeout=120)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

    elif provider == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        url = "https://api.anthropic.com/v1/messages"
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
        headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        data = {
            "model": model,
            "max_tokens": 4000,
            "temperature": 0.2,
            "messages": [{"role": "user", "content": prompt}]
        }
        r = requests.post(url, headers=headers, json=data, timeout=120)
        r.raise_for_status()
        return r.json()["content"][0]["text"]

    else:
        raise RuntimeError(f"Unsupported provider: {provider}")


def apply_patch(patch_path: str) -> Tuple[bool, str]:
    """Attempt to apply a git patch."""
    try:
        run(f"git apply --index {shlex.quote(patch_path)}")
        return True, ""
    except Exception as e:
        return False, str(e)


def main():
    ap = argparse.ArgumentParser(
        prog="docs-autopilot",
        description="LLM-assisted documentation updates from code diffs (uses AGRO's gen model)",
    )
    ap.add_argument("--base", default="origin/main", help="Git ref to diff against")
    ap.add_argument("--llm", choices=["agro", "openai", "anthropic"], default=None,
                    help="LLM provider: 'agro' uses AGRO's own /answer endpoint with configured gen_model")
    ap.add_argument("--apply", action="store_true", help="Apply returned unified diff to working tree")
    ap.add_argument("--output", default="mkdocs-docs-plan.md", help="Where to write the plan or patch")
    ap.add_argument("--api-url", default="http://127.0.0.1:8012", help="AGRO API URL (for --llm agro)")
    args = ap.parse_args()

    # Plan-only mode (no LLM)
    if not args.llm:
        plan = build_plan(args.base)
        (ROOT / args.output).write_text(plan, encoding="utf-8")
        print(f"Wrote plan: {args.output}")
        return

    # LLM mode
    plan = build_plan(args.base)

    system_prompt = """You are a senior technical writer for AGRO, a local-first RAG engine for codebases.

Your task: Review the code changes and suggest documentation updates as a unified diff patch.
Only modify files under mkdocs/docs/ and mkdocs.yml.

Guidelines:
- Write in a casual, direct, technical voice (like the README)
- Focus on what users need to know to use the feature
- Don't over-explain implementation details
- Include code examples where helpful
- Keep it concise

Output ONLY a unified diff patch that can be applied with `git apply`.
"""

    full_prompt = f"{system_prompt}\n\n{plan}"

    if args.llm == "agro":
        # Use AGRO's own gen model
        print(f"Calling AGRO API at {args.api_url} with configured gen_model...")
        patch = call_agro_llm(full_prompt, args.api_url)
    else:
        # Use external provider
        print(f"Calling {args.llm} API...")
        patch = call_external_llm(full_prompt, args.llm)

    patch_file = ROOT / "mkdocs-docs-llm.patch"
    patch_file.write_text(patch, encoding="utf-8")
    print(f"LLM patch saved: {patch_file}")

    if args.apply:
        ok, err = apply_patch(str(patch_file))
        if not ok:
            print(f"Failed to apply patch: {err}")
            print("You may need to apply it manually or review the patch file.")
        else:
            print("Patch applied to index.")


if __name__ == "__main__":
    main()
