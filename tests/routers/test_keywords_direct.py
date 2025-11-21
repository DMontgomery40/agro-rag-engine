from fastapi.testclient import TestClient
from server.app import app


def test_keywords_endpoint_shapes():
    client = TestClient(app)
    r = client.get('/api/keywords')
    assert r.status_code == 200
    data = r.json()
    # Should contain lists even if empty
    for key in ['discriminative', 'semantic', 'llm', 'manual', 'keywords']:
        assert key in data
