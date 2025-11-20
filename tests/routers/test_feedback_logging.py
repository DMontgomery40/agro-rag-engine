from fastapi.testclient import TestClient
from pathlib import Path
import json, sys


def test_chat_thumbs_feedback_is_logged(tmp_path, monkeypatch):
    """Smoke: /api/chat returns event_id; POST /api/feedback writes to data/logs/queries.jsonl.

    This verifies GUI thumbs up/down can be mined by scripts/mine_triplets.py which reads the same log file.
    """
    # Force logs into a temp dir to avoid polluting real logs
    log_dir = tmp_path / "data" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("AGRO_LOG_PATH", str(log_dir / "queries.jsonl"))

    # Import app AFTER setting env to ensure server.telemetry picks up AGRO_LOG_PATH
    _ROOT = Path(__file__).resolve().parents[2]
    if str(_ROOT) not in sys.path:
        sys.path.insert(0, str(_ROOT))
    from server.app import app  # type: ignore
    client = TestClient(app)

    # Create a query event directly via telemetry (mirrors /search logging)
    from server.telemetry import log_query_event  # type: ignore
    event_id = log_query_event(
        query_raw="indexer subprocess env",
        query_rewritten=None,
        retrieved=[{"doc_id": "server/services/indexing.py:24-40", "score": 1.0, "text": "env=...", "clicked": False}],
        answer_text="",
        latency_ms=5,
        cost_usd=0.0,
        route="/search",
        client_ip=None,
        user_agent=None,
    )

    # Submit thumbs up feedback tied to event_id
    fb = client.post("/api/feedback", json={"event_id": event_id, "signal": "thumbsup"})
    assert fb.status_code == 200, fb.text
    assert fb.json().get("ok") is True

    # Verify the feedback line was appended to the same log the miner reads
    log_path = log_dir / "queries.jsonl"
    assert log_path.exists(), "feedback log file should be created"
    lines = log_path.read_text(encoding="utf-8").strip().splitlines()
    assert any(json.loads(ln).get("type") == "query" for ln in lines), "query event not logged"
    fb_lines = [json.loads(ln) for ln in lines if json.loads(ln).get("type") == "feedback"]
    assert any(evt.get("event_id") == event_id and evt.get("feedback", {}).get("signal") == "thumbsup" for evt in fb_lines), "thumbsup feedback not found in log"
