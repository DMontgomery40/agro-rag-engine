#!/usr/bin/env python3
"""Extract the trailing JSON summary from an eval log file.

Usage:
  python scripts/extract_eval_summary.py data/evals/baseline_20251019_015810.json data/evals/latest.json
If the first arg is omitted, reads the newest baseline_*.json under data/evals.
If the second arg is omitted, writes to data/evals/latest.json.
"""
from __future__ import annotations

import sys
import json
from pathlib import Path


def newest_baseline(base: Path) -> Path | None:
    files = sorted(base.glob('baseline_*.json'), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def extract_summary_text(text: str) -> str | None:
    lines = text.splitlines()
    # Scan from end and build candidate block until a line that starts with '{'
    buf = []
    depth = 0
    started = False
    for line in reversed(lines):
        buf.append(line)
        # Count braces naively to stop when we likely have the full object
        depth += line.count('}')
        depth -= line.count('{')
        if not started and '{' in line:
            started = True
        if started and depth >= 0 and line.strip().startswith('{'):
            # We likely captured the entire trailing JSON object
            snippet = '\n'.join(reversed(buf)).strip()
            # Try to trim leading garbage before first '{'
            i = snippet.find('{')
            if i > 0:
                snippet = snippet[i:]
            return snippet
    return None


def main(argv: list[str]) -> None:
    repo_root = Path.cwd()
    in_path = Path(argv[1]) if len(argv) > 1 else (newest_baseline(repo_root / 'data' / 'evals'))
    out_path = Path(argv[2]) if len(argv) > 2 else (repo_root / 'data' / 'evals' / 'latest.json')
    if not in_path or not in_path.exists():
        print('No eval log found to parse:', in_path)
        return
    text = in_path.read_text()
    snippet = extract_summary_text(text)
    if not snippet:
        print('Failed to locate JSON summary in', in_path)
        return
    try:
        obj = json.loads(snippet)
    except Exception:
        print('Invalid JSON at tail of', in_path)
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(obj, indent=2))
    print(json.dumps(obj))


if __name__ == '__main__':
    main(sys.argv)

