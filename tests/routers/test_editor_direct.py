from fastapi.testclient import TestClient
from server.app import app


def test_editor_health_and_settings_roundtrip(tmp_path, monkeypatch):
    client = TestClient(app)

    # Health should return JSON and not crash even when no status.json present
    r = client.get('/health/editor')
    assert r.status_code == 200
    data = r.json()
    assert 'ok' in data and 'enabled' in data

    # Settings round-trip
    r2 = client.get('/api/editor/settings')
    assert r2.status_code == 200
    s = r2.json()
    assert 'ok' in s and 'port' in s and 'enabled' in s
    new_port = int(s['port']) + 1
    r3 = client.post('/api/editor/settings', json={"port": new_port, "enabled": True, "host": "127.0.0.1"})
    assert r3.status_code == 200
    s2 = client.get('/api/editor/settings').json()
    assert int(s2['port']) == new_port

