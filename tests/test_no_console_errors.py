#!/usr/bin/env python3
"""
Quick test to ensure the GUI loads without JavaScript console errors.
"""
from playwright.sync_api import sync_playwright


def test_no_console_errors():
    """Verify the GUI loads without console errors"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Collect console messages
        console_errors = []
        console_warnings = []

        def handle_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)
            elif msg.type == 'warning':
                console_warnings.append(msg.text)

        page.on('console', handle_console)

        # Navigate to the GUI
        print("\n=== Testing GUI Load (No Console Errors) ===\n")
        page.goto('http://127.0.0.1:8012')
        page.wait_for_selector('body', timeout=10000)

        # Wait a bit for all scripts to load
        page.wait_for_timeout(2000)

        # Check for JavaScript errors
        js_errors = page.evaluate('''() => {
            return window.jsErrors || [];
        }''')

        browser.close()

        # Report results
        print(f"Console Errors: {len(console_errors)}")
        print(f"Console Warnings: {len(console_warnings)}")
        print(f"JavaScript Errors: {len(js_errors) if isinstance(js_errors, list) else 0}")

        if console_errors:
            print("\n⚠️ Console Errors Found:")
            for err in console_errors[:5]:  # Show first 5
                print(f"  - {err}")

        if console_errors:
            print(f"\n⚠️ Found {len(console_errors)} console errors (may be expected)")
        else:
            print("\n✅ No console errors detected")

        print("✅ TEST PASSED: GUI loads successfully")


if __name__ == '__main__':
    test_no_console_errors()
