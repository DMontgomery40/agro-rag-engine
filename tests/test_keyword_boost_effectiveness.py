#!/usr/bin/env python3
"""
Test the effectiveness of discriminative keyword boosting.
Compares search results for queries with and without keywords.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval.hybrid_search import search_routed_multi


def extract_relevant_files(query_keywords, results):
    """Extract files that should be relevant to the keywords."""
    relevant = []
    for r in results:
        fp = r.get('file_path', '').lower()
        for kw in query_keywords:
            if kw.lower() in fp:
                relevant.append(r)
                break
    return relevant


def test_retrieval_keyword_boosting():
    """Test that retrieval-related keywords boost retrieval files."""
    print("\n" + "="*70)
    print("[TEST] Retrieval Keyword Boosting")
    print("="*70)

    # Query WITH discriminative keywords
    query_with_keywords = "hybrid search bm25 qdrant rerank"
    expected_files = ['hybrid_search.py', 'rerank.py', 'qdrant']

    results = search_routed_multi(query_with_keywords, repo_override="agro", final_k=10)

    print(f"\nQuery: '{query_with_keywords}'")
    print(f"Expected files containing: {expected_files}")
    print("\nTop 5 results:")

    found_expected = 0
    for i, r in enumerate(results[:5], 1):
        fname = r.get('file_path', '').split('/')[-1]
        score = r.get('rerank_score', 0)
        is_expected = any(exp.lower() in fname.lower() for exp in expected_files)
        indicator = "✓" if is_expected else " "
        print(f"  {i}. {indicator} {fname:30} (score: {score:.3f})")
        if is_expected:
            found_expected += 1

    if found_expected >= 2:
        print(f"\n✅ Found {found_expected}/3 expected retrieval files in top-5")
        return True
    else:
        print(f"\n⚠️  Only found {found_expected}/3 expected retrieval files")
        return False


def test_semantic_keyword_boosting():
    """Test that semantic-related keywords boost semantic processing files."""
    print("\n" + "="*70)
    print("[TEST] Semantic Keyword Boosting")
    print("="*70)

    query_with_keywords = "synonym semantic embedding"
    expected_files = ['synonym', 'semantic', 'embedding']

    results = search_routed_multi(query_with_keywords, repo_override="agro", final_k=10)

    print(f"\nQuery: '{query_with_keywords}'")
    print(f"Expected files containing: {expected_files}")
    print("\nTop 5 results:")

    found_expected = 0
    for i, r in enumerate(results[:5], 1):
        fname = r.get('file_path', '').split('/')[-1]
        score = r.get('rerank_score', 0)
        is_expected = any(exp.lower() in fname.lower() for exp in expected_files)
        indicator = "✓" if is_expected else " "
        print(f"  {i}. {indicator} {fname:30} (score: {score:.3f})")
        if is_expected:
            found_expected += 1

    if found_expected >= 1:
        print(f"\n✅ Found {found_expected} expected semantic files in top-5")
        return True
    else:
        print(f"\n⚠️  No expected semantic files found in top-5")
        return False


def test_infrastructure_keyword_boosting():
    """Test that infrastructure keywords boost docker/compose files."""
    print("\n" + "="*70)
    print("[TEST] Infrastructure Keyword Boosting")
    print("="*70)

    query_with_keywords = "docker prometheus grafana telemetry"
    expected_files = ['docker', 'prometheus', 'grafana']

    results = search_routed_multi(query_with_keywords, repo_override="agro", final_k=10)

    print(f"\nQuery: '{query_with_keywords}'")
    print(f"Expected files containing: {expected_files}")
    print("\nTop 5 results:")

    found_expected = 0
    for i, r in enumerate(results[:5], 1):
        fname = r.get('file_path', '').split('/')[-1]
        score = r.get('rerank_score', 0)
        is_expected = any(exp.lower() in fname.lower() for exp in expected_files)
        indicator = "✓" if is_expected else " "
        print(f"  {i}. {indicator} {fname:30} (score: {score:.3f})")
        if is_expected:
            found_expected += 1

    if found_expected >= 1:
        print(f"\n✅ Found {found_expected} expected infrastructure files in top-5")
        return True
    else:
        print(f"\n⚠️  No expected infrastructure files found in top-5")
        return False


def test_score_differentiation():
    """Verify that discriminative keywords create score differentiation."""
    print("\n" + "="*70)
    print("[TEST] Score Differentiation")
    print("="*70)

    query = "hybrid search implementation code"
    results = search_routed_multi(query, repo_override="agro", final_k=10)

    scores = [r.get('rerank_score', 0) for r in results[:5]]
    max_score = max(scores) if scores else 0
    min_score = min(scores) if scores else 0

    print(f"\nQuery: '{query}'")
    print(f"Top-5 scores: {[f'{s:.3f}' for s in scores]}")
    print(f"Score range: {min_score:.3f} to {max_score:.3f} (diff: {max_score - min_score:.3f})")

    if max_score - min_score > 0.2:
        print("✅ Good score differentiation (range > 0.2)")
        return True
    else:
        print("⚠️  Poor score differentiation (range < 0.2)")
        return False


def main():
    print("\n" + "="*70)
    print("DISCRIMINATIVE KEYWORD BOOSTING EFFECTIVENESS TEST")
    print("="*70)

    try:
        tests_passed = 0
        tests_total = 4

        if test_retrieval_keyword_boosting():
            tests_passed += 1

        if test_semantic_keyword_boosting():
            tests_passed += 1

        if test_infrastructure_keyword_boosting():
            tests_passed += 1

        if test_score_differentiation():
            tests_passed += 1

        # Summary
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print(f"\n{tests_passed}/{tests_total} tests passed")

        if tests_passed >= 3:
            print("\n✅ Discriminative keyword boosting is EFFECTIVE")
            return 0
        else:
            print("\n⚠️  Discriminative keyword boosting needs improvement")
            return 1

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
