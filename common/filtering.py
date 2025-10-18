from __future__ import annotations

# Expose filtering helpers used by indexer

PRUNE_DIRS = {
    ".git", ".github", ".gitlab", ".venv", "node_modules", "dist", "build", "target", "__pycache__",
    "coverage", ".tox", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"
}


def _prune_dirs_in_place(dirs: list[str]) -> None:
    for d in list(dirs):
        if d in PRUNE_DIRS:
            try:
                dirs.remove(d)
            except Exception:
                pass


def _should_index_file(name: str) -> bool:
    n = (name or "").lower()
    # EXCLUDE MARKDOWN FILES COMPLETELY (per user requirement)
    if n.endswith((".md", ".markdown", ".rst", ".txt")):
        return False
    # Skip obvious binary or large files by suffix
    skip_suffixes = (".min.js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".zip", ".tar", ".gz", ".bak", ".backup")
    if any(n.endswith(s) for s in skip_suffixes):
        return False
    # Skip backup files and lock files
    skip_contains = ("lock", ".cache", ".bak", "backup")
    if any(s in n for s in skip_contains):
        return False
    return True

