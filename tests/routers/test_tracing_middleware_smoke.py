import sys
from pathlib import Path


# Ensure repo root on path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def test_answer_tracing_smoke():
    from fastapi.testclient import TestClient
    from server.asgi import create_app

    app = create_app()
    client = TestClient(app)

    # Trigger trace via /answer (should not error even without indexes)
    r = client.get("/answer", params={"q": "trace smoke?"})
    assert r.status_code == 200

    # Fetch latest trace
    r2 = client.get("/api/traces/latest")
    assert r2.status_code == 200
    data = r2.json()
    # We expect a dict with 'trace' possibly present; tolerate empty if sampling disabled
    assert isinstance(data, dict)
    # If a trace exists, it should have expected fields
    tr = data.get("trace")
    if tr is not None:
        assert isinstance(tr, dict)
        assert "started_at" in tr
        assert "events" in tr

