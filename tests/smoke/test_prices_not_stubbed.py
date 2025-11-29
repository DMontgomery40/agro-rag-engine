"""
Ensure /api/prices returns a real catalog (not the tiny stub) with GEN/EMB/RERANK coverage.
"""

from typing import Any, Dict, List, Set

import pytest
from fastapi.testclient import TestClient
from server.services.config_store import _classify_components


def _components(m: Dict[str, Any]) -> set[str]:
    comps = set(m.get("components") or [])
    if not comps:
        comps = set(_classify_components(m))
    return comps


@pytest.mark.smoke
def test_prices_not_stubbed():
    try:
        from server.asgi import create_app  # type: ignore
    except Exception:
        pytest.skip("ASGI app not importable")

    app = create_app()
    client = TestClient(app)

    r = client.get("/api/prices")
    assert r.status_code == 200, f"/api/prices returned {r.status_code}"
    data = r.json()
    models = data.get("models") or []

    # Reject the tiny default stub (<=5 models)
    assert len(models) > 5, "prices catalog appears stubbed (<=5 models)"

    # Require component coverage for pickers
    comps: Set[str] = set()
    for m in models:
        comps.update(_components(m))
    assert "GEN" in comps, "prices catalog missing GEN models"
    assert "EMB" in comps, "prices catalog missing EMB models"
    assert "RERANK" in comps, "prices catalog missing RERANK models"

    # Require provider coverage for cloud pickers
    providers = {str(m.get("provider") or "").lower() for m in models}
    assert "openai" in providers, "prices catalog missing openai provider"
    assert "cohere" in providers, "prices catalog missing cohere provider"
    assert "voyage" in providers or "voyageai" in providers, "prices catalog missing voyage provider"
    assert "local" in providers, "prices catalog missing local provider"

    # Require at least one local reranker entry (AGRO cross-encoder)
    assert any(
        (m.get("provider") or "").lower() in {"local", "hf", "huggingface"}
        and "cross-encoder-agro" in str(m.get("model") or "").lower()
        for m in models
    ), "prices catalog missing AGRO cross-encoder reranker entry"
