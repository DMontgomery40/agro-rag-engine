import os
import requests


BASE_URL = os.getenv("API_BASE", "http://127.0.0.1:8012").rstrip("/")


def test_config_schema_endpoint_shape():
    resp = requests.get(f"{BASE_URL}/api/config-schema", timeout=5)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "schema" in data and isinstance(data["schema"], dict)
    assert "ui" in data and isinstance(data["ui"], dict)
    assert "values" in data and isinstance(data["values"], dict)
    # quick presence checks
    assert "generation" in data["values"]
    assert "retrieval" in data["values"]
    assert "reranker" in data["values"]
    assert "enrichment" in data["values"]
    assert "repo" in data["values"]

