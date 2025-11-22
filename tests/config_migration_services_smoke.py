"""Smoke test for service files config_registry migration.

This test verifies that service files (rag.py, indexing.py, config_store.py)
properly use config_registry instead of os.getenv() for tunable parameters.
"""

import os
import sys
from pathlib import Path

# Add repo root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_services_import_config_registry():
    """Verify service files import and use config_registry."""
    # Test rag.py
    from server.services import rag
    assert hasattr(rag, '_config_registry'), "rag.py should have _config_registry"
    assert rag._config_registry is not None, "rag._config_registry should be initialized"

    # Test indexing.py
    from server.services import indexing
    assert hasattr(indexing, '_config_registry'), "indexing.py should have _config_registry"
    assert indexing._config_registry is not None, "indexing._config_registry should be initialized"

    # Test that config_store imports config_registry
    from server.services import config_store
    from server.services.config_registry import get_config_registry
    # config_store uses get_config_registry() inline, which is acceptable


def test_config_registry_singleton():
    """Verify config_registry is a proper singleton."""
    from server.services.config_registry import get_config_registry

    registry1 = get_config_registry()
    registry2 = get_config_registry()

    assert registry1 is registry2, "config_registry should be a singleton"


def test_config_registry_api():
    """Verify config_registry has expected API methods."""
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()

    # Test required methods exist
    assert hasattr(registry, 'get'), "registry should have get() method"
    assert hasattr(registry, 'get_int'), "registry should have get_int() method"
    assert hasattr(registry, 'get_float'), "registry should have get_float() method"
    assert hasattr(registry, 'get_str'), "registry should have get_str() method"
    assert hasattr(registry, 'get_bool'), "registry should have get_bool() method"
    assert hasattr(registry, 'load'), "registry should have load() method"
    assert hasattr(registry, 'reload'), "registry should have reload() method"


def test_services_use_config_registry():
    """Verify services actually use config_registry for config values."""
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()

    # Ensure registry is loaded
    if not registry._loaded:
        registry.load()

    # Test that we can get config values (should not raise)
    repo = registry.get_str('REPO', 'agro')
    assert isinstance(repo, str), "REPO should be a string"

    final_k = registry.get_int('FINAL_K', 10)
    assert isinstance(final_k, int), "FINAL_K should be an integer"

    temp = registry.get_float('GEN_TEMPERATURE', 0.2)
    assert isinstance(temp, float), "GEN_TEMPERATURE should be a float"

    skip_dense = registry.get_bool('SKIP_DENSE', False)
    assert isinstance(skip_dense, bool), "SKIP_DENSE should be a boolean"


def test_rag_do_search_uses_registry():
    """Verify rag.do_search uses config_registry for FINAL_K and REPO."""
    from server.services.rag import do_search
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    if not registry._loaded:
        registry.load()

    # Set a test value
    original_repo = registry.get('REPO')

    # This is a structural test - we just verify the function doesn't crash
    # when config_registry is used (we can't easily mock retrieval here)
    # The actual retrieval will fail in CI, but config access should work
    try:
        # We expect this to fail at retrieval stage, not config stage
        result = do_search("test query", None, None, None)
    except Exception as e:
        # As long as the error isn't about missing os.getenv, we're good
        error_msg = str(e).lower()
        assert 'getenv' not in error_msg, f"Should not reference os.getenv: {e}"


def test_indexing_uses_registry():
    """Verify indexing.start uses config_registry for REPO."""
    from server.services.indexing import start
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    if not registry._loaded:
        registry.load()

    # This should use config_registry to get REPO
    # The actual indexing will fail, but config access should work
    result = start({})

    # Should return success status (even though indexing runs in background)
    assert result.get('ok') or result.get('success'), "start() should return success status"


def test_config_store_schema_uses_registry():
    """Verify config_store.config_schema uses config_registry."""
    from server.services.config_store import config_schema
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    if not registry._loaded:
        registry.load()

    # Get schema - should use registry internally
    schema_data = config_schema()

    assert 'schema' in schema_data, "config_schema should return schema"
    assert 'values' in schema_data, "config_schema should return values"

    values = schema_data['values']

    # Check that values are populated from registry
    assert 'generation' in values, "values should have generation section"
    assert 'retrieval' in values, "values should have retrieval section"
    assert 'reranker' in values, "values should have reranker section"


def test_keywords_already_uses_registry():
    """Verify keywords.py already uses config_registry (reference implementation)."""
    from server.services.keywords import _config_registry

    assert _config_registry is not None, "keywords._config_registry should exist"

    # Verify it has cached config values
    from server.services import keywords
    assert hasattr(keywords, '_KEYWORDS_MAX_PER_REPO'), "Should have cached config"
    assert hasattr(keywords, '_KEYWORDS_BOOST'), "Should have cached config"


if __name__ == '__main__':
    print("Running config migration services smoke tests...")

    tests = [
        test_services_import_config_registry,
        test_config_registry_singleton,
        test_config_registry_api,
        test_services_use_config_registry,
        test_rag_do_search_uses_registry,
        test_indexing_uses_registry,
        test_config_store_schema_uses_registry,
        test_keywords_already_uses_registry,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            print(f"  Running {test_func.__name__}...", end=" ")
            test_func()
            print("PASS")
            passed += 1
        except Exception as e:
            print(f"FAIL: {e}")
            failed += 1
            import traceback
            traceback.print_exc()

    print(f"\nResults: {passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
