#!/usr/bin/env python3
"""
Minimal eval loop with regression tracking.
"""
import os
import sys
import json
import time
import argparse
from typing import Dict, Any
from dotenv import load_dotenv
from .eval_rag import hit, _resolve_golden_path, USE_MULTI, FINAL_K, MULTI_M
from retrieval.hybrid_search import search_routed, search_routed_multi

load_dotenv()

# Keep in sync with UI default (ui/ALL_KNOBS.yaml) and server endpoints
BASELINE_PATH = os.getenv('BASELINE_PATH', 'data/evals/eval_baseline.json')

def run_eval_with_results() -> Dict[str, Any]:
    golden_path = _resolve_golden_path()
    if not os.path.exists(golden_path):
        return {"error": f"No golden questions file found at: {golden_path}. Create golden.json with test questions first."}
    try:
        with open(golden_path) as f:
            gold = json.load(f)
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in {golden_path}: {e}. Check file syntax."}
    except Exception as e:
        return {"error": f"Failed to read {golden_path}: {e}"}
    if not isinstance(gold, list):
        return {"error": f"golden.json must be a JSON array, got {type(gold).__name__}"}
    valid_questions = []
    for i, row in enumerate(gold):
        if not isinstance(row, dict):
            print(f"⚠ Skipping entry {i}: not a dict", file=sys.stderr)
            continue
        if 'q' not in row:
            continue
        if not row['q'].strip():
            print(f"⚠ Skipping entry {i}: empty question", file=sys.stderr)
            continue
        valid_questions.append(row)
    if not valid_questions:
        return {"error": f"No valid questions found in {golden_path}. Each question must have a 'q' field."}
    total = len(valid_questions)
    hits_top1 = 0
    hits_topk = 0
    results = []
    t0 = time.time()
    for i, row in enumerate(valid_questions, 1):
        q = row['q']
        repo = row.get('repo') or os.getenv('REPO', 'agro')
        expect = row.get('expect_paths') or []
        try:
            if USE_MULTI:
                docs = search_routed_multi(q, repo_override=repo, m=MULTI_M, final_k=FINAL_K)
            else:
                docs = search_routed(q, repo_override=repo, final_k=FINAL_K)
        except Exception as e:
            print(f"⚠ Search failed for question {i}: {e}", file=sys.stderr)
            docs = []
        paths = [d.get('file_path', '') for d in docs]
        top1_hit = hit(paths[:1], expect) if paths else False
        topk_hit = hit(paths, expect) if paths else False
        if top1_hit:
            hits_top1 += 1
        if topk_hit:
            hits_topk += 1
        results.append({
            "question": q,
            "repo": repo,
            "expect_paths": expect,
            "top1_path": paths[:1],
            "top1_hit": top1_hit,
            "topk_hit": topk_hit,
            "top_paths": paths[:FINAL_K]
        })
    dt = time.time() - t0
    return {
        "total": total,
        "top1_hits": hits_top1,
        "topk_hits": hits_topk,
        "top1_accuracy": round(hits_top1 / max(1, total), 3),
        "topk_accuracy": round(hits_topk / max(1, total), 3),
        "final_k": FINAL_K,
        "use_multi": USE_MULTI,
        "duration_secs": round(dt, 2),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "results": results
    }

def save_baseline(results: Dict[str, Any]):
    with open(BASELINE_PATH, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"✓ Baseline saved to {BASELINE_PATH}")
