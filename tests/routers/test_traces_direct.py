from fastapi.testclient import TestClient
from server.app import app


def test_traces_list_and_latest():
    client = TestClient(app)
    r = client.get('/api/traces')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert 'repo' in data and 'files' in data
    assert isinstance(data['files'], list)

    r2 = client.get('/api/traces/latest')
    assert r2.status_code == 200
    latest = r2.json()
    assert 'repo' in latest
    assert 'trace' in latest  # may be None if no traces yet

