#!/usr/bin/env python3
"""Verification test for VS Code iframe fix"""
import requests
import time

print("=" * 60)
print("  VS Code Iframe Fix Verification")
print("=" * 60)

# Test 1: Health check returns ready
print("\n[TEST 1] Health check returns ready state")
resp = requests.get('http://127.0.0.1:8012/health/editor')
data = resp.json()
print(f"Response: {data}")

assert data['ok'] == True, f"Expected ok=True, got {data['ok']}"
assert data['readiness_stage'] == 'ready', f"Expected readiness_stage='ready', got {data['readiness_stage']}"
print("✓ Health check returns ready")

# Test 2: VS Code server accessible via reverse proxy
print("\n[TEST 2] VS Code accessible via reverse proxy")
resp = requests.get('http://127.0.0.1:8012/editor/', allow_redirects=False, timeout=5)
print(f"Reverse proxy status: {resp.status_code}")
assert 200 <= resp.status_code < 400, f"Expected 2xx/3xx, got {resp.status_code}"
print("✓ Reverse proxy works")

# Test 3: Direct VS Code server responds
print("\n[TEST 3] Direct VS Code server responds")
resp = requests.get('http://127.0.0.1:4440', allow_redirects=False, timeout=5)
print(f"Direct server status: {resp.status_code}")
assert resp.status_code in [200, 302], f"Expected 200 or 302, got {resp.status_code}"
print("✓ VS Code server responds")

print("\n" + "=" * 60)
print("  All Verification Tests Passed!")
print("=" * 60)
print("\n✅ VS Code iframe should now load correctly in the GUI")
print("✅ Navigate to http://127.0.0.1:8012/gui/ → VS Code tab")
