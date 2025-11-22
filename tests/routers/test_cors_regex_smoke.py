import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def _get(client, origin: str):
    return client.get(
        "/api/pipeline/summary",
        headers={"Origin": origin},
    )


def test_cors_dev_dynamic_ports():
    from fastapi.testclient import TestClient
    from server.asgi import create_app

    app = create_app()
    client = TestClient(app)

    for origin in ["http://localhost:5153", "http://127.0.0.1:5143"]:
        r = _get(client, origin)
        assert r.status_code == 200
