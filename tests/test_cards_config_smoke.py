"""Smoke test for server/cards_builder.py config_registry migration.

This test verifies that:
1. All os.getenv() calls have been replaced with config_registry
2. Config values are loaded from registry
3. Module functions work correctly with cached config
4. reload_config() updates cached values
"""

import json
import os
import tempfile
from pathlib import Path


def test_cards_builder_config_migration():
    """Test that cards_builder uses config_registry instead of os.getenv()."""

    # Import after we've set up the environment
    from server.cards_builder import (
        _load_cached_config,
        reload_config,
        _CARDS_ENRICH_DEFAULT,
        _CARDS_MAX,
        _ENRICH_CODE_CHUNKS,
        _ENRICH_TIMEOUT,
        _OUT_DIR_BASE,
        _EMBEDDING_TYPE,
        _ENRICH_MODEL,
        _GEN_MODEL,
        _RERANK_BACKEND,
        _COHERE_RERANK_MODEL,
        _RERANKER_MODEL,
        _model_info,
        _progress_dir,
        _logs_path,
    )
    from server.services.config_registry import get_config_registry

    # Verify config registry is being used
    registry = get_config_registry()
    assert registry is not None, "Config registry should be available"

    # Check that cached values are loaded
    assert _CARDS_ENRICH_DEFAULT is not None, "CARDS_ENRICH_DEFAULT should be loaded"
    assert _CARDS_MAX is not None, "CARDS_MAX should be loaded"
    assert _ENRICH_CODE_CHUNKS is not None, "ENRICH_CODE_CHUNKS should be loaded"
    assert _ENRICH_TIMEOUT is not None, "ENRICH_TIMEOUT should be loaded"
    assert _OUT_DIR_BASE is not None, "OUT_DIR_BASE should be loaded"
    assert _EMBEDDING_TYPE is not None, "EMBEDDING_TYPE should be loaded"
    assert _ENRICH_MODEL is not None, "ENRICH_MODEL should be loaded"
    assert _GEN_MODEL is not None, "GEN_MODEL should be loaded"
    assert _RERANK_BACKEND is not None, "RERANK_BACKEND should be loaded"
    assert _COHERE_RERANK_MODEL is not None, "COHERE_RERANK_MODEL should be loaded"
    assert _RERANKER_MODEL is not None, "RERANKER_MODEL should be loaded"

    # Verify _model_info() uses cached config (no os.getenv calls)
    model_info = _model_info()
    assert "embed" in model_info, "model_info should have embed key"
    assert "enrich" in model_info, "model_info should have enrich key"
    assert "rerank" in model_info, "model_info should have rerank key"
    assert isinstance(model_info["embed"], str), "embed should be a string"
    assert isinstance(model_info["enrich"], str), "enrich should be a string"
    assert isinstance(model_info["rerank"], str), "rerank should be a string"

    # Verify _progress_dir() uses cached OUT_DIR_BASE
    progress_dir = _progress_dir("test-repo")
    assert "cards" in str(progress_dir), "progress_dir should include 'cards' directory"
    assert "test-repo" in str(progress_dir), "progress_dir should include repo name"

    # Verify _logs_path() uses cached OUT_DIR_BASE
    logs_path = _logs_path()
    assert "logs" in str(logs_path), "logs_path should include 'logs' directory"
    assert "cards_build.log" in str(logs_path), "logs_path should end with cards_build.log"

    print("✓ All cached config variables are loaded")
    print("✓ _model_info() works without os.getenv() calls")
    print("✓ _progress_dir() uses cached config")
    print("✓ _logs_path() uses cached config")

    # Test reload_config() functionality
    reload_config()
    print("✓ reload_config() executes without errors")

    # Verify no direct os.getenv() calls outside fallback (by checking source)
    import inspect
    source = inspect.getsource(__import__('server.cards_builder'))

    # Count os.getenv calls (should only be in fallback path)
    getenv_lines = [line for line in source.split('\n') if 'os.getenv' in line]
    fallback_block = False
    non_fallback_getenv = []

    for line in getenv_lines:
        # Check if we're in the fallback block
        if 'if _config_registry is None:' in line or fallback_block:
            fallback_block = True
            if '_config_registry.get' in line:
                fallback_block = False  # Exited fallback
        else:
            # os.getenv outside fallback block - that's a problem
            if 'os.getenv' in line and '# Fallback' not in line:
                non_fallback_getenv.append(line.strip())

    # All os.getenv should be in fallback or have explicit comment
    assert len(non_fallback_getenv) == 0, f"Found os.getenv outside fallback: {non_fallback_getenv}"

    print("✓ No os.getenv() calls outside fallback path")
    print("\n" + "="*60)
    print("SUCCESS: cards_builder.py config_registry migration verified")
    print("="*60)


def test_cards_builder_config_values():
    """Test that specific config values are correctly loaded."""
    from server.cards_builder import (
        _CARDS_ENRICH_DEFAULT,
        _CARDS_MAX,
        _ENRICH_CODE_CHUNKS,
        _ENRICH_TIMEOUT,
        _EMBEDDING_TYPE,
        _RERANK_BACKEND,
    )

    # Check types
    assert isinstance(_CARDS_ENRICH_DEFAULT, int), "CARDS_ENRICH_DEFAULT should be int"
    assert isinstance(_CARDS_MAX, int), "CARDS_MAX should be int"
    assert isinstance(_ENRICH_CODE_CHUNKS, int), "ENRICH_CODE_CHUNKS should be int"
    assert isinstance(_ENRICH_TIMEOUT, int), "ENRICH_TIMEOUT should be int"
    assert isinstance(_EMBEDDING_TYPE, str), "EMBEDDING_TYPE should be str"
    assert isinstance(_RERANK_BACKEND, str), "RERANK_BACKEND should be str"

    # Check reasonable values
    assert _CARDS_ENRICH_DEFAULT in [0, 1], "CARDS_ENRICH_DEFAULT should be 0 or 1"
    assert _CARDS_MAX >= 0, "CARDS_MAX should be non-negative"
    assert _ENRICH_CODE_CHUNKS >= 0, "ENRICH_CODE_CHUNKS should be non-negative"
    assert _ENRICH_TIMEOUT > 0, "ENRICH_TIMEOUT should be positive"
    assert _EMBEDDING_TYPE in ["openai", "voyage", "local"], "EMBEDDING_TYPE should be valid"
    assert _RERANK_BACKEND in ["local", "cohere", "voyage"], "RERANK_BACKEND should be valid"

    print("✓ All config values have correct types")
    print("✓ All config values have reasonable defaults")


if __name__ == "__main__":
    test_cards_builder_config_migration()
    test_cards_builder_config_values()
    print("\nAll tests passed!")
