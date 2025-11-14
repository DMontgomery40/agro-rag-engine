import os
import requests

API = os.environ.get("AGRO_API_URL", "http://127.0.0.1:8012")


def test_reranker_triplets_count_non_negative():
    r = requests.get(f"{API}/api/reranker/triplets/count", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "count" in data
    assert isinstance(data["count"], int)
    assert data["count"] >= 0

