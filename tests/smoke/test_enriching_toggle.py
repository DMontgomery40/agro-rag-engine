"""Smoke test for enriching toggle feature"""

import requests


BASE_URL = "http://127.0.0.1:8012"


def test_enrich_element_in_html():
    """Verify enriching toggle element exists in GUI"""
    response = requests.get(f"{BASE_URL}/gui/index.html", timeout=10)

    assert response.status_code == 200, "GUI should load"

    html = response.text
    assert 'id="index-enrich-chunks"' in html, "Should have enrich toggle element"
    assert "Enrich Code Chunks" in html, "Should have label text"
    assert "adds summaries + keywords" in html, "Should have description"

    print("✅ Enriching toggle element exists in GUI")
    return True


def test_enrich_parameter_accepted():
    """Verify backend accepts enrich parameter"""
    response = requests.post(
        f"{BASE_URL}/api/index/start",
        json={"repo": "agro", "enrich": True, "skip_dense": False},
        timeout=10
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert data.get("success") or data.get("ok"), "Should indicate success"

    print("✅ Backend accepts enrich parameter")
    return True


def test_skip_dense_parameter_still_works():
    """Verify skip_dense parameter still works with enrich"""
    response = requests.post(
        f"{BASE_URL}/api/index/start",
        json={"repo": "agro", "enrich": False, "skip_dense": True},
        timeout=10
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert data.get("success") or data.get("ok"), "Should indicate success"

    print("✅ skip_dense parameter still works")
    return True


def test_js_file_loads():
    """Verify indexing.js loads correctly"""
    response = requests.get(f"{BASE_URL}/gui/js/indexing.js", timeout=10)

    assert response.status_code == 200, "indexing.js should load"

    js = response.text
    assert "index-enrich-chunks" in js, "Should reference enrich element"
    assert "skip_dense" in js, "Should reference skip_dense"

    print("✅ indexing.js loads with enrich references")
    return True


if __name__ == "__main__":
    print("Running enriching toggle verification tests...\n")

    try:
        test_enrich_element_in_html()
        test_enrich_parameter_accepted()
        test_skip_dense_parameter_still_works()
        test_js_file_loads()

        print("\n✅ ALL ENRICHING TOGGLE TESTS PASSED!")
        print("\n📝 Features:")
        print("   ✓ Enriching toggle in indexing settings")
        print("   ✓ Backend accepts enrich parameter")
        print("   ✓ Works alongside skip_dense option")
        print("   ✓ Frontend properly references element")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
