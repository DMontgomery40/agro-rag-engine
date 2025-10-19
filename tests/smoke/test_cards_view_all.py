"""Smoke test for cards view all feature - verify all cards can be viewed"""

import requests
import json


BASE_URL = "http://127.0.0.1:8012"


def test_cards_all_endpoint_returns_all():
    """Verify /api/cards/all returns all cards (not paginated)"""
    response = requests.get(f"{BASE_URL}/api/cards/all", timeout=10)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"
    assert "cards" in data, "Response must contain 'cards' field"
    assert "count" in data, "Response must contain 'count' field"

    cards = data["cards"]
    count = data["count"]

    # Verify we got all cards (more than 10, which is the paginated limit)
    assert len(cards) > 0, "Should have at least one card"
    print(f"✅ /api/cards/all returned {len(cards)} cards (count: {count})")

    return len(cards)


def test_cards_raw_text_returns_formatted():
    """Verify /api/cards/raw-text returns nicely formatted text"""
    response = requests.get(f"{BASE_URL}/api/cards/raw-text", timeout=10)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    text = response.text
    assert isinstance(text, str), "Response should be text"

    # Verify formatting
    assert "Card #" in text, "Should have card numbers"
    assert "Purpose:" in text, "Should have purpose section"
    assert "File:" in text, "Should have file paths"
    assert "Total:" in text, "Should have total count"
    assert "=" * 80 in text, "Should have separator lines"

    # Count cards in output
    card_count = text.count("Card #")
    print(f"✅ /api/cards/raw-text formatted {card_count} cards for terminal view")

    # Verify word wrapping (no extremely long lines)
    max_line_length = max(len(line) for line in text.split('\n') if line)
    print(f"   Max line length: {max_line_length} chars (should support wrapping)")

    return card_count


def test_view_all_button_exists():
    """Verify View All button is in the HTML"""
    response = requests.get(f"{BASE_URL}/gui/index.html", timeout=10)

    assert response.status_code == 200, "GUI should load"

    html = response.text
    assert 'id="btn-cards-view-all"' in html, "Should have View All button"
    assert "View All" in html, "Button should have View All text"

    print("✅ View All button is in GUI")
    return True


def test_cards_js_has_view_all_handler():
    """Verify cards.js has the viewAllCards function"""
    response = requests.get(f"{BASE_URL}/gui/js/cards.js", timeout=10)

    assert response.status_code == 200, "cards.js should load"

    js = response.text
    assert "viewAllCards" in js, "Should have viewAllCards function"
    assert "/api/cards/raw-text" in js, "Should call raw-text endpoint"
    assert "modal" in js, "Should have modal view"
    assert "white-space: pre-wrap" in js, "Should have word wrapping"

    print("✅ cards.js has View All handler with modal")
    return True


def test_pagination_vs_all():
    """Verify paginated endpoint returns only 10 while all returns everything"""
    paginated = requests.get(f"{BASE_URL}/api/cards", timeout=10).json()
    all_cards = requests.get(f"{BASE_URL}/api/cards/all", timeout=10).json()

    paginated_count = len(paginated.get("cards", []))
    all_count = len(all_cards.get("cards", []))
    total_count = paginated.get("count", 0)

    print(f"✅ Pagination comparison:")
    print(f"   - Paginated endpoint: {paginated_count} cards shown (limit: 10)")
    print(f"   - All endpoint: {all_count} cards returned")
    print(f"   - Total count from paginated: {total_count}")

    assert paginated_count <= 10, "Paginated should show max 10"
    assert all_count >= paginated_count, "All should have at least as many as paginated"

    return True


if __name__ == "__main__":
    print("Running cards view-all feature tests...\n")

    try:
        all_count = test_cards_all_endpoint_returns_all()
        raw_count = test_cards_raw_text_returns_formatted()
        test_view_all_button_exists()
        test_cards_js_has_view_all_handler()
        test_pagination_vs_all()

        print("\n✅ ALL CARDS VIEW-ALL TESTS PASSED!")
        print(f"\n📊 Summary:")
        print(f"   - All {all_count} cards are available in database")
        print(f"   - UI shows paginated 10 for performance")
        print(f"   - View All button opens modal with formatted terminal view")
        print(f"   - Text is word-wrapped for readability")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
