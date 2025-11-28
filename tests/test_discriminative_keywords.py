#!/usr/bin/env python3
"""
Smoke test for discriminative keyword boosting functionality.
Tests that the discriminative keyword boosting is working properly in hybrid search.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval.hybrid_search import get_keyword_boost, load_discriminative_keywords


def test_discriminative_keywords_loading():
    """Test that discriminative keywords load properly."""
    keywords = load_discriminative_keywords('agro')
    assert keywords, "Discriminative keywords should be loaded"
    assert len(keywords) > 10, f"Should have at least 10 keywords, got {len(keywords)}"

    # Check for some expected RAG-related keywords
    expected_terms = ['hybrid', 'bm25', 'qdrant', 'rerank', 'embedding']
    found_terms = [term for term in expected_terms if term in keywords]
    assert len(found_terms) >= 3, f"Should find at least 3 expected RAG terms, found: {found_terms}"

    print(f"✓ Loaded {len(keywords)} discriminative keywords")
    print(f"✓ Found expected RAG terms: {found_terms}")


def test_feature_bonus_with_keywords():
    """Test that keyword boost properly boosts based on discriminative keywords."""
    keywords = load_discriminative_keywords('agro')

    # Test 1: Query with discriminative keywords should get boosted
    query1 = "how does hybrid search work with bm25 and qdrant"
    fp1 = "retrieval/hybrid_search.py"
    code1 = "def hybrid_search with embedding and rerank"

    boost1 = get_keyword_boost(query1, fp1, code1, 'agro')
    assert boost1 > 1.0, f"Query with keywords should get boost > 1.0, got {boost1}"
    print(f"✓ Query with keywords got boost: {boost1:.3f}")

    # Test 2: Path matching keywords should get boosted
    query2 = "search implementation"
    fp2 = "retrieval/hybrid_search.py"
    code2 = "def search"

    boost2 = get_keyword_boost(query2, fp2, code2, 'agro')
    print(f"✓ Path with 'hybrid' got boost: {boost2:.3f}")

    # Test 3: Query with no keywords should get no boost (1.0)
    query3 = "hello world test"
    fp3 = "some/random/file.py"
    code3 = "print('hello world')"

    boost3 = get_keyword_boost(query3, fp3, code3, 'agro')
    assert boost3 <= boost1, f"Query without keywords should get less/equal boost than with keywords"
    print(f"✓ Query without keywords got boost: {boost3:.3f}")

    # Test 4: Multiple keyword matches should increase boost
    query4 = "hybrid bm25 qdrant rerank embedding"  # Many keywords
    fp4 = "retrieval/hybrid_search.py"
    code4 = "hybrid search with bm25"

    boost4 = get_keyword_boost(query4, fp4, code4, 'agro')
    assert boost4 >= boost1, f"More keyword matches should give equal or higher boost"
    print(f"✓ Query with many keywords got boost: {boost4:.3f}")

    # Test 5: No keywords in any field should return 1.0 (no boost)
    query5 = "random unrelated query"
    fp5 = "some/other/file.py"
    code5 = "def some_function"

    boost5 = get_keyword_boost(query5, fp5, code5, 'agro')
    assert boost5 == 1.0, f"No keyword matches should return 1.0 (no boost), got {boost5}"
    print(f"✓ No keywords returns 1.0, got boost: {boost5:.3f}")


def main():
    print("=" * 60)
    print("DISCRIMINATIVE KEYWORD BOOSTING SMOKE TEST")
    print("=" * 60)
    
    try:
        # Test keyword loading
        print("\n[1] Testing keyword loading...")
        test_discriminative_keywords_loading()

        # Test feature bonus calculation
        print(f"\n[2] Testing feature bonus...")
        test_feature_bonus_with_keywords()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        
        return 0
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
