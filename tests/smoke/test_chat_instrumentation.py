#!/usr/bin/env python3
"""Test chat endpoint instrumentation"""
import requests
import json

url = "http://localhost:8012/api/chat"
payload = {"question": "test", "repo": "agro"}

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Body: {response.text[:500]}")

    # Check for X-Provider and X-Model headers
    if "X-Provider" in response.headers:
        print(f"✓ X-Provider: {response.headers['X-Provider']}")
    else:
        print("✗ X-Provider header missing")

    if "X-Model" in response.headers:
        print(f"✓ X-Model: {response.headers['X-Model']}")
    else:
        print("✗ X-Model header missing")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
