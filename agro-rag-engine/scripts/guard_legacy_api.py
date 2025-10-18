#!/usr/bin/env python3
import os, sys, re

SCAN_ALL = os.getenv("SCAN_ALL", "0").lower() in {"1","true","yes"}
ROOTS = [os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))]
if SCAN_ALL:
    ROOTS += [
        os.getenv('PROJECT_PATH', '/abs/path/to/project'),
        os.getenv('project_PATH', '/abs/path/to/project'),
    ]

BAD_PATTERNS = [
    r"\bChatCompletion\b",
    r"\bclient\.chat\.completions\b",
    r"\bassistants?\.v1\b",
    r"\bgpt-3\.5\b",
    r"\bgpt-4(?!\.1|o)\b",
    r"\bgpt-4o(-mini)?\b",
    r"\btext-embedding-ada\b",
    r"\btext-embedding-00[23]\b",
]
ALLOWLIST_FILES = {
    # add filenames you want ignored (e.g., historical docs)
}

SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "dist", "build", "vendor", "third_party", "site-packages", "__pycache__"}


def scan_file(path: str) -> list[str]:
    try:
        with open(path, "r", errors="ignore") as f:
            s = f.read()
    except Exception:
        return []
    hits = []
    for pat in BAD_PATTERNS:
        if re.search(pat, s):
            hits.append(pat)
    return hits


def main() -> int:
    offenders = []
    for root in ROOTS:
        if not os.path.isdir(root):
            continue
        for base, dirs, files in os.walk(root):
            # prune skip dirs
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
            for name in files:
                if name in ALLOWLIST_FILES:
                    continue
                # Scan code files only (skip docs like .md)
                if not any(name.endswith(ext) for ext in (".py", ".ts", ".tsx", ".js", ".rb")):
                    continue
                path = os.path.join(base, name)
                # skip this guard file and sitecustomize self-detection
                if path.endswith("scripts/guard_legacy_api.py") or path.endswith("sitecustomize.py"):
                    continue
                hits = scan_file(path)
                if hits:
                    offenders.append((path, hits))
    if offenders:
        print("\u274c Legacy APIs/models detected:")
        for p, pats in offenders:
            print(f"- {p}")
            for pat in pats:
                print(f"    \u21b3 {pat}")
        print("\nAction: replace Chat Completions with Responses API calls; update model pins (e.g., gpt-4o-mini-latest or a dated pin).")
        print("Docs:")
        print("  https://openai.com/index/new-tools-and-features-in-the-responses-api/")
        print("  https://openai.com/index/introducing-upgrades-to-codex/")
        return 2
    print("\u2713 No legacy APIs/models detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
