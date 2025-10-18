#!/usr/bin/env python3
"""Grid search to find optimal RAG parameters using golden questions.

Tests different combinations of RRF divisor, top-k values, and scoring weights.
"""
import sys
import json
import os
from pathlib import Path
from itertools import product

sys.path.insert(0, str(Path(__file__).parent.parent))

from retrieval.hybrid_search import search_routed_multi

GOLDEN = Path("data/golden.json")

def evaluate(questions, **params):
    """Run eval with specific parameters."""
    # Set env vars for this run
    for k, v in params.items():
        os.environ[k.upper()] = str(v)
    
    hits = 0
    for item in questions:
        q = item['q']
        expect = item['expect_paths']
        
        results = search_routed_multi(q, repo_override="agro", m=4, final_k=5)
        
        if results and any(any(exp in r['file_path'] for r in results[:1]) for exp in expect):
            hits += 1
    
    return hits / len(questions)

def main():
    with GOLDEN.open() as f:
        questions = [q for q in json.load(f) if 'q' in q]
    
    print(f"🔬 GRID SEARCH - Tuning RAG parameters")
    print(f"   {len(questions)} golden questions")
    print(f"   Testing parameter combinations...\n")
    
    # Parameter grid
    grid = {
        'topk_dense': [50, 75, 100],
        'topk_sparse': [50, 75, 100],
        # Add more params as needed
    }
    
    results = []
    
    # Baseline
    print("📊 Testing baseline...")
    baseline = evaluate(questions)
    print(f"   Baseline top-1: {baseline:.1%}\n")
    
    # Grid search
    keys = list(grid.keys())
    for values in product(*[grid[k] for k in keys]):
        params = dict(zip(keys, values))
        
        print(f"Testing: {params}")
        score = evaluate(questions, **params)
        print(f"  → Top-1: {score:.1%}")
        
        results.append({
            'params': params,
            'score': score
        })
    
    # Best config
    best = max(results, key=lambda x: x['score'])
    print(f"\n🏆 BEST CONFIGURATION:")
    print(f"   Params: {best['params']}")
    print(f"   Top-1: {best['score']:.1%}")
    print(f"   Improvement: +{(best['score'] - baseline):.1%}")

if __name__ == "__main__":
    main()

