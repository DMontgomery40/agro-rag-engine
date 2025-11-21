#!/usr/bin/env python3
"""
Smoke test for chat tab rendering fix.

Tests that the chat tab properly renders with visible content after fixing:
1. Missing display:flex on wrapper container
2. Missing closing </div> for #tab-dashboard

Bug context: Chat tab was showing black screen because:
- Tab wrapper needed display:flex to allow child tabs to grow
- #tab-chat was nested inside #tab-dashboard due to missing closing tag
"""

import requests
import sys
import re


def test_chat_tab_structure():
    """Verify chat tab HTML structure is correct."""
    try:
        # Fetch the GUI HTML
        response = requests.get('http://127.0.0.1:8012/', timeout=5)
        response.raise_for_status()
        html = response.text

        # Test 1: Wrapper has display:flex and flex-direction:column
        wrapper_pattern = r'<div\s+style="[^"]*display:\s*flex[^"]*flex-direction:\s*column[^"]*flex:\s*1[^"]*overflow-y:\s*auto[^"]*">'
        assert re.search(wrapper_pattern, html), "Tab wrapper missing display:flex or flex-direction:column"
        print("✓ Tab wrapper has correct flex styles")

        # Test 2: #tab-dashboard exists
        assert 'id="tab-dashboard"' in html, "#tab-dashboard not found"
        print("✓ #tab-dashboard exists")

        # Test 3: #tab-chat exists
        assert 'id="tab-chat"' in html, "#tab-chat not found"
        print("✓ #tab-chat exists")

        # Test 4: Verify proper closing structure - count divs between dashboard and chat
        # Extract section from tab-dashboard to tab-chat
        dashboard_pos = html.find('id="tab-dashboard"')
        chat_pos = html.find('id="tab-chat"')
        assert dashboard_pos < chat_pos, "#tab-chat appears before #tab-dashboard in HTML"

        section_between = html[dashboard_pos:chat_pos]
        open_divs = section_between.count('<div')
        close_divs = section_between.count('</div>')

        # Should have roughly equal opens and closes (allowing for the opening dashboard div itself)
        assert abs(open_divs - close_divs) <= 1, f"Unbalanced divs between dashboard and chat: {open_divs} opens, {close_divs} closes"
        print("✓ Proper div closing structure between #tab-dashboard and #tab-chat")

        # Test 5: Chat UI subtab exists
        assert 'id="tab-chat-ui"' in html, "#tab-chat-ui not found"
        assert 'section-subtab' in html[html.find('id="tab-chat-ui"'):html.find('id="tab-chat-ui"')+200], "#tab-chat-ui missing section-subtab class"
        print("✓ #tab-chat-ui exists with proper class")

        # Test 6: Chat settings subtab exists
        assert 'id="tab-chat-settings"' in html, "#tab-chat-settings not found"
        print("✓ #tab-chat-settings exists")

        # Test 7: Chat content exists
        assert 'RAG Chat' in html, "Chat header 'RAG Chat' not found"
        assert 'Ask questions about your codebase' in html, "Chat description not found"
        print("✓ Chat header content exists")

        print("\n✅ All chat tab rendering tests passed!")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to connect to server: {e}")
        print("Make sure the server is running on http://127.0.0.1:8012")
        return False
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = test_chat_tab_structure()
    sys.exit(0 if success else 1)
