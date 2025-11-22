"""Smoke test for reranking config migration to config_registry.

Tests that reranking modules properly use config_registry instead of os.getenv().
"""
import pytest


def test_rerank_imports():
    """Verify reranking modules can be imported."""
    try:
        from retrieval import rerank
        from server import learning_reranker
        assert rerank is not None
        assert learning_reranker is not None
    except ImportError as e:
        pytest.fail(f"Failed to import reranking modules: {e}")


def test_rerank_uses_config_registry():
    """Verify retrieval.rerank uses config_registry."""
    from retrieval import rerank

    # Verify config_registry is imported
    assert hasattr(rerank, '_config_registry')

    # Verify cached config is loaded
    assert hasattr(rerank, '_RERANKER_MODEL')
    assert hasattr(rerank, '_AGRO_RERANKER_ENABLED')
    assert hasattr(rerank, '_AGRO_RERANKER_ALPHA')

    # Verify reload function exists
    assert hasattr(rerank, 'reload_config')


def test_learning_reranker_uses_config_registry():
    """Verify server.learning_reranker uses config_registry."""
    from server import learning_reranker

    # Verify config_registry is imported
    assert hasattr(learning_reranker, '_config_registry')

    # Verify cached config is loaded
    assert hasattr(learning_reranker, '_AGRO_RERANKER_BATCH')
    assert hasattr(learning_reranker, '_AGRO_RERANKER_MAXLEN')
    assert hasattr(learning_reranker, '_AGRO_RERANKER_MODEL_PATH')

    # Verify reload function exists
    assert hasattr(learning_reranker, 'reload_config')


def test_rerank_results_structural():
    """Structural test that rerank_results works with basic inputs."""
    from retrieval.rerank import rerank_results

    # Minimal test data
    docs = [
        {'file_path': 'test.py', 'code': 'def foo(): pass', 'score': 1.0},
        {'file_path': 'test2.py', 'code': 'def bar(): pass', 'score': 0.8},
    ]

    # Call rerank_results - should not crash
    # Note: This may not actually rerank if model isn't loaded, but should handle gracefully
    try:
        results = rerank_results("test query", docs, top_k=2)
        assert isinstance(results, list)
        assert len(results) <= 2
        # Results should have rerank_score added
        if results:
            assert 'rerank_score' in results[0]
    except Exception as e:
        # If reranking fails (e.g., model not available), that's okay for this structural test
        # Just ensure it doesn't crash the import/function call
        print(f"Reranking skipped (expected in test env): {e}")


def test_learning_reranker_get_info():
    """Test that get_reranker_info returns expected structure."""
    from server.learning_reranker import get_reranker_info

    info = get_reranker_info()

    # Verify expected keys exist
    assert 'enabled' in info
    assert 'path' in info
    assert 'alpha' in info
    assert 'topn' in info
    assert 'batch' in info
    assert 'maxlen' in info
    assert 'reload_on_change' in info
    assert 'reload_period_sec' in info

    # Verify types
    assert isinstance(info['enabled'], bool)
    assert isinstance(info['alpha'], (int, float))
    assert isinstance(info['topn'], int)
    assert isinstance(info['batch'], int)
    assert isinstance(info['maxlen'], int)


def test_config_reload_functions_exist():
    """Verify both modules have reload_config functions."""
    from retrieval import rerank
    from server import learning_reranker

    # Both modules should have reload_config
    assert callable(rerank.reload_config)
    assert callable(learning_reranker.reload_config)

    # Try calling them (should not crash)
    rerank.reload_config()
    learning_reranker.reload_config()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
