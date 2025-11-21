from fastapi.testclient import TestClient
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app import app  # type: ignore


def test_trace_steps_jsonl_written(tmp_path, monkeypatch):
    # Avoid Qdrant and reranker to keep it light
    monkeypatch.setenv("VECTOR_BACKEND", "faiss")
    monkeypatch.setenv("RERANK_BACKEND", "none")

    client = TestClient(app)
    r = client.get("/search", params={"q": "bm25 test", "repo": "agro", "top_k": 5})
    assert r.status_code == 200

    # Use the default tracker path to avoid import-time binding issues
    from server.api_tracker import TRACE_STEPS_LOG  # type: ignore
    log_path = Path(str(TRACE_STEPS_LOG))
    assert log_path.exists(), "trace_steps.jsonl not found"
    lines = [json.loads(ln) for ln in log_path.read_text(encoding="utf-8").strip().splitlines() if ln.strip()]
    steps = [e.get("step") for e in lines]
    # Expect at least bm25, hydrate; vector still logged but may be near-zero when faiss
    assert any(s == "bm25_search" for s in steps)
    assert any(s == "vector_search" for s in steps)
