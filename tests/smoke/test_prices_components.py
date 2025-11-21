import json
from typing import Dict, Any

from fastapi.testclient import TestClient


def _get_app():
    try:
        # Prefer modular ASGI app
        from server.asgi import create_app  # type: ignore
        return create_app()
    except Exception:
        # Fallback to monolithic app
        from server.app import app  # type: ignore
        return app


def test_prices_have_components():
    app = _get_app()
    client = TestClient(app)

    r = client.get("/api/prices")
    assert r.status_code == 200, f"/api/prices returned {r.status_code}"
    data: Dict[str, Any] = r.json()

    assert isinstance(data, dict) and isinstance(data.get("models"), list), "prices payload shape invalid"
    models = data["models"]
    assert len(models) > 0, "no models returned from /api/prices"

    # At least one generative model must be tagged GEN
    assert any(isinstance(m.get("components"), list) and ("GEN" in m.get("components", [])) for m in models), "no GEN models tagged"

    # Common known examples from gui/prices.json should classify
    # Embedding
    emb = next((m for m in models if m.get("model") == "text-embedding-3-small"), None)
    if emb:
        assert "EMB" in emb.get("components", []), "embedding model missing EMB component"

    # Reranker
    rr = next((m for m in models if m.get("model") in {"voyage-rerank-2", "rerank-english-v3.0"}), None)
    if rr:
        assert "RERANK" in rr.get("components", []), "rerank model missing RERANK component"

