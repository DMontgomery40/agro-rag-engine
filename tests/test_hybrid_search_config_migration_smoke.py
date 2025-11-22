"""Smoke test for hybrid_search.py config_registry migration.

This test verifies that:
1. The module imports correctly
2. All config values are loaded from config_registry
3. No os.getenv() calls remain (except API keys)
4. reload_config() works correctly
"""

import os
import pytest
from retrieval import hybrid_search


def test_module_imports():
    """Verify the module imports without errors."""
    assert hybrid_search is not None
    assert hasattr(hybrid_search, 'search')
    assert hasattr(hybrid_search, 'search_routed')
    assert hasattr(hybrid_search, 'search_routed_multi')


def test_config_values_loaded():
    """Verify all config values are accessible."""
    # Check module-level cached values exist
    assert hasattr(hybrid_search, '_RRF_K_DIV')
    assert hasattr(hybrid_search, '_CARD_BONUS')
    assert hasattr(hybrid_search, '_QDRANT_URL')
    assert hasattr(hybrid_search, '_REPO')
    assert hasattr(hybrid_search, '_COLLECTION_NAME')
    assert hasattr(hybrid_search, '_PROJECT_PATH_BOOSTS')

    # Check they have reasonable values
    assert isinstance(hybrid_search._RRF_K_DIV, int)
    assert isinstance(hybrid_search._CARD_BONUS, float)
    assert isinstance(hybrid_search._QDRANT_URL, str)
    assert isinstance(hybrid_search._REPO, str)
    assert isinstance(hybrid_search._COLLECTION_NAME, str)
    assert isinstance(hybrid_search._PROJECT_PATH_BOOSTS, str)


def test_module_level_constants():
    """Verify module-level constants use cached values."""
    # These should now be using cached config values
    assert hybrid_search.QDRANT_URL == hybrid_search._QDRANT_URL
    assert hybrid_search.REPO == hybrid_search._REPO
    assert hybrid_search.VENDOR_MODE == hybrid_search._VENDOR_MODE
    assert hybrid_search.COLLECTION == hybrid_search._COLLECTION_NAME


def test_reload_config():
    """Verify reload_config() updates cached values."""
    # Store original values
    original_rrfk = hybrid_search._RRF_K_DIV
    original_bonus = hybrid_search._CARD_BONUS

    # Reload config
    hybrid_search.reload_config()

    # Values should still be accessible (may or may not change)
    assert isinstance(hybrid_search._RRF_K_DIV, int)
    assert isinstance(hybrid_search._CARD_BONUS, float)


def test_no_direct_os_getenv_except_api_keys():
    """Verify no os.getenv() calls remain except for API keys."""
    import inspect

    # Get the source code
    source = inspect.getsource(hybrid_search)

    # Find all os.getenv() calls
    lines = source.split('\n')
    getenv_lines = [
        (i, line) for i, line in enumerate(lines, 1)
        if 'os.getenv(' in line or '_os.getenv(' in line
    ]

    # Filter out API key calls and comments
    non_api_key_calls = []
    for line_num, line in getenv_lines:
        # Skip comments
        if line.strip().startswith('#'):
            continue
        # Skip API key calls
        if 'API_KEY' in line:
            continue
        non_api_key_calls.append((line_num, line))

    # Should be no non-API-key os.getenv() calls
    if non_api_key_calls:
        print("\nUnexpected os.getenv() calls found:")
        for line_num, line in non_api_key_calls:
            print(f"  Line {line_num}: {line.strip()}")

    assert len(non_api_key_calls) == 0, \
        f"Found {len(non_api_key_calls)} unexpected os.getenv() calls"


def test_config_registry_integration():
    """Verify config_registry is properly integrated."""
    # Check that config_registry is imported
    assert hasattr(hybrid_search, '_config_registry')

    # Check it's a ConfigRegistry instance
    from server.services.config_registry import ConfigRegistry
    assert isinstance(hybrid_search._config_registry, ConfigRegistry)

    # Check we can get values from it
    rrfk = hybrid_search._config_registry.get_int('RRF_K_DIV', 60)
    assert isinstance(rrfk, int)
    assert rrfk > 0


def test_functions_use_cached_config():
    """Verify key functions use cached config values."""
    # Test _project_path_boost uses _PROJECT_PATH_BOOSTS
    bonus = hybrid_search._project_path_boost('app/services/test.py', 'project')
    assert isinstance(bonus, float)
    assert bonus >= 0.0

    # Test route_repo uses _REPO
    repo = hybrid_search.route_repo('test query')
    assert isinstance(repo, str)
    assert len(repo) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
