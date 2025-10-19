#!/usr/bin/env python3
"""Filter noisy keywords from generated keyword files.

Reads discriminative_keywords.json, semantic_keywords.json, and llm_keywords.json
from repo root and writes filtered versions in place.

Heuristics:
- Drop generic test/infra/UI terms (e.g., 'test', 'playwright', 'spec', 'health', 'css', 'html', 'style')
- Drop very short tokens (<3 chars) and purely numeric tokens
- For semantic keywords (objects), keep only entries with 'term' key

This script is conservative and only removes known noisy terms.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, List, Dict

ROOT = Path(os.getcwd())

NOISY_PATTERNS = [
    r"^test(s)?$",
    r"^spec(s)?$",
    r"^playwright$",
    r"^health$",
    r"^debug(py)?$",
    r"^chrome$",
    r"^desktop$",
    r"^btn$",
    r"^div$",
    r"^css$",
    r"^html$",
    r"^style(s)?$",
]

NOISY_RE = [re.compile(p) for p in NOISY_PATTERNS]


def _is_noise(term: str) -> bool:
    t = (term or "").strip().lower()
    if len(t) < 3:
        return True
    if t.isdigit():
        return True
    for rx in NOISY_RE:
        if rx.match(t):
            return True
    return False


def _filter_list_terms(repo_terms: List[str]) -> List[str]:
    out = []
    seen = set()
    for term in repo_terms:
        t = (term or "").strip()
        if not t or _is_noise(t):
            continue
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out[:60]


def _filter_semantic(repo_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    seen = set()
    for item in repo_items:
        term = (item.get("term") or "").strip()
        if not term or _is_noise(term):
            continue
        if term in seen:
            continue
        seen.add(term)
        out.append(item)
    return out[:60]


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def save_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2))


def main() -> None:
    # discriminative_keywords.json
    disc_p = ROOT / "discriminative_keywords.json"
    disc = load_json(disc_p)
    if isinstance(disc, dict):
        key = next(iter(disc.keys()), None)
        if key and isinstance(disc[key], list):
            disc[key] = _filter_list_terms([str(x) for x in disc[key]])
            save_json(disc_p, disc)

    # semantic_keywords.json
    sem_p = ROOT / "semantic_keywords.json"
    sem = load_json(sem_p)
    if isinstance(sem, dict):
        key = next(iter(sem.keys()), None)
        if key and isinstance(sem[key], list):
            sem[key] = _filter_semantic([x for x in sem[key] if isinstance(x, dict)])
            save_json(sem_p, sem)

    # llm_keywords.json (only sanitize very short/numeric)
    llm_p = ROOT / "llm_keywords.json"
    llm = load_json(llm_p)
    if isinstance(llm, dict):
        key = next(iter(llm.keys()), None)
        if key and isinstance(llm[key], list):
            llm[key] = [s for s in llm[key] if isinstance(s, str) and not _is_noise(s)]
            save_json(llm_p, llm)

    print("✓ Filtered keyword files:")
    for p in (disc_p, sem_p, llm_p):
        print(" -", p)


if __name__ == "__main__":
    main()

