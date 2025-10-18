#!/usr/bin/env python3
"""Analyze which golden questions are failing and why."""
import sys
import json
import os

sys.path.insert(0, '.')
os.environ['RERANK_BACKEND'] = 'cohere'

from retrieval.hybrid_search import search_routed_multi

with open('data/golden.json') as f:
    questions = [q for q in json.load(f) if 'q' in q]

print("="*80)
print("ANALYZING TOP-1 FAILURES")
print("="*80)

failures = []

for i, item in enumerate(questions, 1):
    q = item['q']
    expect = item['expect_paths']
    
    results = search_routed_multi(q, repo_override="agro", m=10, final_k=5)
    
    if not results:
        continue
    
    top1_file = results[0]['file_path']
    is_hit = any(exp in top1_file for exp in expect)
    
    if not is_hit:
        failures.append({
            'num': i,
            'query': q,
            'expected': expect[0] if expect else 'N/A',
            'got': top1_file.split('/')[-1],
            'got_full': top1_file
        })

print(f"\nTotal failures: {len(failures)}/{len(questions)}")
print(f"Success rate: {100*(len(questions)-len(failures))//len(questions)}%\n")

print("\nFAILURE ANALYSIS:\n")
for f in failures:
    print(f"[{f['num']}] {f['query'][:70]}")
    print(f"    Expected: {f['expected']}")
    print(f"    Got:      {f['got']}")
    print()

