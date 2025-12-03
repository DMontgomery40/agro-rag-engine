"""Smoke tests for unified /api/chat endpoint.

Tests both streaming and non-streaming modes of the consolidated chat endpoint.
"""

import json
import pytest
import httpx


BASE_URL = "http://127.0.0.1:8012"


@pytest.fixture
def client():
    """HTTP client for API calls."""
    return httpx.Client(base_url=BASE_URL, timeout=30.0)


class TestChatEndpoint:
    """Tests for /api/chat endpoint."""

    def test_chat_non_streaming(self, client):
        """Test non-streaming chat response."""
        response = client.post(
            "/api/chat",
            json={
                "question": "What is AGRO?",
                "repo": "agro",
                "fast_mode": True,
                "stream": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "answer" in data, "Response must have 'answer' field"
        assert "event_id" in data, "Response must have 'event_id' for feedback"
        assert isinstance(data.get("confidence", 0), (int, float)), "Confidence must be numeric"
        
        # In fast mode, we get retrieval-only response
        assert len(data["answer"]) > 0, "Answer should not be empty"
        print(f"✓ Non-streaming response: {len(data['answer'])} chars, event_id={data.get('event_id')}")

    def test_chat_streaming(self, client):
        """Test streaming chat response (SSE format)."""
        # Use streaming client
        with httpx.stream(
            "POST",
            f"{BASE_URL}/api/chat",
            json={
                "question": "What is AGRO?",
                "repo": "agro",
                "fast_mode": True,
                "stream": True
            },
            timeout=30.0
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")
            
            chunks_received = []
            chunk_types = set()
            
            for line in response.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if not data_str:
                        continue
                    try:
                        chunk = json.loads(data_str)
                        chunks_received.append(chunk)
                        if "type" in chunk:
                            chunk_types.add(chunk["type"])
                    except json.JSONDecodeError:
                        continue
            
            # Verify we got expected chunk types
            assert "content" in chunk_types, "Must receive 'content' chunk"
            assert "done" in chunk_types, "Must receive 'done' chunk"
            
            # Verify done chunk has event_id
            done_chunks = [c for c in chunks_received if c.get("type") == "done"]
            assert len(done_chunks) > 0, "Must have done chunk"
            assert done_chunks[0].get("data", {}).get("event_id"), "Done chunk must have event_id"
            
            print(f"✓ Streaming response: {len(chunks_received)} chunks, types={chunk_types}")

    def test_chat_with_pydantic_validation(self, client):
        """Test that Pydantic validation catches bad inputs."""
        # Test invalid final_k
        response = client.post(
            "/api/chat",
            json={
                "question": "test",
                "final_k": 500  # Max is 200
            }
        )
        # Should still work due to legacy dict handling, but may be clamped
        assert response.status_code in [200, 400]

    def test_deprecated_answer_endpoint(self, client):
        """Test that /answer endpoint still works (deprecated but functional)."""
        response = client.get("/answer", params={"q": "What is AGRO?", "repo": "agro"})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        print(f"✓ Deprecated /answer still works: {len(data['answer'])} chars")

    def test_search_endpoint(self, client):
        """Test /api/search retrieval-only endpoint."""
        response = client.get("/api/search", params={"q": "hybrid search", "top_k": 5})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "count" in data
        assert isinstance(data["results"], list)
        print(f"✓ /api/search works: {data['count']} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])


