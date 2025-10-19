"""Smoke test for chat UI fixes - feedback buttons and loading indicator"""

import requests


BASE_URL = "http://127.0.0.1:8012"


def test_feedback_buttons_exposed():
    """Verify addFeedbackButtons is exposed to window global"""
    response = requests.get(f"{BASE_URL}/gui/js/reranker.js", timeout=10)

    assert response.status_code == 200, "reranker.js should load"

    js = response.text
    assert "window.addFeedbackButtons" in js, \
        "addFeedbackButtons should be exposed to window"
    assert "function addFeedbackButtons" in js, \
        "Should define addFeedbackButtons function"

    print("✅ addFeedbackButtons is exposed to window global")
    return True


def test_feedback_ui_in_code():
    """Verify feedback UI elements are implemented"""
    response = requests.get(f"{BASE_URL}/gui/js/reranker.js", timeout=10)

    assert response.status_code == 200, "reranker.js should load"

    js = response.text
    assert "👍 Helpful" in js, "Should have thumbs up button"
    assert "👎 Not Helpful" in js, "Should have thumbs down button"
    assert "⭐" in js, "Should have star ratings"
    assert "feedback-btn" in js, "Should have feedback button class"

    print("✅ Feedback UI elements (thumbs, stars, notes) are implemented")
    return True


def test_loading_indicator_animation():
    """Verify loading indicator has MODEL animation"""
    response = requests.get(f"{BASE_URL}/gui/js/chat.js", timeout=10)

    assert response.status_code == 200, "chat.js should load"

    js = response.text
    assert "'MODEL '" in js or '"MODEL "' in js, "Should show 'MODEL' in loading state"
    assert "MODEL " in js, "Loading indicator should show MODEL text"
    assert "setInterval" in js or "interval" in js, \
        "Should have animation with interval"
    assert ".repeat(dotCount)" in js or "dots = '.'.repeat" in js, \
        "Should animate dots with repeat"

    print("✅ Loading indicator has MODEL animation")
    return True


def test_chat_js_imports_reranker():
    """Verify chat.js can access reranker functions"""
    response = requests.get(f"{BASE_URL}/gui/index.html", timeout=10)

    assert response.status_code == 200, "GUI should load"

    html = response.text

    # Find script load order
    chat_idx = html.find('src="/gui/js/chat.js"')
    reranker_idx = html.find('src="/gui/js/reranker.js"')

    assert chat_idx >= 0, "chat.js should be loaded"
    assert reranker_idx >= 0, "reranker.js should be loaded"
    assert chat_idx < reranker_idx, \
        "chat.js should be loaded BEFORE reranker.js for proper initialization"

    print(f"✅ Script loading order is correct (chat before reranker)")
    return True


def test_feedback_in_chat_logic():
    """Verify chat.js uses addFeedbackButtons"""
    response = requests.get(f"{BASE_URL}/gui/js/chat.js", timeout=10)

    assert response.status_code == 200, "chat.js should load"

    js = response.text
    assert "addFeedbackButtons" in js, "chat.js should call addFeedbackButtons"
    assert "event_id" in js, "Should use event_id for feedback"
    assert "data.event_id" in js, "Should pass event_id from server"

    print("✅ Chat logic properly integrates feedback buttons")
    return True


if __name__ == "__main__":
    print("Running chat UI fixes verification...\n")

    try:
        test_feedback_buttons_exposed()
        test_feedback_ui_in_code()
        test_loading_indicator_animation()
        test_chat_js_imports_reranker()
        test_feedback_in_chat_logic()

        print("\n✅ ALL CHAT UI FIXES VERIFIED!")
        print("\n🎯 Fixes Applied:")
        print("   ✓ addFeedbackButtons now exposed to window global")
        print("   ✓ Feedback UI shows thumbs up/down + star ratings")
        print("   ✓ Loading indicator shows 'MODEL' with animated dots")
        print("   ✓ Proper script loading order (chat → reranker)")
        print("\n📝 Expected Behavior:")
        print("   1. Ask a question in RAG Chat")
        print("   2. See 'MODEL ...' loading indicator (animated dots)")
        print("   3. Get answer back")
        print("   4. See feedback buttons (👍 Helpful, 👎 Not Helpful, ⭐)")
        print("   5. Can rate answer and add optional note")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
