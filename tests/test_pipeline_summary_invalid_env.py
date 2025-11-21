import os
from fastapi.testclient import TestClient

from server.asgi import create_app


def test_pipeline_summary_handles_invalid_top_k_env():
    # Set invalid env values that would previously cause ValueError
    os.environ["FINAL_K"] = "notanint"
    os.environ["LANGGRAPH_FINAL_K"] = "also_bad"

    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/pipeline/summary")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        # Should fall back to default 10 on bad env values
        assert data.get("retrieval", {}).get("top_k") == 10

    # Cleanup
    os.environ.pop("FINAL_K", None)
    os.environ.pop("LANGGRAPH_FINAL_K", None)
