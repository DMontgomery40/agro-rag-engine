"""Smoke test for cards display improvements - verify cards render properly"""

import requests
import json


BASE_URL = "http://127.0.0.1:8012"


def test_cards_api_returns_data():
    """Verify /api/cards endpoint returns valid data"""
    response = requests.get(f"{BASE_URL}/api/cards", timeout=10)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"
    assert "cards" in data, "Response must contain 'cards' field"
    assert isinstance(data["cards"], list), "Cards should be a list"
    assert len(data["cards"]) > 0, "Should have at least one card"

    # Verify each card has required fields
    for card in data["cards"][:3]:
        assert "file_path" in card, "Card must have file_path"
        assert "purpose" in card, "Card must have purpose"
        assert "symbols" in card or "file_path" in card, "Card must have symbols or file_path"

    print(f"✅ Cards API returned {len(data['cards'])} cards")
    return True


def test_cards_container_accessible():
    """Verify cards container HTML is properly structured"""
    response = requests.get(f"{BASE_URL}/gui/index.html", timeout=10)

    assert response.status_code == 200, "GUI should load"

    html = response.text
    assert "cards-viewer-container" in html, "Should have cards-viewer-container div"
    assert "cards-viewer" in html, "Should have cards-viewer div"
    assert 'id="cards-viewer"' in html, "cards-viewer should have id attribute"

    # Verify grid layout is present
    assert "grid" in html and "cards-viewer" in html, "Grid layout should be configured"

    print("✅ Cards container HTML is properly structured")
    return True


def test_cards_styling_improvements():
    """Verify cards styling improvements are in place"""
    response = requests.get(f"{BASE_URL}/gui/js/cards.js", timeout=10)

    assert response.status_code == 200, "cards.js should load"

    js = response.text

    # Verify new styling attributes are present
    assert "min-height: 180px" in js or "minHeight" in js, "Cards should have min-height"
    assert "flex" in js or "flexbox" in js or "flex-direction" in js, "Cards should use flexbox"
    assert "box-shadow" in js, "Cards should have box-shadow"
    assert "justify-content: space-between" in js, "Cards should have space-between layout"

    print("✅ Card styling improvements are in place")
    return True


def test_cards_debug_logging():
    """Verify debug logging is added for troubleshooting"""
    response = requests.get(f"{BASE_URL}/gui/js/cards.js", timeout=10)

    assert response.status_code == 200, "cards.js should load"

    js = response.text

    # Verify debug logging
    assert "console.log" in js, "Should have console logging"
    assert "[cards.js]" in js, "Should have cards.js debug prefix"

    print("✅ Debug logging is present")
    return True


if __name__ == "__main__":
    print("Running cards display verification tests...\n")

    try:
        test_cards_api_returns_data()
        test_cards_container_accessible()
        test_cards_styling_improvements()
        test_cards_debug_logging()

        print("\n✅ ALL CARDS DISPLAY TESTS PASSED!")
        print("\n📝 Next steps:")
        print("1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)")
        print("2. Navigate to RAG → Cards tab")
        print("3. Cards should now display in a proper grid layout")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
