from fastapi.testclient import TestClient
from server.app import app


def test_index_stats_endpoint_available():
    client = TestClient(app)
    r = client.get('/api/index/stats')
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

