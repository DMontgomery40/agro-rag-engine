#!/usr/bin/env python3
"""
Scan root-level Python (.py) and JSON (.json) files to determine whether they
are referenced anywhere in the repository. Produces a report of references and
flags likely-orphan files that can be moved into existing folders (e.g., scripts/ or data/).

Notes
- This script does NOT move or delete files. It only reports.
- It searches internal references only (imports, mentions, exec calls). External
  usage outside the repo will not be visible and may produce false "orphans".
- Excludes common noise directories: .git, .venv, node_modules, out, models, data (deep), __pycache__, repo-mirror.

Usage
  python scripts/scan_root_orphans.py --write reports/orphan_root_files.json
"""

from __future__ import annotations
import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]

EXCLUDE_DIRS = {
    '.git', '.venv', 'node_modules', 'out', 'out.noindex-shared', 'models',
    '__pycache__', 'repo-mirror'
}

def is_excluded(path: Path) -> bool:
    parts = set(path.parts)
    return any(p in EXCLUDE_DIRS for p in parts)

def iter_repo_files() -> List[Path]:
    files: List[Path] = []
    for root, dirs, fns in os.walk(REPO_ROOT):
        # prune excluded dirs in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fn in fns:
            p = Path(root) / fn
            # Skip binary-like large assets
            if p.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz'}:
                continue
            files.append(p)
    return files

def collect_root_targets() -> List[Path]:
    targets: List[Path] = []
    for p in REPO_ROOT.iterdir():
        if not p.is_file():
            continue
        if p.name.startswith('.'):
            continue
        if p.suffix.lower() in {'.py', '.json'}:
            targets.append(p)
    return sorted(targets)

def find_references(target: Path, repo_files: List[Path]) -> Dict[str, List[Dict[str, str]]]:
    refs: Dict[str, List[Dict[str, str]]] = {
        'imports': [],
        'mentions': [],
        'execs': [],
    }
    name = target.name
    stem = target.stem  # module name for .py

    # Build simple regexes
    import_patterns = []
    exec_patterns = []
    mention_patterns = []

    if target.suffix == '.py':
        # import foo | from foo import ... | python foo.py | python3 foo.py
        import_patterns = [
            re.compile(rf"\bimport\s+{re.escape(stem)}(\b|\.)"),
            re.compile(rf"\bfrom\s+{re.escape(stem)}\b"),
        ]
        exec_patterns = [
            re.compile(rf"\bpython3?\s+{re.escape(name)}\b"),
            re.compile(rf"\b{re.escape(str(target))}\b"),
        ]
        mention_patterns = [
            re.compile(rf"\b{re.escape(name)}\b"),
        ]
    elif target.suffix == '.json':
        mention_patterns = [
            re.compile(rf"\b{re.escape(name)}\b"),
        ]

    for p in repo_files:
        # skip the target itself
        if p == target:
            continue
        try:
            text = p.read_text(errors='ignore')
        except Exception:
            continue
        # imports
        for pat in import_patterns:
            if pat.search(text):
                refs['imports'].append({'file': str(p.relative_to(REPO_ROOT))})
                break
        # execs
        for pat in exec_patterns:
            if pat.search(text):
                refs['execs'].append({'file': str(p.relative_to(REPO_ROOT))})
                break
        # mentions
        for pat in mention_patterns:
            if pat.search(text):
                refs['mentions'].append({'file': str(p.relative_to(REPO_ROOT))})
                break

    return refs

def suggest_folder(target: Path) -> str:
    if target.suffix == '.py':
        return 'scripts/'
    if target.suffix == '.json':
        # config-like jsons prefer data/ if not code-owned
        return 'data/'
    return ''

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', default=str(REPO_ROOT / 'reports' / 'orphan_root_files.json'),
                    help='Write JSON report to this path (default: reports/orphan_root_files.json)')
    args = ap.parse_args()

    repo_files = iter_repo_files()
    targets = collect_root_targets()

    rows = []
    for t in targets:
        refs = find_references(t, repo_files)
        total_refs = sum(len(v) for v in refs.values())
        rows.append({
            'file': str(t.relative_to(REPO_ROOT)),
            'type': t.suffix.lstrip('.'),
            'references': refs,
            'total_references': total_refs,
            'likely_orphan': total_refs == 0,
            'suggested_folder': suggest_folder(t),
        })

    out_path = Path(args.write)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({'root_files': rows}, indent=2))

    # Also print a concise summary
    print('Root files scan:')
    for r in rows:
        mark = 'ORPHAN' if r['likely_orphan'] else 'USED'
        print(f"- {r['file']:40} {mark:6} refs={r['total_references']}")
        if r['likely_orphan'] and r['suggested_folder']:
            print(f"  → suggest: move to {r['suggested_folder']}")

if __name__ == '__main__':
    main()

