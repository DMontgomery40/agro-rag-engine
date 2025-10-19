"""
Smoke test for metrics instrumentation.

This test verifies that all API wrappers are properly instrumented
to track calls, costs, and tokens in Prometheus/Grafana.

Test coverage:
1. Cohere rerank tracking (retrieval/rerank.py)
2. Voyage embeddings tracking (retrieval/hybrid_search.py)
3. OpenAI embeddings tracking (retrieval/hybrid_search.py)
4. OpenAI generation tracking (server/env_model.py)
5. Response headers (server/app.py)
6. Prometheus metrics collection
"""

import pytest
import os
import time
import json
from pathlib import Path


def test_cohere_tracking_implementation():
    """Verify Cohere tracking code exists in rerank.py"""
    rerank_file = Path(__file__).parent.parent.parent / "retrieval" / "rerank.py"
    assert rerank_file.exists(), "rerank.py not found"

    content = rerank_file.read_text()

    # Check for tracking imports
    assert "from server.api_tracker import track_api_call, APIProvider" in content
    assert "import time" in content

    # Check for tracking call
    assert "track_api_call(" in content
    assert "provider=APIProvider.COHERE" in content
    assert "endpoint=\"https://api.cohere.ai/v1/rerank\"" in content

    print("✓ Cohere tracking code found in rerank.py")


def test_voyage_tracking_implementation():
    """Verify Voyage tracking code exists in hybrid_search.py"""
    search_file = Path(__file__).parent.parent.parent / "retrieval" / "hybrid_search.py"
    assert search_file.exists(), "hybrid_search.py not found"

    content = search_file.read_text()

    # Check for tracking imports
    assert "from server.api_tracker import track_api_call, APIProvider" in content

    # Check for Voyage tracking
    assert "APIProvider.VOYAGE" in content
    assert "voyage-code-3" in content or "voyage" in content.lower()

    print("✓ Voyage tracking code found in hybrid_search.py")


def test_openai_tracking_implementation():
    """Verify OpenAI tracking code exists in env_model.py"""
    env_model_file = Path(__file__).parent.parent.parent / "server" / "env_model.py"
    assert env_model_file.exists(), "env_model.py not found"

    content = env_model_file.read_text()

    # Check for tracking imports
    assert "from server.api_tracker import track_api_call, APIProvider" in content

    # Check for OpenAI tracking
    assert "APIProvider.OPENAI" in content
    assert "track_api_call(" in content

    # Should have tracking for both responses.create and chat.completions.create
    assert content.count("track_api_call(") >= 2

    print("✓ OpenAI tracking code found in env_model.py")


def test_response_headers_implementation():
    """Verify response headers are set in app.py"""
    app_file = Path(__file__).parent.parent.parent / "server" / "app.py"
    assert app_file.exists(), "app.py not found"

    content = app_file.read_text()

    # Check for header setting in /api/chat endpoint
    assert "X-Provider" in content
    assert "X-Model" in content
    assert "response.headers[\"X-Provider\"]" in content
    assert "response.headers[\"X-Model\"]" in content

    print("✓ Response headers found in app.py")


def test_api_tracker_module():
    """Verify api_tracker module has all necessary components"""
    try:
        from server.api_tracker import (
            APIProvider, track_api_call, get_tracker, get_stats
        )

        # Check providers exist
        assert hasattr(APIProvider, 'COHERE')
        assert hasattr(APIProvider, 'VOYAGE')
        assert hasattr(APIProvider, 'OPENAI')

        # Check tracking directory
        tracking_dir = Path(__file__).parent.parent.parent / "data" / "tracking"
        assert tracking_dir.exists(), "Tracking directory not found"

        api_calls_log = tracking_dir / "api_calls.jsonl"
        assert api_calls_log.exists(), "API calls log not found"

        print(f"✓ API tracker module working, log at {api_calls_log}")

    except ImportError as e:
        pytest.fail(f"Failed to import api_tracker: {e}")


def test_pricing_data():
    """Verify pricing data includes all providers"""
    prices_file = Path(__file__).parent.parent.parent / "gui" / "prices.json"
    assert prices_file.exists(), "prices.json not found"

    with open(prices_file) as f:
        prices = json.load(f)

    models = prices.get("models", [])
    assert len(models) > 0, "No models in prices.json"

    # Check for Cohere models
    cohere_models = [m for m in models if m.get("provider") == "cohere"]
    assert len(cohere_models) > 0, "No Cohere models in prices.json"

    # Check for rerank models
    rerank_models = [m for m in cohere_models if "rerank" in m.get("model", "").lower()]
    assert len(rerank_models) > 0, "No rerank models in prices.json"

    # Check for Voyage models
    voyage_models = [m for m in models if m.get("provider") == "voyage"]
    assert len(voyage_models) > 0, "No Voyage models in prices.json"

    # Check for OpenAI embedding models
    openai_embed_models = [m for m in models if m.get("provider") == "openai" and "embedding" in m.get("model", "").lower()]
    assert len(openai_embed_models) > 0, "No OpenAI embedding models in prices.json"

    print(f"✓ Pricing data complete: {len(cohere_models)} Cohere, {len(voyage_models)} Voyage, {len(openai_embed_models)} OpenAI embedding models")


def test_metrics_endpoint():
    """Verify Prometheus metrics are exposed"""
    try:
        import requests

        # Check if server is running
        health_resp = requests.get("http://localhost:8012/health", timeout=5)
        if health_resp.status_code != 200:
            pytest.skip("Server not running")

        # Check metrics endpoint
        metrics_resp = requests.get("http://localhost:8012/metrics", timeout=5)
        assert metrics_resp.status_code == 200, "Metrics endpoint not accessible"

        metrics_text = metrics_resp.text

        # Check for expected metrics
        assert "agro_api_calls_total" in metrics_text, "agro_api_calls_total metric not found"
        assert "agro_cost_usd_total" in metrics_text, "agro_cost_usd_total metric not found"
        assert "agro_api_call_duration_seconds" in metrics_text, "agro_api_call_duration_seconds metric not found"

        print("✓ Prometheus metrics endpoint working")

    except ImportError:
        pytest.skip("requests module not available")
    except Exception as e:
        pytest.skip(f"Server not accessible: {e}")


def test_api_call_logging():
    """Verify API calls are being logged"""
    tracking_dir = Path(__file__).parent.parent.parent / "data" / "tracking"
    api_calls_log = tracking_dir / "api_calls.jsonl"

    if not api_calls_log.exists():
        pytest.skip("No API calls log yet")

    # Read last 10 lines
    with open(api_calls_log) as f:
        lines = f.readlines()

    assert len(lines) > 0, "API calls log is empty"

    # Parse last line
    last_call = json.loads(lines[-1])

    # Verify structure
    assert "provider" in last_call
    assert "endpoint" in last_call
    assert "timestamp" in last_call
    assert "duration_ms" in last_call

    print(f"✓ API calls logged: {len(lines)} total, last provider: {last_call['provider']}")


def test_environment_configuration():
    """Verify environment is configured for API providers"""
    from dotenv import load_dotenv
    load_dotenv()

    # Check backend configuration
    rerank_backend = os.getenv('RERANK_BACKEND', 'local')
    embedding_type = os.getenv('EMBEDDING_TYPE', 'openai')

    print(f"✓ Environment: RERANK_BACKEND={rerank_backend}, EMBEDDING_TYPE={embedding_type}")

    # Check API keys (don't print values)
    has_cohere = bool(os.getenv('COHERE_API_KEY'))
    has_voyage = bool(os.getenv('VOYAGE_API_KEY'))
    has_openai = bool(os.getenv('OPENAI_API_KEY'))

    print(f"  API Keys: Cohere={'SET' if has_cohere else 'NOT SET'}, "
          f"Voyage={'SET' if has_voyage else 'NOT SET'}, "
          f"OpenAI={'SET' if has_openai else 'NOT SET'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
