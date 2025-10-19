#!/usr/bin/env python3
"""
CRITICAL TEST: Verify "Apply All Changes" button is visible on EVERY tab and subtab.
This is non-negotiable - users MUST be able to save settings from anywhere in the GUI.
"""
import sys
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_button_visible_on_all_tabs():
    """Use Playwright to verify button visibility on every single tab/subtab"""

    test_code = """
from playwright.sync_api import sync_playwright, expect
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to GUI
            page.goto('http://127.0.0.1:8012')
            page.wait_for_load_state('networkidle')

            # Get all main tabs
            main_tabs = page.query_selector_all('.tab-bar button[data-tab]')
            main_tab_names = [tab.get_attribute('data-tab') for tab in main_tabs]

            print(f"Found {len(main_tab_names)} main tabs: {main_tab_names}")

            failed_tabs = []

            for tab_name in main_tab_names:
                # Click the tab
                page.click(f'button[data-tab="{tab_name}"]')
                page.wait_for_timeout(500)

                # Check if this tab has subtabs
                subtab_bar_id = f'{tab_name}-subtabs'
                subtab_bar = page.query_selector(f'#{subtab_bar_id}')

                if subtab_bar and subtab_bar.is_visible():
                    # This tab has subtabs - test each one
                    subtabs = page.query_selector_all(f'#{subtab_bar_id} button[data-subtab]')
                    subtab_names = [st.get_attribute('data-subtab') for st in subtabs]

                    print(f"  Tab '{tab_name}' has {len(subtab_names)} subtabs: {subtab_names}")

                    for subtab_name in subtab_names:
                        page.click(f'#{subtab_bar_id} button[data-subtab="{subtab_name}"]')
                        page.wait_for_timeout(300)

                        # Check if Apply button is visible
                        save_btn = page.query_selector('#save-btn')
                        if not save_btn:
                            failed_tabs.append(f"{tab_name} > {subtab_name} (button not found in DOM)")
                            print(f"    ✗ {tab_name} > {subtab_name}: Button not in DOM")
                        elif not save_btn.is_visible():
                            failed_tabs.append(f"{tab_name} > {subtab_name} (button not visible)")
                            print(f"    ✗ {tab_name} > {subtab_name}: Button exists but not visible")
                        else:
                            print(f"    ✓ {tab_name} > {subtab_name}: Button visible")
                else:
                    # No subtabs - just check the main tab
                    save_btn = page.query_selector('#save-btn')
                    if not save_btn:
                        failed_tabs.append(f"{tab_name} (button not found in DOM)")
                        print(f"  ✗ {tab_name}: Button not in DOM")
                    elif not save_btn.is_visible():
                        failed_tabs.append(f"{tab_name} (button not visible)")
                        print(f"  ✗ {tab_name}: Button exists but not visible")
                    else:
                        print(f"  ✓ {tab_name}: Button visible")

            browser.close()

            if failed_tabs:
                print(f"\\n✗ FAILED: Apply button not visible on {len(failed_tabs)} tabs/subtabs:")
                for ft in failed_tabs:
                    print(f"  - {ft}")
                sys.exit(1)
            else:
                print(f"\\n✓ SUCCESS: Apply button visible on ALL tabs and subtabs!")
                sys.exit(0)

        except Exception as e:
            print(f"✗ Test error: {e}")
            browser.close()
            sys.exit(1)

if __name__ == '__main__':
    run()
"""

    # Write temp test file and run it
    temp_test = project_root / "tests" / "smoke" / "_temp_button_test.py"
    temp_test.write_text(test_code)

    try:
        result = subprocess.run(
            ['python3', str(temp_test)],
            capture_output=True,
            text=True,
            timeout=60
        )

        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        temp_test.unlink()  # Clean up

        if result.returncode != 0:
            print("\n✗ CRITICAL FAILURE: Apply button is NOT visible on all tabs!")
            sys.exit(1)
        else:
            print("\n✓ All tests passed - button visible everywhere")
            sys.exit(0)

    except subprocess.TimeoutExpired:
        print("✗ Test timed out")
        temp_test.unlink()
        sys.exit(1)
    except Exception as e:
        print(f"✗ Test failed: {e}")
        if temp_test.exists():
            temp_test.unlink()
        sys.exit(1)

if __name__ == "__main__":
    test_button_visible_on_all_tabs()
