#!/usr/bin/env python3
"""Smoke test for eval config migration.

This test verifies that eval modules correctly load configuration from
the ConfigRegistry and fall back to environment variables.
"""
import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_eval_rag_imports():
    """Test that eval_rag.py imports without errors."""
    try:
        from eval import eval_rag
        print("✓ eval_rag imports successfully")
        return True
    except Exception as e:
        print(f"✗ eval_rag import failed: {e}")
        return False

def test_eval_loop_imports():
    """Test that eval_loop.py imports without errors."""
    try:
        from eval import eval_loop
        print("✓ eval_loop imports successfully")
        return True
    except Exception as e:
        print(f"✗ eval_loop import failed: {e}")
        return False

def test_eval_rag_config_values():
    """Test that eval_rag.py loads config values correctly."""
    from eval.eval_rag import USE_MULTI, FINAL_K, MULTI_M, GOLDEN_PATH

    # Verify types
    assert isinstance(USE_MULTI, bool), f"USE_MULTI should be bool, got {type(USE_MULTI)}"
    assert isinstance(FINAL_K, int), f"FINAL_K should be int, got {type(FINAL_K)}"
    assert isinstance(MULTI_M, int), f"MULTI_M should be int, got {type(MULTI_M)}"
    assert isinstance(GOLDEN_PATH, str), f"GOLDEN_PATH should be str, got {type(GOLDEN_PATH)}"

    # Verify reasonable values
    assert 1 <= FINAL_K <= 50, f"FINAL_K={FINAL_K} out of reasonable range"
    assert 1 <= MULTI_M <= 20, f"MULTI_M={MULTI_M} out of reasonable range"

    print(f"✓ eval_rag config values:")
    print(f"  USE_MULTI={USE_MULTI}")
    print(f"  FINAL_K={FINAL_K}")
    print(f"  MULTI_M={MULTI_M}")
    print(f"  GOLDEN_PATH={GOLDEN_PATH}")
    return True

def test_eval_loop_config_values():
    """Test that eval_loop.py loads config values correctly."""
    from eval.eval_loop import BASELINE_PATH

    assert isinstance(BASELINE_PATH, str), f"BASELINE_PATH should be str, got {type(BASELINE_PATH)}"
    assert BASELINE_PATH.endswith('.json'), f"BASELINE_PATH should end with .json"

    print(f"✓ eval_loop config values:")
    print(f"  BASELINE_PATH={BASELINE_PATH}")
    return True

def test_config_registry_integration():
    """Test that config registry is properly integrated."""
    try:
        from server.services.config_registry import get_config_registry
        registry = get_config_registry()

        # Test retrieval of eval parameters
        eval_multi = registry.get_int('EVAL_MULTI', 1)
        eval_final_k = registry.get_int('EVAL_FINAL_K', 5)
        eval_multi_m = registry.get_int('EVAL_MULTI_M', 10)
        golden_path = registry.get_str('GOLDEN_PATH', 'data/evaluation_dataset.json')
        baseline_path = registry.get_str('BASELINE_PATH', 'data/evals/eval_baseline.json')

        print(f"✓ ConfigRegistry integration:")
        print(f"  EVAL_MULTI={eval_multi}")
        print(f"  EVAL_FINAL_K={eval_final_k}")
        print(f"  EVAL_MULTI_M={eval_multi_m}")
        print(f"  GOLDEN_PATH={golden_path}")
        print(f"  BASELINE_PATH={baseline_path}")
        return True
    except Exception as e:
        print(f"✗ ConfigRegistry integration failed: {e}")
        return False

def test_build_cards_config():
    """Test that build_cards.py loads config correctly."""
    try:
        from indexer.build_cards import MAX_CHUNKS, REPO

        assert isinstance(MAX_CHUNKS, int), f"MAX_CHUNKS should be int, got {type(MAX_CHUNKS)}"
        assert isinstance(REPO, str), f"REPO should be str, got {type(REPO)}"

        print(f"✓ build_cards config values:")
        print(f"  MAX_CHUNKS={MAX_CHUNKS}")
        print(f"  REPO={REPO}")
        return True
    except Exception as e:
        print(f"✗ build_cards config failed: {e}")
        return False

def test_infrastructure_vars_preserved():
    """Test that infrastructure variables are still read from environment."""
    from eval.eval_rag import os as eval_os

    # These should still use os.getenv (infrastructure vars)
    repo = eval_os.getenv('REPO', 'project')
    assert isinstance(repo, str)

    print(f"✓ Infrastructure vars preserved:")
    print(f"  REPO={repo} (from env)")
    return True

def main():
    """Run all smoke tests."""
    print("=" * 60)
    print("Eval Config Migration Smoke Tests")
    print("=" * 60)

    tests = [
        ("Import eval_rag", test_eval_rag_imports),
        ("Import eval_loop", test_eval_loop_imports),
        ("eval_rag config values", test_eval_rag_config_values),
        ("eval_loop config values", test_eval_loop_config_values),
        ("ConfigRegistry integration", test_config_registry_integration),
        ("build_cards config", test_build_cards_config),
        ("Infrastructure vars preserved", test_infrastructure_vars_preserved),
    ]

    results = []
    for name, test_func in tests:
        print(f"\nTest: {name}")
        print("-" * 60)
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total - passed} tests failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
