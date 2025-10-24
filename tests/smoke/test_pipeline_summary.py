import os
import time
import json
import requests


BASE_URL = os.getenv("API_BASE", "http://127.0.0.1:8012").rstrip("/")


def test_pipeline_summary_endpoint():
    url = f"{BASE_URL}/api/pipeline/summary"
    # Give the server a short grace if starting up
    last_exc = None
    for _ in range(3):
        try:
            resp = requests.get(url, timeout=5)
            assert resp.status_code == 200, f"status={resp.status_code} body={resp.text[:200]}"
            data = resp.json()
            # Minimal shape checks
            assert isinstance(data, dict)
            assert "repo" in data and isinstance(data["repo"], dict)
            assert "retrieval" in data and isinstance(data["retrieval"], dict)
            assert "reranker" in data and isinstance(data["reranker"], dict)
            assert "enrichment" in data and isinstance(data["enrichment"], dict)
            assert "generation" in data and isinstance(data["generation"], dict)
            assert "health" in data and isinstance(data["health"], dict)
            # Required fields exist with sane types
            assert "name" in data["repo"]
            assert "mode" in data["repo"]
            assert "mode" in data["retrieval"]
            return
        except Exception as e:
            last_exc = e
            time.sleep(1)
    raise AssertionError(f"pipeline summary endpoint failed: {last_exc}")

