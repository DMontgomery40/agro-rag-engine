"""Smoke test for RAG chatbot fix - verify /answer endpoint returns valid JSON"""

import requests
import json


BASE_URL = "http://127.0.0.1:8012"


def test_answer_endpoint_returns_json():
    """Verify /answer endpoint returns valid JSON, not HTML error"""
    response = requests.get(
        f"{BASE_URL}/answer",
        params={"q": "where is the grafana dashboard", "repo": "agro"},
        timeout=30
    )

    # Should be successful
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    # Should be valid JSON
    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"

    # Should have required fields
    assert "answer" in data, "Response must contain 'answer' field"
    assert "event_id" in data, "Response must contain 'event_id' field"

    # Answer should be a non-empty string
    assert isinstance(data["answer"], str), "Answer should be a string"
    assert len(data["answer"]) > 0, "Answer should not be empty"

    # Should NOT contain HTML error markers
    assert not data["answer"].startswith("<!DOCTYPE"), "Should not return HTML"
    assert not data["answer"].startswith("<html"), "Should not return HTML"
    assert "Internal Server Error" not in data["answer"], "Should not have server error"


def test_answer_endpoint_various_queries():
    """Test /answer endpoint with various queries"""
    test_queries = [
        "what is the main file",
        "where is authentication",
        "explain the architecture",
        "how does the system work"
    ]

    for query in test_queries:
        response = requests.get(
            f"{BASE_URL}/answer",
            params={"q": query, "repo": "agro"},
            timeout=30
        )

        # Should be successful
        assert response.status_code == 200, f"Query '{query}' failed with {response.status_code}"

        # Should be valid JSON
        data = response.json()
        assert isinstance(data, dict), f"Query '{query}' did not return JSON object"
        assert "answer" in data, f"Query '{query}' missing answer field"


def test_answer_endpoint_error_handling():
    """Test that /answer endpoint handles errors gracefully"""
    # Test with a short/incomplete query
    response = requests.get(
        f"{BASE_URL}/answer",
        params={"q": "test"},
        timeout=60  # Give more time for processing
    )

    # Should still return JSON, not HTML
    try:
        data = response.json()
        assert isinstance(data, dict), "Error should be returned as JSON"
        assert "answer" in data, "Should have answer field even for short queries"
    except json.JSONDecodeError:
        raise AssertionError("Should return valid JSON, not HTML error")


if __name__ == "__main__":
    # Run tests
    test_answer_endpoint_returns_json()
    print("✅ test_answer_endpoint_returns_json passed")

    test_answer_endpoint_various_queries()
    print("✅ test_answer_endpoint_various_queries passed")

    test_answer_endpoint_error_handling()
    print("✅ test_answer_endpoint_error_handling passed")

    print("\n✅ All smoke tests passed!")
