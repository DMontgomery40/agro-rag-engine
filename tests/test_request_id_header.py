from fastapi.testclient import TestClient
from server.app import app


def test_request_id_header_present_on_pipeline_summary():
    client = TestClient(app)
    r = client.get('/api/pipeline/summary')
    assert r.status_code == 200
    assert 'X-Request-ID' in r.headers
    assert len(r.headers['X-Request-ID']) >= 8


def test_request_id_header_present_on_404():
    client = TestClient(app)
    r = client.get('/definitely-not-a-real-route-xyz')
    assert r.status_code == 404
    assert 'X-Request-ID' in r.headers
    assert len(r.headers['X-Request-ID']) >= 8

