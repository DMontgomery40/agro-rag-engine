"""
Smoke check to ensure configured models exist in the prices catalog.

This guards against broken dropdowns caused by GEN/EMB/RERANK models
referencing ids that are missing from models.json.
"""

from typing import Any, Dict, List

from fastapi.testclient import TestClient


def _norm(val: Any) -> str:
    return str(val or "").strip()


def _lower(val: Any) -> str:
    return _norm(val).lower()


def _find_model(models: List[Dict[str, Any]], model_id: str, component: str, provider: str | None = None) -> bool:
    mid = _lower(model_id)
    prov = _lower(provider) if provider else None
    for m in models:
        comps = set(m.get("components") or [])
        if component not in comps:
            continue
        if prov and _lower(m.get("provider")) != prov:
            continue
        if _lower(m.get("model")) == mid:
            return True
    return False


def test_config_models_exist_in_prices():
    try:
        from server.asgi import create_app  # type: ignore
    except Exception:
        pytest.skip("ASGI app not importable")

    app = create_app()
    client = TestClient(app)

    prices_resp = client.get("/api/models")
    assert prices_resp.status_code == 200, "/api/models unavailable"
    prices = prices_resp.json()
    models = prices.get("models") or []
    assert models, "prices catalog is empty"
    assert all(m.get("components") for m in models), "prices models missing components classification"

    cfg_resp = client.get("/api/config")
    assert cfg_resp.status_code == 200, "/api/config unavailable"
    env: Dict[str, Any] = cfg_resp.json().get("env") or {}

    # Generation model must exist in prices if configured
    gen_model = _norm(env.get("GEN_MODEL"))
    if gen_model:
        assert _find_model(models, gen_model, "GEN"), f"GEN_MODEL '{gen_model}' not found in prices catalog"

    # Embedding model must exist in prices if configured
    embed_model = _norm(env.get("EMBEDDING_MODEL"))
    if embed_model:
        assert _find_model(models, embed_model, "EMB"), f"EMBEDDING_MODEL '{embed_model}' not found in prices catalog"

    # Reranker model must exist in prices if configured
    rr_backend = _lower(env.get("RERANK_BACKEND") or env.get("RERANKER_BACKEND"))
    if rr_backend:
        if rr_backend in {"cohere", "voyage"}:
            rr_model = _norm(env.get("COHERE_RERANK_MODEL") if rr_backend == "cohere" else env.get("VOYAGE_RERANK_MODEL"))
            if rr_model:
                assert _find_model(models, rr_model, "RERANK", provider=rr_backend), f"{rr_backend} rerank model '{rr_model}' not in prices catalog"
        elif rr_backend in {"local", "hf", "ollama"}:
            rr_model = _norm(env.get("RERANK_MODEL") or env.get("RERANKER_MODEL"))
            if rr_model:
                assert _find_model(models, rr_model, "RERANK"), f"Local rerank model '{rr_model}' not in prices catalog"
        elif rr_backend == "learning":
            # Learning reranker may not appear in models.json; skip
            pass
        else:
            # Unknown backend; assert nothing
            pass
