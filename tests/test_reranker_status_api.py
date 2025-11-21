import os
import requests

API = os.environ.get("AGRO_API_URL", "http://127.0.0.1:8012")


def test_reranker_status_shape():
    r = requests.get(f"{API}/api/reranker/status", timeout=10)
    assert r.status_code == 200
    data = r.json()

    for key in ["running", "task", "progress", "message", "result", "live_output"]:
        assert key in data, f"missing key: {key}"

    assert isinstance(data["running"], bool)
    assert isinstance(data["task"], str)
    assert isinstance(data["progress"], (int, float))
    assert isinstance(data["message"], str)
    assert isinstance(data["live_output"], list)

