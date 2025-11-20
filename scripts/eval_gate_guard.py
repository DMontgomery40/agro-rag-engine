#!/usr/bin/env python3
import sys
import json
import re

"""
Usage:
  python scripts/eval_gate_guard.py <answers.jsonl>

Where each line is a JSON object containing:
  {"q": "...", "repo": "project", "answer": "..."}
This fails if the answer lacks a [repo: ...] header or no file path-like citation.
"""

HEADER_RE = re.compile(r"^\[repo:\s*(project|project)\]", re.I | re.M)
PATH_RE = re.compile(r"[A-Za-z0-9_\-./]+?\.[A-Za-z0-9_]+:\d+-\d+")


def ok(answer: str) -> bool:
    if not HEADER_RE.search(answer or ""):
        return False
    if not PATH_RE.search(answer or ""):
        return False
    return True


def main():
    if len(sys.argv) < 2:
        print("usage: python scripts/eval_gate_guard.py <answers.jsonl>")
        sys.exit(2)
    bad = 0
    with open(sys.argv[1], "r", errors="ignore") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                print(f"line {i}: not json")
                bad += 1
                continue
            ans = obj.get("answer", "")
            if not ok(ans):
                print(f"line {i}: FAIL (missing repo header or file citation)")
                bad += 1
    if bad:
        print(f"\u274c guard failed: {bad} bad answer(s)")
        sys.exit(3)
    print("\u2713 guard passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
