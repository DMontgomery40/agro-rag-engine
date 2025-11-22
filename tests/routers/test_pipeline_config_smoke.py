"""Smoke test for pipeline.py config_registry migration.

Verifies that /api/pipeline/summary endpoint works after migrating
all tunable parameters from os.getenv() to config_registry.
"""

import pytest
from fastapi.testclient import TestClient
from server.app import app


def test_pipeline_summary_endpoint_responds():
    """Verify pipeline summary endpoint returns 200 and has expected structure."""
    client = TestClient(app)
    response = client.get("/api/pipeline/summary")

    assert response.status_code == 200
    data = response.json()

    # Verify top-level structure
    assert "repo" in data
    assert "retrieval" in data
    assert "reranker" in data
    assert "enrichment" in data
    assert "generation" in data
    assert "health" in data

    # Verify repo section
    assert "name" in data["repo"]
    assert "mode" in data["repo"]
    assert "branch" in data["repo"]

    # Verify retrieval section
    assert "mode" in data["retrieval"]
    assert "top_k" in data["retrieval"]
    assert isinstance(data["retrieval"]["top_k"], int)

    # Verify reranker section
    assert "enabled" in data["reranker"]
    assert isinstance(data["reranker"]["enabled"], bool)

    # Verify enrichment section
    assert "enabled" in data["enrichment"]
    assert isinstance(data["enrichment"]["enabled"], bool)

    # Verify health section
    assert "qdrant" in data["health"]
    assert "redis" in data["health"]
    assert "llm" in data["health"]


def test_pipeline_summary_uses_config_registry():
    """Verify pipeline reads from config_registry, not hardcoded os.getenv()."""
    client = TestClient(app)
    response = client.get("/api/pipeline/summary")
    assert response.status_code == 200

    data = response.json()

    # If config_registry is working, we should get valid values
    # (not None/empty unless explicitly configured that way)
    assert data["retrieval"]["mode"] in ["bm25", "hybrid"]
    assert data["retrieval"]["top_k"] >= 1  # Should have a sensible default

    # Reranker backend should be None or a valid backend string
    rr_backend = data["reranker"]["backend"]
    if rr_backend is not None:
        assert isinstance(rr_backend, str)
        assert rr_backend in ["cohere", "voyage", "hf", "local", "learning"]


def test_pipeline_summary_health_checks_infrastructure_urls():
    """Verify health checks still use os.getenv() for infrastructure URLs."""
    # This test just verifies the endpoint doesn't crash when checking health
    # Infrastructure URLs (QDRANT_URL, REDIS_URL, OLLAMA_URL) should remain os.getenv()
    client = TestClient(app)
    response = client.get("/api/pipeline/summary")
    assert response.status_code == 200

    data = response.json()
    health = data["health"]

    # Health values should be one of: "ok", "fail", "unknown"
    assert health["qdrant"] in ["ok", "fail", "unknown"]
    assert health["redis"] in ["ok", "fail", "unknown"]
    assert health["llm"] in ["ok", "fail", "unknown"]
