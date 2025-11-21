#!/usr/bin/env python3
"""Fail if reranker-critical files change without doc updates."""
import subprocess
import sys

WATCH_PREFIXES = (
    "retrieval/",
    "server/reranker",
    "server/app.py",
    "scripts/mine_triplets.py",
    "scripts/train_reranker.py",
    "scripts/eval_reranker.py",
    "scripts/promote_reranker.py",
    "gui/js/reranker",
    "gui/index.html",
    "tests/gui/reranker",
    "tests/smoke/test_reranker_default_model.py",
    "tests/test_rag_smoke.py",
    "data/training/",
)

DOC_ROOT = "agent_docs/reranker-reset/"
CHANGELOG = "agent_docs/reranker-reset/CHANGELOG.md"

def git_diff(base):
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        capture_output=True,
        text=True,
        check=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]

def touches_watched(files):
    for path in files:
        for prefix in WATCH_PREFIXES:
            if path.startswith(prefix):
                return True
    return False

def main():
    if len(sys.argv) != 2:
        print("Usage: reranker_doc_guard.py <base-ref>", file=sys.stderr)
        return 2

    base = sys.argv[1]
    try:
        files = git_diff(base)
    except subprocess.CalledProcessError as exc:
        print("git diff failed", file=sys.stderr)
        print(exc.stderr, file=sys.stderr)
        return 2

    if not files:
        print("No files changed; skipping doc guard.")
        return 0

    if not touches_watched(files):
        print("No reranker-critical files touched.")
        return 0

    docs_changed = any(f.startswith(DOC_ROOT) for f in files)
    if not docs_changed:
        print("ERROR: Reranker files changed without doc updates.", file=sys.stderr)
        return 1

    if CHANGELOG not in files:
        print("ERROR: CHANGELOG.md not updated.", file=sys.stderr)
        return 1

    print("Doc guard check passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
