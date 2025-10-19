#!/usr/bin/env python3
"""Compare local vs Cohere reranker performance."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Clear modules
for mod in list(sys.modules.keys()):
    if 'retrieval' in mod:
        del sys.modules[mod]

test_queries = [
    ("Where is the Qdrant vector database integration code?", "qdrant_utils.py"),
    ("Where is hybrid search?", "hybrid_search.py"),
    ("Where is the feedback collection system?", "feedback.py"),
]

print("\n" + "="*80)
print("LOCAL vs COHERE RERANKER COMPARISON")
print("="*80)

for query, expected in test_queries:
    print(f"\nQuery: {query}")
    print(f"Expected: {expected}\n")
    
    # Test local
    os.environ['RERANK_BACKEND'] = 'local'
    from retrieval.hybrid_search import search_routed_multi
    results_local = search_routed_multi(query, repo_override="agro", m=4, final_k=5)
    
    # Clear and test Cohere
    for mod in list(sys.modules.keys()):
        if 'retrieval' in mod:
            del sys.modules[mod]
    os.environ['RERANK_BACKEND'] = 'cohere'
    from retrieval.hybrid_search import search_routed_multi as search_multi_cohere
    results_cohere = search_multi_cohere(query, repo_override="agro", m=4, final_k=5)
    
    # Compare
    local_hit = any(expected in r['file_path'] for r in results_local[:1])
    cohere_hit = any(expected in r['file_path'] for r in results_cohere[:1])
    
    print(f"LOCAL:  {'✅ HIT' if local_hit else '❌ MISS'} - #{1 if local_hit else 'not in top-1'}")
    if results_local:
        print(f"        Top-1: {results_local[0]['file_path'].split('/')[-1]}")
    
    print(f"COHERE: {'✅ HIT' if cohere_hit else '❌ MISS'} - #{1 if cohere_hit else 'not in top-1'}")
    if results_cohere:
        print(f"        Top-1: {results_cohere[0]['file_path'].split('/')[-1]}")
    
    print()

