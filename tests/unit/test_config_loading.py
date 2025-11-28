"""Test that config values are properly loaded from agro_config.json."""
import pytest


def test_weights_from_config():
    """Verify BM25_WEIGHT and VECTOR_WEIGHT read correctly from config."""
    from retrieval.hybrid_search import BM25_WEIGHT, VECTOR_WEIGHT

    # These should match agro_config.json values
    assert BM25_WEIGHT == 0.3, f"BM25_WEIGHT should be 0.3, got {BM25_WEIGHT}"
    assert VECTOR_WEIGHT == 0.7, f"VECTOR_WEIGHT should be 0.7, got {VECTOR_WEIGHT}"


def test_embedding_config():
    """Verify embedding config is read correctly."""
    from retrieval.hybrid_search import EMBEDDING_TYPE, EMBEDDING_MODEL

    assert EMBEDDING_TYPE == "openai", f"EMBEDDING_TYPE should be 'openai', got {EMBEDDING_TYPE}"
    assert EMBEDDING_MODEL == "text-embedding-3-large", f"EMBEDDING_MODEL should be 'text-embedding-3-large', got {EMBEDDING_MODEL}"


def test_config_registry_consistency():
    """Verify config registry returns values matching the JSON file."""
    from server.services.config_registry import get_config_registry
    import json

    cfg = get_config_registry()

    with open('agro_config.json') as f:
        config = json.load(f)

    # Check BM25 weight matches
    json_bm25 = config.get('retrieval', {}).get('bm25_weight', 0.3)
    registry_bm25 = cfg.get_float('BM25_WEIGHT', None)

    assert registry_bm25 == json_bm25, f"Registry BM25_WEIGHT ({registry_bm25}) != JSON ({json_bm25})"

    # Check vector weight matches
    json_vector = config.get('retrieval', {}).get('vector_weight', 0.7)
    registry_vector = cfg.get_float('VECTOR_WEIGHT', None)

    assert registry_vector == json_vector, f"Registry VECTOR_WEIGHT ({registry_vector}) != JSON ({json_vector})"
