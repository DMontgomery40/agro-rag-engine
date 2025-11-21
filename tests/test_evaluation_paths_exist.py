#!/usr/bin/env python3
"""Evaluation dataset integrity test.

Verifies that all expect_paths referenced in data/evaluation_dataset.json exist in the repo.
This acts as a fast smoke test when updating the evaluation dataset.
"""
import json
import os
from pathlib import Path


def test_evaluation_expect_paths_exist():
    repo_root = Path(__file__).resolve().parents[1]
    dataset_path = repo_root / 'data' / 'evaluation_dataset.json'
    assert dataset_path.exists(), f"Missing evaluation dataset file: {dataset_path}"
    data = json.loads(dataset_path.read_text())

    failures = []
    for idx, row in enumerate(data):
        if not isinstance(row, dict) or 'q' not in row:
            continue
        paths = row.get('expect_paths') or []
        # Consider the entry valid if at least one expected path exists
        exists_any = False
        missing = []
        for p in paths:
            target = (repo_root / p).resolve() if not p.endswith('/') else (repo_root / p[:-1]).resolve()
            if target.exists():
                exists_any = True
            else:
                missing.append(p)
        if not exists_any:
            failures.append((row.get('q', f'idx={idx}'), ', '.join(missing)))

    assert not failures, (
        "Some expect_paths do not exist. Please update data/evaluation_dataset.json or paths.\n" +
        "\n".join([f"- {q}: {p}" for q, p in failures])
    )
