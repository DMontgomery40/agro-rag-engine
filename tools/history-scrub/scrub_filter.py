#!/usr/bin/env python3
"""
Rewrite entire git history to remove all traces of banned tokens and any
repo/collection named "target". Drops any path containing a banned token and
scrubs blob contents across all refs (branches + tags).

Usage: run from a --mirror clone (see README.md):
  python3 ../tools/history-scrub/scrub_filter.py
"""

from __future__ import annotations
import os
import re
from typing import Optional, List

try:
    from git_filter_repo import FilterOptions, Blob, filter_repo
except Exception as e:
    raise SystemExit("git-filter-repo not installed. pip install git-filter-repo")


def _load_tokens() -> List[bytes]:
    raw = os.getenv("SCRUB_TOKENS", "")
    toks = [t.strip() for t in raw.split(",") if t.strip()]
    return [t.encode("utf-8") for t in toks]

_TARGET_TOKEN = re.compile(rb'(\bcode_chunks_)target(\b)')
_TARGET_QUOTED = re.compile(rb'(["\'"\_])target(["\'"\_])')


def is_binary(data: Optional[bytes]) -> bool:
    return not data or (b"\x00" in data)


def replace_blob(blob: Blob) -> None:
    data = blob.data
    if is_binary(data):
        return

    # Remove banned tokens (case-sensitive as provided)
    for t in _load_tokens():
        data = data.replace(t, b"")

    # Remove 'target' when used as a repo/collection token
    # e.g., code_chunks_target -> code_chunks_
    data = _TARGET_TOKEN.sub(rb'\1\2', data)
    # Handle quoted/underscored standalone 'target'
    data = _TARGET_QUOTED.sub(rb'\1\2', data)

    blob.data = data


def main() -> None:
    fo = FilterOptions.default_options()
    # Keep everything except any path containing a banned token (first token if set)
    toks = _load_tokens()
    fo.path_globs = [f"*{t.decode('utf-8')}*" for t in toks] or []
    fo.invert_paths = True
    fo.replace_refs = True  # rewrite all branches + tags

    def blob_cb(blob: Blob, metadata):  # type: ignore[no-redef]
        replace_blob(blob)

    filter_repo(fo, blob_callback=blob_cb)


if __name__ == "__main__":
    main()
