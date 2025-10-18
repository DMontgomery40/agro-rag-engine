#!/usr/bin/env python3
"""
Enterprise Compatibility Watchdog (stub)

- Reads compat_rules.json and prints a summary
- Intended to be extended with collectors (GitHub issues, release notes) and emit rules/alerts
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RULES = ROOT / "compat_rules.json"


def main() -> int:
    if RULES.exists():
        try:
            data = json.loads(RULES.read_text())
        except Exception:
            data = []
    else:
        data = []
    print(f"[watchdog] Loaded {len(data)} compat rule(s) from {RULES}")
    for i, r in enumerate(data[:10], start=1):
        print(f"  {i}. {r.get('id')} — {r.get('message')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

