from fastapi.testclient import TestClient

from server.asgi import create_app


def test_scan_hw_smoke():
    app = create_app()
    client = TestClient(app)

    resp = client.post("/api/scan-hw")
    assert resp.status_code == 200
    data = resp.json()

    # Top-level structure
    assert isinstance(data, dict)
    assert "info" in data and "runtimes" in data and "tools" in data

    info = data["info"]
    assert isinstance(info, dict)
    # Minimal keys present
    for k in ["os", "arch", "cpu_cores", "mem_gb"]:
        assert k in info

