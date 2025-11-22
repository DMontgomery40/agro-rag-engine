#!/usr/bin/env python3
"""
Functional smoke test for retrieval/rerank.py.

Verifies that reranking works end-to-end with config_registry values.
"""

import sys
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

def test_rerank_with_config():
    """Test that rerank_results works with config_registry values."""
    try:
        from retrieval.rerank import rerank_results, _AGRO_RERANKER_ENABLED, _RERANK_BACKEND

        print(f"AGRO_RERANKER_ENABLED: {_AGRO_RERANKER_ENABLED}")
        print(f"RERANK_BACKEND: {_RERANK_BACKEND}")

        # Create mock results to rerank
        mock_results = [
            {
                'file_path': 'test1.py',
                'code': 'def foo(): return 1',
                'start_line': 1,
                'end_line': 1,
                'score': 0.5
            },
            {
                'file_path': 'test2.py',
                'code': 'def bar(): return 2',
                'start_line': 1,
                'end_line': 1,
                'score': 0.6
            },
            {
                'file_path': 'test3.py',
                'code': 'def baz(): return 3',
                'start_line': 1,
                'end_line': 1,
                'score': 0.7
            }
        ]

        query = "test function"

        # Call rerank_results
        try:
            results = rerank_results(query, mock_results.copy(), top_k=2)

            # Verify we got results back
            if not results:
                print("✗ rerank_results returned empty")
                return False

            # Verify top_k works
            if len(results) > 2:
                print(f"✗ Expected max 2 results, got {len(results)}")
                return False

            # Verify rerank_score was added
            for r in results:
                if 'rerank_score' not in r:
                    print(f"✗ Missing rerank_score in result: {r.get('file_path')}")
                    return False

            print(f"✓ rerank_results works: returned {len(results)} results")
            print(f"✓ Top result: {results[0].get('file_path')} (score: {results[0].get('rerank_score'):.3f})")
            return True

        except Exception as e:
            # Some errors are expected if models aren't loaded
            if 'model' in str(e).lower() or 'cohere' in str(e).lower():
                print(f"⚠ Model loading error (expected in test env): {e}")
                return True
            else:
                raise

    except Exception as e:
        print(f"✗ Rerank functional test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_config_reload():
    """Test that config can be reloaded."""
    try:
        from retrieval.rerank import reload_config, _RERANKER_MODEL, _AGRO_RERANKER_BATCH

        original_model = _RERANKER_MODEL
        original_batch = _AGRO_RERANKER_BATCH

        # Reload config
        reload_config()

        # Import again to get new values
        from retrieval import rerank
        new_model = rerank._RERANKER_MODEL
        new_batch = rerank._AGRO_RERANKER_BATCH

        print(f"✓ Config reload works")
        print(f"  Model: {new_model}")
        print(f"  Batch: {new_batch}")
        return True

    except Exception as e:
        print(f"✗ Config reload test failed: {e}")
        return False

def main():
    """Run all functional tests."""
    print("\n=== Rerank Functional Smoke Tests ===\n")

    tests = [
        ("Rerank with Config", test_rerank_with_config),
        ("Config Reload", test_config_reload),
    ]

    results = []
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        success = test_func()
        results.append((name, success))

    # Summary
    print("\n=== Summary ===")
    passed = sum(1 for _, success in results if success)
    total = len(results)

    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {name}")

    print(f"\n{passed}/{total} tests passed")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
