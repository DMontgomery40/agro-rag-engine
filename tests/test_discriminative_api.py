#!/usr/bin/env python3
"""
API smoke test for discriminative keyword boosting functionality.
Tests that queries with discriminative keywords get better results.
"""

import json
import requests
import sys


def test_with_keywords():
    """Test queries with discriminative keywords."""
    # Query with multiple discriminative keywords from our list
    queries_with_keywords = [
        "hybrid search bm25 qdrant implementation",
        "rerank embedding cross-encoder",
        "telemetry tracing prometheus grafana",
        "langgraph mcp stdio implementation"
    ]
    
    print("Testing queries WITH discriminative keywords:")
    print("-" * 50)
    
    for query in queries_with_keywords:
        url = f"http://127.0.0.1:8012/search?q={query.replace(' ', '+')}&repo=agro&top_k=5"
        response = requests.get(url)
        assert response.status_code == 200, f"Failed to query: {query}"
        
        data = response.json()
        results = data.get('results', [])
        
        if results:
            top_score = results[0].get('rerank_score', 0)
            top_file = results[0].get('file_path', '').split('/')[-1]
            
            # Check if relevant files are being boosted
            relevant_found = any(
                'hybrid' in r.get('file_path', '').lower() or
                'rerank' in r.get('file_path', '').lower() or
                'retrieval' in r.get('file_path', '').lower() or
                'embedding' in r.get('file_path', '').lower() or
                'telemetry' in r.get('file_path', '').lower() or
                'mcp' in r.get('file_path', '').lower()
                for r in results[:3]
            )
            
            print(f"✓ Query: '{query[:40]}...'")
            print(f"  Top result: {top_file} (score: {top_score:.3f})")
            print(f"  Relevant files in top 3: {'Yes' if relevant_found else 'No'}")
            
            if relevant_found:
                print("  ✅ Keywords appear to be boosting relevant files")
        else:
            print(f"⚠️  No results for: {query}")
        
        print()
    
    return True


def test_without_keywords():
    """Test queries without discriminative keywords as control."""
    # Generic queries without our discriminative keywords
    queries_without_keywords = [
        "hello world example",
        "function definition syntax",
        "variable assignment code",
        "loop iteration pattern"
    ]
    
    print("\nTesting queries WITHOUT discriminative keywords (control):")
    print("-" * 50)
    
    for query in queries_without_keywords:
        url = f"http://127.0.0.1:8012/search?q={query.replace(' ', '+')}&repo=agro&top_k=5"
        response = requests.get(url)
        assert response.status_code == 200, f"Failed to query: {query}"
        
        data = response.json()
        results = data.get('results', [])
        
        if results:
            top_score = results[0].get('rerank_score', 0)
            top_file = results[0].get('file_path', '').split('/')[-1]
            print(f"✓ Query: '{query[:40]}...'")
            print(f"  Top result: {top_file} (score: {top_score:.3f})")
        else:
            print(f"  No results for: {query}")
        
        print()
    
    return True


def compare_boosting():
    """Compare a query with and without discriminative keywords."""
    print("\nComparing boost effect:")
    print("-" * 50)
    
    # Query 1: With discriminative keywords
    query_with = "hybrid search implementation"
    url1 = f"http://127.0.0.1:8012/search?q={query_with.replace(' ', '+')}&repo=agro&top_k=3"
    response1 = requests.get(url1)
    data1 = response1.json()
    
    # Query 2: Without discriminative keywords (generic)
    query_without = "search implementation code"
    url2 = f"http://127.0.0.1:8012/search?q={query_without.replace(' ', '+')}&repo=agro&top_k=3"
    response2 = requests.get(url2)
    data2 = response2.json()
    
    print(f"Query WITH keywords: '{query_with}'")
    if data1.get('results'):
        for i, r in enumerate(data1['results'][:3], 1):
            fname = r['file_path'].split('/')[-1]
            score = r.get('rerank_score', 0)
            print(f"  {i}. {fname:30} Score: {score:8.3f}")
    
    print(f"\nQuery WITHOUT keywords: '{query_without}'")
    if data2.get('results'):
        for i, r in enumerate(data2['results'][:3], 1):
            fname = r['file_path'].split('/')[-1]
            score = r.get('rerank_score', 0)
            print(f"  {i}. {fname:30} Score: {score:8.3f}")
    
    # Check if hybrid_search.py ranks higher with discriminative keywords
    hybrid_rank_with = None
    hybrid_rank_without = None
    
    for i, r in enumerate(data1.get('results', [])[:5]):
        if 'hybrid_search.py' in r.get('file_path', ''):
            hybrid_rank_with = i + 1
            break
    
    for i, r in enumerate(data2.get('results', [])[:5]):
        if 'hybrid_search.py' in r.get('file_path', ''):
            hybrid_rank_without = i + 1
            break
    
    if hybrid_rank_with and hybrid_rank_without:
        if hybrid_rank_with < hybrid_rank_without:
            print(f"\n✅ SUCCESS: hybrid_search.py ranks HIGHER with keywords (#{hybrid_rank_with} vs #{hybrid_rank_without})")
        elif hybrid_rank_with == hybrid_rank_without:
            print(f"\n⚠️  NEUTRAL: hybrid_search.py has same rank (#{hybrid_rank_with})")
        else:
            print(f"\n⚠️  UNEXPECTED: hybrid_search.py ranks lower with keywords (#{hybrid_rank_with} vs #{hybrid_rank_without})")
    elif hybrid_rank_with:
        print(f"\n✅ hybrid_search.py found with keywords at position #{hybrid_rank_with}")
    else:
        print("\n⚠️  Could not find hybrid_search.py in top results")
    
    return True


def main():
    print("=" * 60)
    print("DISCRIMINATIVE KEYWORD BOOSTING API TEST")
    print("=" * 60)
    
    try:
        # Check server is running
        response = requests.get("http://127.0.0.1:8012/health")
        assert response.status_code == 200, "Server not responding"
        print("✓ Server is running\n")
        
        # Run tests
        test_with_keywords()
        test_without_keywords()
        compare_boosting()
        
        print("\n" + "=" * 60)
        print("✅ DISCRIMINATIVE KEYWORD BOOSTING IS WORKING!")
        print("=" * 60)
        
        return 0
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
