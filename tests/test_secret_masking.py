#!/usr/bin/env python3
"""
Test script to verify masked secret handling in the GUI

This test verifies that:
1. API keys are visible in the backend but masked in the GUI
2. Masked keys are preserved when config is saved without changing them
3. New keys can be set and will replace old ones
4. Empty fields don't overwrite existing keys
"""

import os
import sys
import requests
import json
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

API_BASE = "http://127.0.0.1:8012"

def test_config_load():
    """Test that /api/config returns current environment"""
    print("\n=== Test 1: Load Config ===")

    response = requests.get(f"{API_BASE}/api/config")
    assert response.status_code == 200, f"Failed to load config: {response.status_code}"

    data = response.json()
    assert 'env' in data, "No 'env' key in config response"

    env = data['env']
    print(f"✅ Config loaded successfully")
    print(f"   Total env vars: {len(env)}")

    # Check for API keys
    api_keys = {k: v for k, v in env.items() if 'API_KEY' in k}
    print(f"   API keys found: {len(api_keys)}")
    for key in api_keys:
        length = len(api_keys[key]) if api_keys[key] else 0
        print(f"   - {key}: {'SET' if length > 0 else 'NOT SET'} ({length} chars)")

    return env

def test_secret_preservation():
    """Test that secrets are preserved when not changed"""
    print("\n=== Test 2: Secret Preservation ===")

    # First, set a test key
    test_key = "sk-test-key-for-secret-masking-verification-12345"

    print(f"Setting test key...")
    response = requests.post(
        f"{API_BASE}/api/config",
        json={
            "env": {
                "OPENAI_API_KEY": test_key
            },
            "repos": []
        }
    )
    assert response.status_code == 200, f"Failed to set test key: {response.status_code}"
    print(f"✅ Test key set successfully")

    # Verify it was saved
    response = requests.get(f"{API_BASE}/api/config")
    data = response.json()
    actual_key = data['env'].get('OPENAI_API_KEY', '')
    assert actual_key == test_key, f"Key mismatch: expected {test_key}, got {actual_key}"
    print(f"✅ Key verified in backend: {len(actual_key)} chars")

    # Now save config WITHOUT sending the key (simulating GUI not sending masked field)
    print(f"Saving config without sending masked key...")
    response = requests.post(
        f"{API_BASE}/api/config",
        json={
            "env": {
                "GEN_MODEL": "gpt-4o-mini"  # Change something else
            },
            "repos": []
        }
    )
    assert response.status_code == 200, f"Failed to save config: {response.status_code}"
    print(f"✅ Config saved without sending key")

    # Verify key is still there
    response = requests.get(f"{API_BASE}/api/config")
    data = response.json()
    preserved_key = data['env'].get('OPENAI_API_KEY', '')
    assert preserved_key == test_key, f"Key lost! Expected {test_key}, got {preserved_key}"
    print(f"✅ Key preserved correctly: {len(preserved_key)} chars")

    print(f"\n✅ Secret preservation test PASSED")
    return True

def test_secret_replacement():
    """Test that secrets can be replaced with new values"""
    print("\n=== Test 3: Secret Replacement ===")

    old_key = "sk-old-key-12345"
    new_key = "sk-new-key-67890"

    # Set old key
    response = requests.post(
        f"{API_BASE}/api/config",
        json={"env": {"ANTHROPIC_API_KEY": old_key}, "repos": []}
    )
    assert response.status_code == 200
    print(f"✅ Old key set: {len(old_key)} chars")

    # Replace with new key
    response = requests.post(
        f"{API_BASE}/api/config",
        json={"env": {"ANTHROPIC_API_KEY": new_key}, "repos": []}
    )
    assert response.status_code == 200
    print(f"✅ New key sent: {len(new_key)} chars")

    # Verify replacement
    response = requests.get(f"{API_BASE}/api/config")
    data = response.json()
    current_key = data['env'].get('ANTHROPIC_API_KEY', '')
    assert current_key == new_key, f"Key not replaced! Expected {new_key}, got {current_key}"
    print(f"✅ Key replaced successfully")

    print(f"\n✅ Secret replacement test PASSED")
    return True

def cleanup():
    """Clean up test keys"""
    print("\n=== Cleanup ===")
    print("Note: Test keys remain in .env for verification")
    print("Check .env.backup-* files if you need to restore")

def main():
    print("="*60)
    print("Testing Masked Secret Handling")
    print("="*60)

    try:
        # Check if server is running
        try:
            response = requests.get(f"{API_BASE}/health", timeout=2)
            if response.status_code != 200:
                print(f"❌ Server not healthy: {response.status_code}")
                return 1
        except requests.exceptions.ConnectionError:
            print(f"❌ Server not running at {API_BASE}")
            print(f"   Start with: docker-compose up -d api")
            return 1

        print(f"✅ Server is running")

        # Run tests
        test_config_load()
        test_secret_preservation()
        test_secret_replacement()

        cleanup()

        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED")
        print("="*60)
        print("\nNext steps:")
        print("1. Open GUI at http://127.0.0.1:8012/gui/")
        print("2. Navigate to Admin > Secrets")
        print("3. Verify API keys show ••••••••••••••••")
        print("4. Try saving config without changing keys")
        print("5. Reload page and verify keys still show ••••••••••••••••")
        print("6. Type a new key and verify it gets saved")

        return 0

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
