"""
Smoke test: server/learning_reranker.py config migration

Verifies that learning_reranker module uses config_registry with proper fallback.
"""
import os
import sys
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(repo_root))


def test_learning_reranker_imports():
    """Test that learning_reranker module imports successfully."""
    import server.learning_reranker
    assert server.learning_reranker is not None
    print("✓ server.learning_reranker imports successfully")


def test_learning_reranker_has_cached_config():
    """Test that learning_reranker has module-level config cache."""
    import server.learning_reranker

    # Check all expected cached variables exist
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_BATCH')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_MAXLEN')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_MODEL_PATH')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_RELOAD_ON_CHANGE')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_RELOAD_PERIOD_SEC')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_ALPHA')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_TOPN')
    assert hasattr(server.learning_reranker, '_AGRO_RERANKER_ENABLED')
    print("✓ All expected config cache variables present")


def test_learning_reranker_has_reload_config():
    """Test that learning_reranker has reload_config() function."""
    import server.learning_reranker

    assert hasattr(server.learning_reranker, 'reload_config')
    assert callable(server.learning_reranker.reload_config)

    # Call it to ensure it works
    server.learning_reranker.reload_config()
    print("✓ reload_config() exists and is callable")


def test_cached_config_values_are_correct_type():
    """Test that cached config values have correct types."""
    import server.learning_reranker

    # Integer values
    assert isinstance(server.learning_reranker._AGRO_RERANKER_BATCH, int)
    assert isinstance(server.learning_reranker._AGRO_RERANKER_MAXLEN, int)
    assert isinstance(server.learning_reranker._AGRO_RERANKER_RELOAD_ON_CHANGE, int)
    assert isinstance(server.learning_reranker._AGRO_RERANKER_RELOAD_PERIOD_SEC, int)
    assert isinstance(server.learning_reranker._AGRO_RERANKER_TOPN, int)
    assert isinstance(server.learning_reranker._AGRO_RERANKER_ENABLED, int)

    # Float value
    assert isinstance(server.learning_reranker._AGRO_RERANKER_ALPHA, float)

    # String value
    assert isinstance(server.learning_reranker._AGRO_RERANKER_MODEL_PATH, str)

    print("✓ All cached config values have correct types")


def test_get_reranker_info_uses_cached_config():
    """Test that get_reranker_info() returns cached config values."""
    import server.learning_reranker

    info = server.learning_reranker.get_reranker_info()

    assert isinstance(info, dict)
    assert 'enabled' in info
    assert 'path' in info
    assert 'alpha' in info
    assert 'topn' in info
    assert 'batch' in info
    assert 'maxlen' in info
    assert 'reload_on_change' in info
    assert 'reload_period_sec' in info

    # Verify values match cache
    assert info['alpha'] == server.learning_reranker._AGRO_RERANKER_ALPHA
    assert info['topn'] == server.learning_reranker._AGRO_RERANKER_TOPN
    assert info['batch'] == server.learning_reranker._AGRO_RERANKER_BATCH
    assert info['maxlen'] == server.learning_reranker._AGRO_RERANKER_MAXLEN

    print("✓ get_reranker_info() returns cached config values")


def test_has_config_registry_fallback():
    """Verify module has fallback for when config_registry is unavailable."""
    source = Path(repo_root / "server/learning_reranker.py").read_text()

    # Should have try/except for config_registry import
    assert "try:" in source
    assert "from server.services.config_registry import get_config_registry" in source
    assert "except ImportError:" in source
    assert "_config_registry = None" in source

    # Should have fallback in _load_cached_config
    assert "if _config_registry is None:" in source
    assert "os.getenv('AGRO_RERANKER_BATCH'" in source

    print("✓ Has proper fallback for when config_registry is unavailable")


def test_uses_registry_when_available():
    """Verify module uses config_registry when available."""
    source = Path(repo_root / "server/learning_reranker.py").read_text()

    # Should use registry when available
    assert "else:" in source
    assert "_config_registry.get_int('AGRO_RERANKER_BATCH'" in source
    assert "_config_registry.get_float('AGRO_RERANKER_ALPHA'" in source
    assert "_config_registry.get_str('AGRO_RERANKER_MODEL_PATH'" in source

    print("✓ Uses config_registry when available")


if __name__ == '__main__':
    print("\n=== Testing server/learning_reranker.py Config Migration ===\n")

    test_learning_reranker_imports()
    test_learning_reranker_has_cached_config()
    test_learning_reranker_has_reload_config()
    test_cached_config_values_are_correct_type()
    test_get_reranker_info_uses_cached_config()
    test_has_config_registry_fallback()
    test_uses_registry_when_available()

    print("\n=== All tests passed! ===\n")
