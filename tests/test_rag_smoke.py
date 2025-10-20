#!/usr/bin/env python3
"""
Smoke test for RAG search functionality.
Run with: python tests/test_rag_smoke.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval.hybrid_search import search_routed_multi

def test_basic_search():
    """Test that basic search returns results."""
    print("Testing basic search...")
    results = search_routed_multi("hybrid search implementation", repo_override="agro", final_k=5)
    assert len(results) > 0, "Search returned no results"
    assert results[0].get('file_path'), "First result has no file_path"
    assert results[0].get('rerank_score') is not None, "First result has no rerank_score"
    print(f"✓ Basic search returned {len(results)} results")
    return True

def test_discriminative_boosting():
    """Test that discriminative keywords boost relevant files."""
    print("Testing discriminative keyword boosting...")
    results = search_routed_multi("discriminative keywords", repo_override="agro", final_k=5)
    assert len(results) > 0, "Search returned no results"
    
    # Check if hybrid_search.py is in top results (it has the discriminative keyword logic)
    top_files = [r.get('file_path', '').split('/')[-1] for r in results[:3]]
    assert 'hybrid_search.py' in top_files, f"hybrid_search.py not in top 3 results: {top_files}"
    print(f"✓ Discriminative boosting working (hybrid_search.py in top results)")
    return True

def test_code_vs_docs_prioritization():
    """Test that code files are prioritized for implementation queries."""
    print("Testing code vs docs prioritization...")
    results = search_routed_multi("where is the rerank function implementation", repo_override="agro", final_k=5)
    assert len(results) > 0, "Search returned no results"
    
    # Check that Python files come before markdown
    first_result = results[0]
    lang = first_result.get('language', '').lower()
    assert lang in ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'cpp', 'c'], \
        f"First result is not code, it's: {lang}"
    print(f"✓ Code prioritization working (first result is {lang} code)")
    return True

def test_query_expansion():
    """Test that query expansion works."""
    print("Testing query expansion...")
    from retrieval.hybrid_search import expand_queries
    
    variants = expand_queries("fix bug in search", m=3)
    assert len(variants) >= 1, "Query expansion returned no variants"
    assert variants[0], "First variant is empty"
    print(f"✓ Query expansion generated {len(variants)} variants")
    return True

def test_repo_routing():
    """Test that repo routing works."""
    print("Testing repo routing...")
    from retrieval.hybrid_search import route_repo
    
    # Should route to 'agro' for agro-specific query
    repo = route_repo("agro: how does search work")
    assert repo == "agro", f"Failed to route to agro repo, got: {repo}"
    
    # Should use default for generic query
    repo = route_repo("search implementation")
    assert repo in ["agro", "project"], f"Unexpected repo routing: {repo}"
    print(f"✓ Repo routing working")
    return True

def main():
    """Run all smoke tests."""
    print("\n" + "="*60)
    print("RAG SMOKE TESTS")
    print("="*60 + "\n")
    
    tests = [
        test_basic_search,
        test_discriminative_boosting,
        test_code_vs_docs_prioritization,
        test_query_expansion,
        test_repo_routing
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} error: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
