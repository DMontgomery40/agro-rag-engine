from fastapi.testclient import TestClient
from server.app import app


def test_search_endpoint_returns_results():
    client = TestClient(app)
    r = client.get('/search?q=test&repo=agro&top_k=5')
    assert r.status_code == 200
    data = r.json()
    assert 'results' in data
    assert isinstance(data['results'], list)
