import os
import time
from fastapi.testclient import TestClient

from server.app import app


def test_indexer_bm25_smoke_start_and_status():
    """Backend smoke: start indexer (BM25-only) and await success.

    Validates that the server launches the indexer with correct env (REPO_ROOT),
    and that /api/index/status reports completion with nonzero chunk_count.
    """
    # Ensure repo context is set
    os.environ.setdefault("REPO", "agro")

    client = TestClient(app)

    # Start indexer in BM25-only mode to avoid external deps
    r = client.post("/api/index/start", json={"skip_dense": True})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("success") is True

    # Poll status until completion (max ~90s)
    deadline = time.time() + 90
    lines = []
    meta = {}
    while time.time() < deadline:
        s = client.get("/api/index/status")
        assert s.status_code == 200
        payload = s.json()
        lines = payload.get("lines") or []
        running = bool(payload.get("running"))
        meta = payload.get("metadata") or {}
        if not running and any("completed successfully" in str(x) for x in lines):
            break
        time.sleep(1.0)

    # Must have succeeded and produced chunks
    assert any("completed successfully" in str(x) for x in lines), f"Status lines: {lines}"
    # Expect at least one repo entry with chunk_count > 0
    repos = meta.get("repos") or []
    assert any((r.get("chunk_count") or 0) > 0 for r in repos), f"Metadata: {meta}"

