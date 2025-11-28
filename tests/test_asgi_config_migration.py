"""Smoke test for server/asgi.py config_registry migration.

Verifies that:
1. asgi.py imports config_registry correctly
2. Module-level cache is initialized
3. All tunable parameters use config_registry
4. Infrastructure params still use os.getenv()
5. Pipeline summary endpoint works with config_registry
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

# Add repo root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_asgi_imports_config_registry():
    """Verify asgi.py imports config_registry correctly."""
    import server.asgi as asgi

    # Should have module-level registry
    assert hasattr(asgi, '_config_registry')
    assert asgi._config_registry is not None


def test_asgi_no_tunable_os_getenv():
    """Verify no tunable parameters use os.getenv()."""
    with open(repo_root / "server" / "asgi.py", "r") as f:
        content = f.read()

    # These tunable params should NOT appear with os.getenv
    forbidden_patterns = [
        'os.getenv("SKIP_DENSE"',
        'os.getenv("FINAL_K"',
        'os.getenv("LANGGRAPH_FINAL_K"',
        'os.getenv("AGRO_RERANKER_ENABLED"',
        'os.getenv("RERANKER_BACKEND"',
        'os.getenv("RERANK_BACKEND"',  # Old spelling
        'os.getenv("COHERE_RERANK_MODEL"',
        'os.getenv("VOYAGE_RERANK_MODEL"',
        'os.getenv("RERANKER_MODEL"',
        'os.getenv("ENRICH_CODE_CHUNKS"',
        'os.getenv("ENRICH_BACKEND"',
        'os.getenv("ENRICH_MODEL"',
        'os.getenv("GEN_MODEL"',
        'os.getenv("QDRANT_URL"',
    ]

    for pattern in forbidden_patterns:
        assert pattern not in content, f"Found {pattern} - should use config_registry"


def test_asgi_infrastructure_uses_os_getenv():
    """Verify infrastructure params still use os.getenv()."""
    with open(repo_root / "server" / "asgi.py", "r") as f:
        content = f.read()

    # These infrastructure params SHOULD use os.getenv
    required_patterns = [
        'os.getenv("REPO"',
        'os.getenv("GIT_BRANCH"',
        'os.getenv("REDIS_URL"',
        'os.getenv("OLLAMA_URL"',
    ]

    for pattern in required_patterns:
        assert pattern in content, f"Missing {pattern} - infrastructure should use os.getenv"


def test_pipeline_summary_uses_config_registry():
    """Verify pipeline_summary endpoint works with config_registry."""
    from server.asgi import create_app
    from server.services.config_registry import get_config_registry

    # Ensure config is loaded
    registry = get_config_registry()
    registry.load()

    app = create_app()
    client = TestClient(app)

    # Should not raise even if services are down
    response = client.get("/api/pipeline/summary")
    assert response.status_code == 200

    data = response.json()

    # Verify structure
    assert "repo" in data
    assert "retrieval" in data
    assert "reranker" in data
    assert "enrichment" in data
    assert "generation" in data
    assert "health" in data

    # Verify retrieval uses config_registry
    assert isinstance(data["retrieval"]["top_k"], int)
    assert data["retrieval"]["mode"] in ["hybrid", "bm25"]


def test_remaining_os_getenv_count():
    """Count and verify remaining os.getenv() calls."""
    import re

    with open(repo_root / "server" / "asgi.py", "r") as f:
        content = f.read()

    # Find all os.getenv calls
    matches = re.findall(r'os\.getenv\(["\']([^"\']+)', content)

    # Should only have infrastructure keys
    expected_keys = {
        "GUI_CUTOVER",
        "REPO",
        "GIT_BRANCH",
        "AGRO_LEARNING_RERANKER_MODEL",
        "REDIS_URL",
        "OLLAMA_URL",
    }

    actual_keys = set(matches)
    assert actual_keys == expected_keys, f"Unexpected os.getenv keys: {actual_keys - expected_keys}"
    assert len(matches) == 6, f"Expected 6 os.getenv calls, found {len(matches)}"


def test_config_registry_startup_event():
    """Verify config_registry is loaded at startup."""
    from server.asgi import create_app

    with patch('server.services.config_registry.get_config_registry') as mock_get:
        mock_registry = MagicMock()
        mock_get.return_value = mock_registry

        app = create_app()

        # Trigger startup event
        import asyncio
        for handler in app.router.on_startup:
            asyncio.run(handler())

        # Verify registry.load() was called
        mock_registry.load.assert_called_once()


# Import TestClient after other imports to avoid circular deps
try:
    from fastapi.testclient import TestClient
except ImportError:
    TestClient = None
    pytest.skip("FastAPI not installed", allow_module_level=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
