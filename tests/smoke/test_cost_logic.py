import pytest
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)

def test_cost_estimate_rerank_scaling():
    """Verify that rerank cost scales with requests per day."""
    # 3 reranks per request, 100 requests per day. 
    # Cohere 3.5 cost is $0.002 per request.
    # Total daily cost should be 3 * 100 * 0.002 = 0.60
    
    payload = {
        "gen_provider": "openai",
        "gen_model": "gpt-4o-mini", # Cheap generation to not interfere much
        "tokens_in": 0,
        "tokens_out": 0,
        "embeds": 0,
        "rerank_provider": "cohere",
        "rerank_model": "rerank-3.5",
        "reranks": 3,
        "requests_per_day": 100
    }
    
    response = client.post("/api/cost/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    breakdown = data["breakdown"]
    rr = breakdown["rerank"]
    assert rr is not None
    
    # Allow small float point differences
    expected_rr_daily = 3 * 100 * 0.002
    assert abs(rr["cost_daily"] - expected_rr_daily) < 0.0001
    assert abs(data["daily"] - expected_rr_daily) < 0.0001 # Only rerank cost here

def test_cost_estimate_embed_scaling():
    """Verify that embed cost scales with requests per day."""
    # 1000 embed tokens per request, 100 requests per day.
    # OpenAI text-embedding-3-small cost is $0.02 per 1k tokens.
    # Total daily cost should be (1000/1000) * 0.02 * 100 = $2.00
    
    payload = {
        "gen_provider": "openai",
        "gen_model": "gpt-4o-mini",
        "tokens_in": 0,
        "tokens_out": 0,
        "embed_provider": "openai",
        "embed_model": "text-embedding-3-small",
        "embeds": 1000,
        "reranks": 0,
        "requests_per_day": 100
    }
    
    response = client.post("/api/cost/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    breakdown = data["breakdown"]
    emb = breakdown["embeddings"]
    assert emb is not None
    
    expected_emb_daily = (1000/1000.0) * 0.02 * 100
    assert abs(emb["cost_daily"] - expected_emb_daily) < 0.0001
    assert abs(data["daily"] - expected_emb_daily) < 0.0001

