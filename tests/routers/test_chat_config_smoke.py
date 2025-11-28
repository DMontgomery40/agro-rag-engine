from fastapi.testclient import TestClient
from server.app import app
from common.paths import repo_root


def test_chat_config_roundtrip():
    client = TestClient(app)

    # Initial GET should succeed and return a JSON object
    r = client.get('/api/chat/config')
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

    payload = {
        "model": "gpt-4o-mini",
        "temperature": 0.2,
        "maxTokens": 800,
        "streaming": True,
    }
    r = client.post('/api/chat/config', json=payload)
    assert r.status_code == 200
    assert r.json().get('ok') is True

    r = client.get('/api/chat/config')
    assert r.status_code == 200
    data = r.json()
    # Basic keys round-trip
    for k, v in payload.items():
        assert data.get(k) == v


def test_chat_template_save():
    client = TestClient(app)
    r = client.post('/api/chat/templates', json={"name": "Default", "prompt": "You are helpful."})
    assert r.status_code == 200
    assert r.json().get('ok') is True

