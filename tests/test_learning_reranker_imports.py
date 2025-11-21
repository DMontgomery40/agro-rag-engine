"""
Smoke test to verify learning_reranker module imports work correctly.

This test verifies that after renaming server/reranker.py to server/learning_reranker.py,
all imports are functioning correctly.
"""

import sys
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_direct_import():
    """Test direct import from learning_reranker module."""
    try:
        from server.learning_reranker import (
            get_reranker,
            rerank_candidates,
            get_reranker_info
        )
        print("✓ Direct import from server.learning_reranker successful")
        return True
    except ImportError as e:
        print(f"✗ Direct import failed: {e}")
        return False


def test_app_import():
    """Test that server.app can import from learning_reranker."""
    try:
        # This will fail if app.py has wrong import
        import server.app
        print("✓ server.app imports successfully (includes learning_reranker)")
        return True
    except ImportError as e:
        print(f"✗ server.app import failed: {e}")
        return False


def test_config_store_import():
    """Test that config_store can import from learning_reranker."""
    try:
        from server.services.config_store import _effective_rerank_backend
        # Try calling it to ensure the import inside works
        result = _effective_rerank_backend()
        print(f"✓ server.services.config_store imports successfully")
        print(f"  Effective rerank backend: {result.get('backend', 'unknown')}")
        return True
    except ImportError as e:
        print(f"✗ config_store import failed: {e}")
        return False


def test_get_reranker_info():
    """Test that get_reranker_info function works."""
    try:
        from server.learning_reranker import get_reranker_info
        info = get_reranker_info()
        print(f"✓ get_reranker_info() works")
        print(f"  Model loaded: {info.get('model_loaded')}")
        print(f"  Path: {info.get('path')}")
        return True
    except Exception as e:
        print(f"✗ get_reranker_info() failed: {e}")
        return False


def main():
    """Run all smoke tests."""
    print("=" * 70)
    print("Learning Reranker Import Smoke Tests")
    print("=" * 70)

    tests = [
        test_direct_import,
        test_app_import,
        test_config_store_import,
        test_get_reranker_info,
    ]

    results = []
    for test_func in tests:
        print(f"\n{test_func.__name__}:")
        results.append(test_func())

    print("\n" + "=" * 70)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 70)

    if passed == total:
        print("\n✓ All imports verified successfully!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
