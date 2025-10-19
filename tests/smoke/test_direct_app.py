#!/usr/bin/env python3
"""Test app directly via TestClient"""
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)

try:
    response = client.post("/api/chat", json={"question": "test", "repo": "agro"})
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Body: {response.text[:1000]}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
