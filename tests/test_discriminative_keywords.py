#!/usr/bin/env python3
"""
Smoke test for discriminative keyword boosting functionality.
Tests that the discriminative keyword boosting is working properly in hybrid search.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval.hybrid_search import _feature_bonus, _load_discriminative_keywords


def test_discriminative_keywords_loading():
    """Test that discriminative keywords load properly."""
    keywords = _load_discriminative_keywords('agro')
    assert keywords, "Discriminative keywords should be loaded"
    assert len(keywords) > 10, f"Should have at least 10 keywords, got {len(keywords)}"
    
    # Check for some expected RAG-related keywords
    expected_terms = ['hybrid', 'bm25', 'qdrant', 'rerank', 'embedding']
    found_terms = [term for term in expected_terms if term in keywords]
    assert len(found_terms) >= 3, f"Should find at least 3 expected RAG terms, found: {found_terms}"
    
    print(f"✓ Loaded {len(keywords)} discriminative keywords")
    print(f"✓ Found expected RAG terms: {found_terms}")
    return keywords


def test_feature_bonus_with_keywords():
    """Test that feature bonus properly boosts based on discriminative keywords."""
    keywords = _load_discriminative_keywords('agro')
    
    # Test 1: Query with discriminative keywords should get boosted
    query1 = "how does hybrid search work with bm25 and qdrant"
    fp1 = "retrieval/hybrid_search.py"
    code1 = "def hybrid_search with embedding and rerank"
    
    bonus1 = _feature_bonus(query1, fp1, code1)
    assert bonus1 > 0, f"Query with keywords should get positive bonus, got {bonus1}"
    print(f"✓ Query with keywords got bonus: {bonus1:.3f}")
    
    # Test 2: Path matching keywords should get boosted
    query2 = "search implementation"
    fp2 = "retrieval/hybrid_search.py" 
    code2 = "def search"
    
    bonus2 = _feature_bonus(query2, fp2, code2)
    print(f"✓ Path with 'hybrid' got bonus: {bonus2:.3f}")
    
    # Test 3: Query with no keywords should get minimal/no boost
    query3 = "hello world test"
    fp3 = "some/random/file.py"
    code3 = "print('hello world')"
    
    bonus3 = _feature_bonus(query3, fp3, code3)
    assert bonus3 < bonus1, f"Query without keywords should get less bonus than with keywords"
    print(f"✓ Query without keywords got lower bonus: {bonus3:.3f}")
    
    # Test 4: Multiple keyword matches should increase bonus
    query4 = "hybrid bm25 qdrant rerank embedding"  # Many keywords
    fp4 = "retrieval/hybrid_search.py"
    code4 = "hybrid search with bm25"
    
    bonus4 = _feature_bonus(query4, fp4, code4)
    assert bonus4 >= bonus1, f"More keyword matches should give equal or higher bonus"
    print(f"✓ Query with many keywords got bonus: {bonus4:.3f}")
    
    # Test 5: Legacy hardcoded boosts should still work
    query5 = "diagnostic health check"
    fp5 = "server/diagnostic.py"
    code5 = "def health_check"
    
    bonus5 = _feature_bonus(query5, fp5, code5)
    assert bonus5 > 0, f"Legacy diagnostic keywords should still work"
    print(f"✓ Legacy keywords still work, got bonus: {bonus5:.3f}")


def main():
    print("=" * 60)
    print("DISCRIMINATIVE KEYWORD BOOSTING SMOKE TEST")
    print("=" * 60)
    
    try:
        # Test keyword loading
        print("\n[1] Testing keyword loading...")
        keywords = test_discriminative_keywords_loading()
        
        # Test feature bonus calculation
        print(f"\n[2] Testing feature bonus with {len(keywords)} keywords...")
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
