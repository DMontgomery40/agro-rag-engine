#!/usr/bin/env python3
import requests
import json

url = "http://127.0.0.1:8012/api/chat"
payload = {"question": "hello", "repo": "agro"}

response = requests.post(url, json=payload, timeout=30)
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"Body: {response.text}")

try:
    data = response.json()
    print(f"\nParsed JSON:")
    print(json.dumps(data, indent=2))
except:
    print("\nCouldn't parse as JSON")
