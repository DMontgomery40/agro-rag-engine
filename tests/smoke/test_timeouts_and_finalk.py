#!/usr/bin/env python3
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.getcwd())
from server.asgi import create_app  # noqa: E402


def test_config_schema_includes_local_timeouts():
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/config-schema")
    assert r.status_code == 200
    data = r.json()
    gen_props = data.get("schema", {}).get("properties", {}).get("generation", {}).get("properties", {})
    # Newly added keys should be present in schema
    assert "OLLAMA_REQUEST_TIMEOUT" in gen_props
    assert "OLLAMA_STREAM_IDLE_TIMEOUT" in gen_props
    assert "GEN_TIMEOUT" in gen_props
    assert "GEN_RETRY_MAX" in gen_props


def test_chat_finalk_validation_errors():
    app = create_app()
    client = TestClient(app)

    # Non-integer final_k
    r = client.post("/api/chat", json={"question": "q", "final_k": "abc"})
    assert r.status_code == 400
    j = r.json()
    assert "detail" in j and "final_k" in j["detail"]

    # Out of range final_k
    r = client.post("/api/chat", json={"question": "q", "final_k": 0})
    assert r.status_code == 400
    j = r.json()
    assert "final_k" in str(j.get("detail", ""))

    r = client.post("/api/chat", json={"question": "q", "final_k": 201})
    assert r.status_code == 400
    j = r.json()
    assert "final_k" in str(j.get("detail", ""))
