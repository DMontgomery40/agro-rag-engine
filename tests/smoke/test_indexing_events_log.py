from fastapi.testclient import TestClient
from pathlib import Path
import json, time, sys

# Ensure repo root on path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app import app  # type: ignore


def test_indexing_events_jsonl_written(tmp_path, monkeypatch):
    # Redirect tracking dir to temp
    track_dir = tmp_path / "data" / "tracking"
    track_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("TRACKING_DIR", str(track_dir))

    client = TestClient(app)
    r = client.post("/api/index/start", json={"skip_dense": True})
    assert r.status_code == 200

    # Wait briefly for background thread to finish
    deadline = time.time() + 30
    log_path = track_dir / "indexing_events.jsonl"
    while time.time() < deadline and not log_path.exists():
        time.sleep(0.5)

    assert log_path.exists(), "indexing_events.jsonl not found"
    lines = log_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) >= 1
    evt = json.loads(lines[-1])
    assert evt.get("type") == "indexing_event"
    assert set(evt.get("phases", {}).keys()) >= {"collect_s", "chunk_s", "bm25_s", "embed_s", "upsert_s"}
    assert evt.get("chunk_count") is not None

