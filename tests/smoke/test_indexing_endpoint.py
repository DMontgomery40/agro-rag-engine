"""Smoke test for indexing endpoint - verify 'Run Indexer' button works"""

import requests
import json
import time


BASE_URL = "http://127.0.0.1:8012"


def test_indexing_endpoint_returns_success():
    """Verify /api/index/start endpoint returns success fields"""
    response = requests.post(
        f"{BASE_URL}/api/index/start",
        json={"repo": "agro"},
        timeout=10
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"

    # Check for expected success fields
    assert "ok" in data, "Response must contain 'ok' field"
    assert "success" in data, "Response must contain 'success' field"
    assert "message" in data, "Response must contain 'message' field"

    # Verify values
    assert data["ok"] is True, "ok should be True"
    assert data["success"] is True, "success should be True"
    assert "Indexing started" in data["message"], "message should indicate indexing started"

    print(f"✅ /api/index/start returned success fields")
    print(f"   - ok: {data['ok']}")
    print(f"   - success: {data['success']}")
    print(f"   - message: {data['message']}")

    return True


def test_indexing_frontend_compatibility():
    """Verify response matches what frontend expects"""
    response = requests.post(
        f"{BASE_URL}/api/index/start",
        json={"repo": "agro"},
        timeout=10
    )

    data = response.json()

    # Frontend checks for these fields at line 169 of indexing.js:
    # if (data.success || data.pid)
    frontend_satisfied = data.get("success") or data.get("pid")

    assert frontend_satisfied, "Frontend requires 'success' or 'pid' field"

    print(f"✅ Response satisfies frontend expectations")
    print(f"   Frontend checks: (data.success || data.pid)")
    print(f"   data.success = {data.get('success')}")

    return True


def test_index_status_endpoint():
    """Verify /api/index/status endpoint exists and returns data"""
    response = requests.get(f"{BASE_URL}/api/index/status", timeout=10)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    print(f"✅ /api/index/status returns: {data}")

    return True


def test_indexing_button_in_gui():
    """Verify indexing button exists in GUI"""
    response = requests.get(f"{BASE_URL}/gui/index.html", timeout=10)

    assert response.status_code == 200, "GUI should load"

    html = response.text
    assert "btn-index-start" in html or "run-indexer" in html.lower(), \
        "GUI should have indexing button"

    print(f"✅ Indexing button found in GUI")

    return True


if __name__ == "__main__":
    print("Running indexing endpoint tests...\n")

    try:
        test_indexing_endpoint_returns_success()
        print()
        test_indexing_frontend_compatibility()
        print()
        test_index_status_endpoint()
        print()
        test_indexing_button_in_gui()

        print("\n✅ ALL INDEXING ENDPOINT TESTS PASSED!")
        print("\n🔧 Fix Applied:")
        print("   - Backend now returns 'success: true' field")
        print("   - Frontend checks for this field (line 169 of indexing.js)")
        print("   - 'Run Indexer' button should now work")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
