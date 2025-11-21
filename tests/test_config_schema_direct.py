from fastapi.testclient import TestClient
from server.app import app


def test_config_schema_direct_import():
    client = TestClient(app)
    r = client.get('/api/config-schema')
    assert r.status_code == 200
    data = r.json()
    assert 'schema' in data and 'values' in data and 'ui' in data
    assert 'generation' in data['values']
    assert 'retrieval' in data['values']
    assert 'reranker' in data['values']
