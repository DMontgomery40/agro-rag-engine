from fastapi.testclient import TestClient


def _get_app():
    try:
        from server.asgi import create_app  # type: ignore
        return create_app()
    except Exception:
        from server.app import app  # type: ignore
        return app


def test_loki_status_endpoint_exists():
    app = _get_app()
    cl = TestClient(app)
    r = cl.get("/api/loki/status")
    # Endpoint should exist and return JSON with reachable flag
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "reachable" in data
