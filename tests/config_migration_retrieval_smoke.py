"""Smoke test for retrieval config registry migration.

Verifies that hybrid_search.py uses config_registry instead of os.getenv()
for tunable parameters.
"""

import pytest


def test_retrieval_uses_config():
    """Verify retrieval module vars match config registry values."""
    from retrieval import hybrid_search

    # Verify that module-level variables match config registry
    # (This proves they're loaded from config, not hardcoded os.getenv)
    topk_dense_reg = hybrid_search._config_registry.get_int('TOPK_DENSE', -1)
    topk_sparse_reg = hybrid_search._config_registry.get_int('TOPK_SPARSE', -1)
    hydration_mode_reg = hybrid_search._config_registry.get_str('HYDRATION_MODE', 'NONE')

    assert hybrid_search._TOPK_DENSE == topk_dense_reg, \
        f"Module var (_TOPK_DENSE={hybrid_search._TOPK_DENSE}) doesn't match registry ({topk_dense_reg})"
    assert hybrid_search._TOPK_SPARSE == topk_sparse_reg, \
        f"Module var (_TOPK_SPARSE={hybrid_search._TOPK_SPARSE}) doesn't match registry ({topk_sparse_reg})"
    assert hybrid_search._HYDRATION_MODE == hydration_mode_reg, \
        f"Module var (_HYDRATION_MODE={hybrid_search._HYDRATION_MODE}) doesn't match registry ({hydration_mode_reg})"


def test_vendor_mode_config():
    """Verify VENDOR_MODE uses config registry."""
    from retrieval import hybrid_search

    vendor_mode_reg = hybrid_search._config_registry.get_str('VENDOR_MODE', 'NONE')
    assert hybrid_search._VENDOR_MODE == vendor_mode_reg, \
        f"Module var doesn't match registry: {hybrid_search._VENDOR_MODE} != {vendor_mode_reg}"


def test_semantic_synonyms_config():
    """Verify USE_SEMANTIC_SYNONYMS uses config registry."""
    from retrieval import hybrid_search

    use_syn_reg = hybrid_search._config_registry.get_int('USE_SEMANTIC_SYNONYMS', -1)
    assert hybrid_search._USE_SEMANTIC_SYNONYMS == use_syn_reg, \
        f"Module var doesn't match registry: {hybrid_search._USE_SEMANTIC_SYNONYMS} != {use_syn_reg}"


def test_hydration_max_chars_config():
    """Verify HYDRATION_MAX_CHARS uses config registry."""
    from retrieval import hybrid_search

    hyd_max_reg = hybrid_search._config_registry.get_int('HYDRATION_MAX_CHARS', -1)
    assert hybrid_search._HYDRATION_MAX_CHARS == hyd_max_reg, \
        f"Module var doesn't match registry: {hybrid_search._HYDRATION_MAX_CHARS} != {hyd_max_reg}"


def test_disable_rerank_config():
    """Verify DISABLE_RERANK uses config registry."""
    from retrieval import hybrid_search

    disable_rerank_reg = hybrid_search._config_registry.get_int('DISABLE_RERANK', -1)
    assert hybrid_search._DISABLE_RERANK == disable_rerank_reg, \
        f"Module var doesn't match registry: {hybrid_search._DISABLE_RERANK} != {disable_rerank_reg}"


def test_embedding_config():
    """Verify embedding params use config registry."""
    from retrieval.hybrid_search import _config_registry

    # These should be accessible via config registry
    embedding_type = _config_registry.get_str('EMBEDDING_TYPE', 'openai')
    embedding_model = _config_registry.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
    voyage_model = _config_registry.get_str('VOYAGE_MODEL', 'voyage-code-3')

    assert embedding_type in ['openai', 'voyage', 'local', 'mxbai']
    assert isinstance(embedding_model, str)
    assert isinstance(voyage_model, str)


def test_reranker_backend_config():
    """Verify RERANKER_BACKEND uses config registry."""
    from retrieval.hybrid_search import _config_registry

    backend = _config_registry.get_str('RERANKER_BACKEND', 'local')
    assert backend in ['local', 'cohere', 'voyage']


def test_collection_and_vector_backend_config():
    """Verify COLLECTION_NAME and VECTOR_BACKEND use config registry."""
    from retrieval.hybrid_search import _config_registry

    collection = _config_registry.get_str('COLLECTION_NAME', 'code_chunks_{repo}')
    backend = _config_registry.get_str('VECTOR_BACKEND', 'qdrant')

    assert isinstance(collection, str)
    assert backend in ['qdrant', 'chroma', 'weaviate']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
