from fastapi.testclient import TestClient
from server.app import app


def test_pipeline_summary_direct_import():
    client = TestClient(app)
    r = client.get('/api/pipeline/summary')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert 'repo' in data and 'retrieval' in data and 'reranker' in data
    assert 'enrichment' in data and 'generation' in data and 'health' in data
