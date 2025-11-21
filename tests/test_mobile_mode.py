#!/usr/bin/env python3
"""
Test mobile mode rendering after wrapper flex changes.

Verifies that the GUI works correctly in mobile viewport (max-width: 768px).
Tests navigation, tab visibility, and layout integrity.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from playwright.sync_api import sync_playwright
import time

def test_mobile_mode():
    """Test mobile viewport rendering."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)

        # Mobile viewport (iPhone 12 size)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=2
        )
        page = context.new_page()

        try:
            print("Testing mobile mode...")
            page.goto('http://127.0.0.1:8012/', timeout=10000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)

            # Test 1: Check if content area is visible
            content = page.locator('.content')
            assert content.is_visible(), "Content area not visible in mobile mode"
            print("✓ Content area visible")

            # Test 2: Check content dimensions
            content_box = content.bounding_box()
            assert content_box is not None, "Content has no bounding box"
            assert content_box['width'] > 0, f"Content width is {content_box['width']}px"
            assert content_box['height'] > 0, f"Content height is {content_box['height']}px"
            print(f"✓ Content dimensions: {content_box['width']}w x {content_box['height']}h")

            # Test 3: Check if sidebar is handled correctly in mobile
            sidebar = page.locator('#sidebar')
            if sidebar.is_visible():
                sidebar_box = sidebar.bounding_box()
                print(f"✓ Sidebar visible: {sidebar_box['width']}w x {sidebar_box['height']}h")
            else:
                print("✓ Sidebar hidden in mobile (expected)")

            # Test 4: Test navigation to Chat tab
            print("\nTesting navigation to Chat tab...")
            chat_nav = page.locator('a[href="#chat"]').first
            assert chat_nav.is_visible(), "Chat navigation link not visible"
            chat_nav.click()
            time.sleep(1)

            # Test 5: Check if Chat tab content is visible
            chat_tab = page.locator('#tab-chat')
            assert chat_tab.is_visible(), "Chat tab not visible after navigation"
            print("✓ Chat tab visible in mobile mode")

            # Test 6: Check chat tab dimensions
            chat_box = chat_tab.bounding_box()
            assert chat_box is not None, "Chat tab has no bounding box"
            assert chat_box['height'] > 100, f"Chat tab height too small: {chat_box['height']}px"
            print(f"✓ Chat tab dimensions: {chat_box['width']}w x {chat_box['height']}h")

            # Test 7: Check if Chat Settings subtab is accessible
            settings_link = page.locator('a[href="#chat-settings"]')
            if settings_link.count() > 0 and settings_link.first.is_visible():
                settings_link.first.click()
                time.sleep(1)
                settings_tab = page.locator('#tab-chat-settings')
                assert settings_tab.is_visible(), "Chat Settings not visible in mobile"
                print("✓ Chat Settings subtab accessible in mobile")

            # Test 8: Test navigation to Dashboard
            print("\nTesting Dashboard in mobile...")
            dashboard_nav = page.locator('a[href="#dashboard"]').first
            dashboard_nav.click()
            time.sleep(1)

            dashboard_tab = page.locator('#tab-dashboard')
            assert dashboard_tab.is_visible(), "Dashboard not visible in mobile"
            dashboard_box = dashboard_tab.bounding_box()
            assert dashboard_box['height'] > 100, f"Dashboard height too small: {dashboard_box['height']}px"
            print(f"✓ Dashboard visible: {dashboard_box['width']}w x {dashboard_box['height']}h")

            # Test 9: Check for horizontal overflow
            page.evaluate("""
                const content = document.querySelector('.content');
                const hasHorizontalScroll = content.scrollWidth > content.clientWidth;
                if (hasHorizontalScroll) {
                    throw new Error(`Horizontal overflow detected: scrollWidth=${content.scrollWidth}, clientWidth=${content.clientWidth}`);
                }
            """)
            print("✓ No horizontal overflow in mobile mode")

            print("\n✅ All mobile mode tests passed!")
            time.sleep(2)  # Brief pause to see final state
            return True

        except Exception as e:
            print(f"❌ Mobile mode test failed: {e}")
            page.screenshot(path='/Users/davidmontgomery/agro-rag-engine/tests/mobile_error.png')
            print("Screenshot saved to tests/mobile_error.png")
            return False
        finally:
            browser.close()

if __name__ == '__main__':
    success = test_mobile_mode()
    sys.exit(0 if success else 1)
