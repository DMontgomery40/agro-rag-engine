#!/usr/bin/env python3
"""
Comprehensive RAG system debugging and issue detection.
Identifies problems with:
- Duplicate results
- Scoring inconsistencies
- Negative scores
- Missing hydration
- Performance issues
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from retrieval.hybrid_search import search_routed_multi


def test_duplicate_detection():
    """Detect if same chunks are appearing multiple times in results."""
    print("\n" + "="*70)
    print("[TEST 1] Duplicate Detection")
    print("="*70)

    queries = [
        "hybrid search implementation",
        "rerank cross-encoder",
        "how does qdrant work",
    ]

    issues = []
    for query in queries:
        print(f"\nTesting: '{query}'")
        results = search_routed_multi(query, repo_override="agro", final_k=10)

        # Check for duplicates by (file_path, start_line, end_line)
        seen = {}
        duplicates = []
        for r in results:
            key = (r.get('file_path'), r.get('start_line'), r.get('end_line'))
            if key in seen:
                duplicates.append({
                    'key': key,
                    'scores': [seen[key]['rerank_score'], r['rerank_score']],
                    'count': 2
                })
            seen[key] = r

        if duplicates:
            print(f"  ❌ Found {len(duplicates)} duplicate chunks!")
            for dup in duplicates[:3]:  # Show first 3
                print(f"     {dup['key'][0].split('/')[-1]} (scores: {dup['scores']})")
            issues.append(('duplicates', query, len(duplicates)))
        else:
            print(f"  ✓ No duplicates found")

    return issues


def test_scoring_consistency():
    """Check if same query returns consistent scores."""
    print("\n" + "="*70)
    print("[TEST 2] Scoring Consistency")
    print("="*70)

    query = "vector search embedding"
    issues = []

    print(f"\nRunning same query 3 times: '{query}'")
    scores_list = []
    for i in range(3):
        results = search_routed_multi(query, repo_override="agro", final_k=5)
        scores = [r.get('rerank_score', 0) for r in results]
        scores_list.append(scores)
        print(f"  Run {i+1}: {[round(s, 3) for s in scores]}")

    # Check if scores are consistent
    if scores_list[0] != scores_list[1] or scores_list[1] != scores_list[2]:
        print(f"  ⚠️  Scores are inconsistent across runs!")
        issues.append(('scoring_inconsistency', query))
    else:
        print(f"  ✓ Scores are consistent")

    return issues


def test_negative_scores():
    """Detect negative rerank scores which may indicate issues."""
    print("\n" + "="*70)
    print("[TEST 3] Negative Score Detection")
    print("="*70)

    queries = [
        "hybrid search",
        "reranking algorithm",
        "vector database",
    ]

    issues = []
    for query in queries:
        print(f"\nTesting: '{query}'")
        results = search_routed_multi(query, repo_override="agro", final_k=10)

        negative_scores = [r for r in results if r.get('rerank_score', 0) < 0]
        if negative_scores:
            print(f"  ⚠️  Found {len(negative_scores)} negative scores!")
            for r in negative_scores[:3]:
                fname = r.get('file_path', '').split('/')[-1]
                score = r.get('rerank_score', 0)
                print(f"     {fname}: {score:.3f}")
            issues.append(('negative_scores', query, len(negative_scores)))
        else:
            print(f"  ✓ All scores are non-negative")

    return issues


def test_hydration():
    """Check if code snippets are properly hydrated."""
    print("\n" + "="*70)
    print("[TEST 4] Hydration Check")
    print("="*70)

    query = "how does the search function work"
    results = search_routed_multi(query, repo_override="agro", final_k=5)

    issues = []
    missing_code = 0
    for r in results:
        if not r.get('code'):
            missing_code += 1

    if missing_code > 0:
        print(f"  ⚠️  {missing_code}/{len(results)} results missing code!")
        issues.append(('missing_code', missing_code))
    else:
        print(f"  ✓ All results have code snippets")

    # Also check code length
    for r in results[:3]:
        code_len = len(r.get('code', ''))
        fname = r.get('file_path', '').split('/')[-1]
        print(f"     {fname}: {code_len} chars")

    return issues


def test_score_distribution():
    """Check the distribution of scores to detect anomalies."""
    print("\n" + "="*70)
    print("[TEST 5] Score Distribution")
    print("="*70)

    query = "implementation details"
    results = search_routed_multi(query, repo_override="agro", final_k=10)

    scores = [r.get('rerank_score', 0) for r in results]
    if not scores:
        print("  ❌ No results returned!")
        return [('no_results', query)]

    # Print score stats
    min_score = min(scores)
    max_score = max(scores)
    avg_score = sum(scores) / len(scores)

    print(f"\nScore statistics for top-10 results:")
    print(f"  Min: {min_score:.3f}")
    print(f"  Max: {max_score:.3f}")
    print(f"  Avg: {avg_score:.3f}")
    print(f"  Range: {max_score - min_score:.3f}")

    # Check for monotonic decrease (expected behavior)
    is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
    if is_sorted:
        print(f"  ✓ Scores are properly sorted (decreasing)")
    else:
        print(f"  ❌ Scores are NOT properly sorted!")
        return [('not_sorted', query)]

    # Check for clustering (all scores the same)
    if max_score - min_score < 0.001:
        print(f"  ⚠️  All scores are nearly identical (clustering detected)")
        return [('score_clustering', query)]
    else:
        print(f"  ✓ Good score differentiation")

    return []


def test_api_consistency():
    """Check if API returns consistent results with internal function."""
    print("\n" + "="*70)
    print("[TEST 6] API vs Internal Function Consistency")
    print("="*70)

    query = "search implementation"

    # Get results from internal function
    internal_results = search_routed_multi(query, repo_override="agro", final_k=5)
    internal_files = [r.get('file_path') for r in internal_results]

    # Get results from API
    try:
        api_url = f"http://127.0.0.1:8012/search?q={query.replace(' ', '+')}&repo=agro&top_k=5"
        api_response = requests.get(api_url)
        api_results = api_response.json().get('results', [])
        api_files = [r.get('file_path') for r in api_results]

        if internal_files == api_files:
            print(f"  ✓ API and internal function return same results")
            return []
        else:
            print(f"  ⚠️  Results differ between API and internal function!")
            print(f"     Internal: {[f.split('/')[-1] for f in internal_files[:3]]}")
            print(f"     API:      {[f.split('/')[-1] for f in api_files[:3]]}")
            return [('api_inconsistency', query)]
    except Exception as e:
        print(f"  ⚠️  Could not test API: {e}")
        return []


def main():
    print("\n" + "="*70)
    print("RAG SYSTEM COMPREHENSIVE DEBUG TEST")
    print("="*70)

    all_issues = []

    try:
        # Run all tests
        all_issues.extend(test_duplicate_detection())
        all_issues.extend(test_scoring_consistency())
        all_issues.extend(test_negative_scores())
        all_issues.extend(test_hydration())
        all_issues.extend(test_score_distribution())
        all_issues.extend(test_api_consistency())

        # Summary
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)

        if all_issues:
            print(f"\n❌ Found {len(all_issues)} issues:")
            for issue in all_issues:
                print(f"   - {issue[0]}: {issue[1] if len(issue) > 1 else ''}")
            return 1
        else:
            print("\n✅ No issues detected in RAG system")
            return 0

    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
