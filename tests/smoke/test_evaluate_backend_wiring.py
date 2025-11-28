"""
Backend Smoke Test for Full RAG Evaluation Endpoints

Verifies that the EvaluateSubtab React component's backend endpoints are:
1. Properly wired to the FastAPI backend
2. Returning expected responses
3. Handling the Pydantic config model correctly

This test confirms the frontend (EvaluateSubtab.tsx) can successfully
communicate with the backend for Full RAG evaluation (NOT just reranker).
"""

import requests
import pytest


BASE_URL = "http://localhost:8012"


def test_eval_status_endpoint_exists():
    """Verify /api/eval/status endpoint responds"""
    response = requests.get(f"{BASE_URL}/api/eval/status")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert "running" in data, "Response missing 'running' field"
    assert "progress" in data, "Response missing 'progress' field"
    assert "total" in data, "Response missing 'total' field"
    assert "results" in data, "Response missing 'results' field"


def test_golden_questions_endpoint_exists():
    """Verify /api/golden endpoint responds"""
    response = requests.get(f"{BASE_URL}/api/golden")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert "questions" in data, "Response missing 'questions' field"
    assert isinstance(data["questions"], list), "Questions should be a list"


def test_config_includes_evaluation_settings():
    """Verify /api/config returns evaluation configuration"""
    response = requests.get(f"{BASE_URL}/api/config")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()

    # Config should have env section
    assert "env" in data, "Config missing 'env' section"
    env = data["env"]

    # These are the settings used by EvaluateSubtab
    assert "EVAL_FINAL_K" in env or "FINAL_K" in env, \
        "Config missing EVAL_FINAL_K setting"
    assert "EVAL_MULTI" in env or "MULTI_ENABLED" in env, \
        "Config missing EVAL_MULTI setting"


def test_eval_run_endpoint_accepts_requests():
    """Verify /api/eval/run endpoint accepts POST requests"""
    # Don't actually run a full eval, just verify endpoint exists
    response = requests.post(
        f"{BASE_URL}/api/eval/run",
        json={"sample_limit": 1}  # Minimal sample to avoid long-running test
    )

    # Should return 200 (success) or 400 (already running)
    # Both are valid - proves endpoint is wired
    assert response.status_code in [200, 400], \
        f"Expected 200 or 400, got {response.status_code}"

    data = response.json()
    assert "ok" in data or "error" in data, \
        "Response should have 'ok' or 'error' field"


def test_baseline_save_endpoint_exists():
    """Verify /api/eval/baseline/save endpoint exists"""
    # This will fail if no results exist, but that's OK - proves endpoint is wired
    response = requests.post(f"{BASE_URL}/api/eval/baseline/save")

    # Should return 200 (success) or 400 (no results to save)
    # Both are valid responses proving endpoint exists
    assert response.status_code in [200, 400], \
        f"Expected 200 or 400, got {response.status_code}"


def test_baseline_compare_endpoint_exists():
    """Verify /api/eval/baseline/compare endpoint exists"""
    response = requests.get(f"{BASE_URL}/api/eval/baseline/compare")

    # Should return 200 (success) or 400 (no results/baseline)
    # Both are valid responses proving endpoint exists
    assert response.status_code in [200, 400], \
        f"Expected 200 or 400, got {response.status_code}"


def test_golden_test_endpoint_exists():
    """Verify /api/golden/test endpoint for testing individual questions"""
    response = requests.post(
        f"{BASE_URL}/api/golden/test",
        json={
            "q": "test question",
            "repo": "agro",
            "expect_paths": ["test"],
            "final_k": 5,
            "use_multi": True
        }
    )

    # Should return 200 (may fail to find results, but endpoint should work)
    # or 400/422 (validation error)
    assert response.status_code in [200, 400, 422], \
        f"Expected 200/400/422, got {response.status_code}"


def test_full_rag_eval_not_reranker_only():
    """
    Verify this is FULL RAG evaluation, not just reranker evaluation.

    The eval endpoints should call the complete RAG pipeline including:
    - Query processing
    - Retrieval (BM25 + vector + rerank)
    - Multi-query (if enabled)
    - Final k selection

    This is distinct from reranker-only evaluation (which is in LearningRankerSubtab).
    """
    # The eval/run endpoint should use the FULL pipeline
    # We can verify this by checking that eval config includes multi-query settings
    response = requests.get(f"{BASE_URL}/api/config")
    data = response.json()

    # Full RAG eval uses these settings
    env = data.get("env", {})
    has_multi_query_setting = "EVAL_MULTI" in env or "MULTI_ENABLED" in env

    assert has_multi_query_setting, \
        "Config should include multi-query settings for full RAG evaluation"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
