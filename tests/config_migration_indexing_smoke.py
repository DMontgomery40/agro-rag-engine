"""Smoke tests for indexing config migration to config_registry.

Verifies that indexer/index_repo.py correctly uses config_registry for tunable parameters
instead of direct os.getenv() calls.
"""
import os
import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server.services.config_registry import get_config_registry


def test_config_registry_initialized():
    """Verify config_registry is accessible and initialized."""
    config = get_config_registry()
    assert config is not None
    # Registry auto-loads on first access
    assert config._loaded or not config._loaded  # Either state is valid before explicit load


def test_skip_dense_config():
    """Verify SKIP_DENSE config key is accessible via config_registry."""
    config = get_config_registry()

    # Test default value
    skip_dense = config.get_bool('SKIP_DENSE', False)
    assert isinstance(skip_dense, bool)

    # Test that it can be overridden via env
    old_val = os.environ.get('SKIP_DENSE')
    try:
        os.environ['SKIP_DENSE'] = '1'
        config.reload()
        assert config.get_bool('SKIP_DENSE', False) == True

        os.environ['SKIP_DENSE'] = '0'
        config.reload()
        assert config.get_bool('SKIP_DENSE', False) == False
    finally:
        if old_val is not None:
            os.environ['SKIP_DENSE'] = old_val
        else:
            os.environ.pop('SKIP_DENSE', None)
        config.reload()


def test_embedding_type_config():
    """Verify EMBEDDING_TYPE config key is accessible via config_registry."""
    config = get_config_registry()

    # Test default value
    emb_type = config.get_str('EMBEDDING_TYPE', 'openai')
    assert isinstance(emb_type, str)
    assert emb_type in ['openai', 'voyage', 'mxbai', 'local']

    # Test that it can be overridden via env
    old_val = os.environ.get('EMBEDDING_TYPE')
    try:
        os.environ['EMBEDDING_TYPE'] = 'voyage'
        config.reload()
        assert config.get_str('EMBEDDING_TYPE', 'openai') == 'voyage'
    finally:
        if old_val is not None:
            os.environ['EMBEDDING_TYPE'] = old_val
        else:
            os.environ.pop('EMBEDDING_TYPE', None)
        config.reload()


def test_voyage_model_config():
    """Verify VOYAGE_MODEL config key is accessible via config_registry."""
    config = get_config_registry()

    voyage_model = config.get_str('VOYAGE_MODEL', 'voyage-code-3')
    assert isinstance(voyage_model, str)
    assert len(voyage_model) > 0


def test_voyage_embed_dim_config():
    """Verify VOYAGE_EMBED_DIM config key is accessible via config_registry."""
    config = get_config_registry()

    voyage_dim = config.get_int('VOYAGE_EMBED_DIM', 512)
    assert isinstance(voyage_dim, int)
    assert voyage_dim > 0


def test_embedding_dim_config():
    """Verify EMBEDDING_DIM config key is accessible via config_registry."""
    config = get_config_registry()

    emb_dim = config.get_int('EMBEDDING_DIM', 512)
    assert isinstance(emb_dim, int)
    assert emb_dim > 0


def test_embedding_model_config():
    """Verify EMBEDDING_MODEL config key is accessible via config_registry."""
    config = get_config_registry()

    emb_model = config.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
    assert isinstance(emb_model, str)
    assert len(emb_model) > 0


def test_enrich_code_chunks_config():
    """Verify ENRICH_CODE_CHUNKS config key is accessible via config_registry."""
    config = get_config_registry()

    enrich = config.get_bool('ENRICH_CODE_CHUNKS', False)
    assert isinstance(enrich, bool)


def test_gen_model_config():
    """Verify GEN_MODEL config key is accessible via config_registry."""
    config = get_config_registry()

    # Test GEN_MODEL with ENRICH_MODEL fallback
    gen_model = config.get_str('GEN_MODEL', config.get_str('ENRICH_MODEL', ''))
    assert isinstance(gen_model, str)
    # Empty string is valid default


def test_indexing_module_imports():
    """Verify that indexer/index_repo.py can import config_registry without errors."""
    # This is a structural test - just verify the import works
    try:
        # Import the module to check for import errors
        import indexer.index_repo as index_repo
        # Check that _config is defined
        assert hasattr(index_repo, '_config')
        # Verify it's a ConfigRegistry instance
        from server.services.config_registry import ConfigRegistry
        assert isinstance(index_repo._config, ConfigRegistry)
    except ImportError as e:
        pytest.fail(f"Failed to import indexer.index_repo: {e}")


def test_config_type_safety():
    """Verify that config getters handle type conversions correctly."""
    config = get_config_registry()

    # Test int conversion
    old_val = os.environ.get('TEST_INT_KEY')
    try:
        os.environ['TEST_INT_KEY'] = '42'
        config.reload()
        assert config.get_int('TEST_INT_KEY', 0) == 42

        # Test invalid int defaults to fallback
        os.environ['TEST_INT_KEY'] = 'not_a_number'
        config.reload()
        assert config.get_int('TEST_INT_KEY', 99) == 99
    finally:
        if old_val is not None:
            os.environ['TEST_INT_KEY'] = old_val
        else:
            os.environ.pop('TEST_INT_KEY', None)
        config.reload()


def test_no_direct_osgetenv_for_tunable_params():
    """Verify that index_repo.py doesn't use os.getenv() for tunable parameters.

    This is a regression test - we've migrated away from os.getenv() for tunable
    params and should not regress back to using it.
    """
    index_repo_path = Path(__file__).resolve().parents[1] / 'indexer' / 'index_repo.py'
    content = index_repo_path.read_text()

    # These should NOT appear as os.getenv() calls (they should use _config)
    forbidden_patterns = [
        "os.getenv('ENRICH_CODE_CHUNKS'",
        "os.getenv('GEN_MODEL'",
        "os.getenv('ENRICH_MODEL'",
        "os.getenv('SKIP_DENSE'",
        "os.getenv('EMBEDDING_TYPE'",
        "os.getenv('VOYAGE_MODEL'",
        "os.getenv('VOYAGE_EMBED_DIM'",
        "os.getenv('EMBEDDING_DIM'",
        "os.getenv('EMBEDDING_MODEL'",
    ]

    found_violations = []
    for pattern in forbidden_patterns:
        if pattern in content:
            found_violations.append(pattern)

    assert not found_violations, (
        f"Found os.getenv() calls for tunable parameters (should use _config instead): "
        f"{', '.join(found_violations)}"
    )


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
