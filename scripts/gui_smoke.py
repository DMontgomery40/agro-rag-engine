#!/usr/bin/env python3
from __future__ import annotations
import os, time, json, tempfile, signal, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8012"


def wait_health(timeout=20):
    import urllib.request, urllib.error
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{BASE}/health", timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def main() -> int:
    # Use existing server
    assert wait_health(5), "server not running on 8012"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto(f"{BASE}/gui/", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)

        # Test Health button
        print("Testing health button...")
        page.click('#btn-health')
        page.wait_for_timeout(1000)
        hs = page.locator('#health-status').text_content()
        print(f"  health: {hs}")

        # Test Overview section load
        print("\nTesting overview section...")
        overview_text = page.locator('#overview-section').text_content()
        print(f"  overview contains {len(overview_text)} chars")
        if "—" in overview_text or not overview_text.strip():
            print("  ❌ Overview appears empty/placeholder")
        else:
            print("  ✓ Overview has content")

        # Test Configure button (wizard)
        print("\nTesting configure button...")
        page.click('#btn-wizard')
        page.wait_for_timeout(2000)
        wizard_out = page.locator('#wizard-output').text_content()
        print(f"  wizard output: {wizard_out[:200] if wizard_out else '(empty)'}")
        if not wizard_out or wizard_out.strip() == "":
            print("  ❌ Wizard produced no output")
        else:
            print("  ✓ Wizard generated output")

        # Test Cost calc with select_option
        print("\nTesting cost calculator...")
        page.select_option('#cost-provider', 'openai')
        page.select_option('#cost-model', 'gpt-4o-mini')
        page.fill('#cost-in', '500')
        page.fill('#cost-out', '800')
        page.fill('#cost-rpd', '100')
        page.click('#btn-estimate')
        page.wait_for_timeout(1000)
        daily = page.locator('#cost-daily').text_content()
        print(f"  cost daily: {daily}")
        if daily == "—":
            print("  ❌ Cost calc not working")
        else:
            print("  ✓ Cost calc working")

        print("\n\nPress Enter to close browser...")
        input()
        browser.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

