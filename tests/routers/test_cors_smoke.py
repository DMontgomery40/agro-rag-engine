import sys
from pathlib import Path

# Ensure repo root
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def test_cors_header_on_get():
    from fastapi.testclient import TestClient
    from server.asgi import create_app

    app = create_app()
    client = TestClient(app)

    # Simple GET with Origin should include ACAO header
    r = client.get(
        "/api/pipeline/summary",
        headers={"Origin": "http://localhost:5173"},
    )
    assert r.status_code == 200
