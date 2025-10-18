#!/usr/bin/env python3
"""Debug GUI by opening it and printing console errors"""
from __future__ import annotations
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8012"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context()
        page = ctx.new_page()

        # Capture console messages
        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"❌ PAGE ERROR: {err}"))

        print(f"Opening {BASE}/gui/...")
        page.goto(f"{BASE}/gui/", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # Check overview populated
        print("\n=== Overview Section ===")
        try:
            health = page.locator('#dash-health').text_content()
            repo = page.locator('#dash-repo').text_content()
            autotune = page.locator('#dash-autotune').text_content()
            cards = page.locator('#dash-cards').text_content()
            print(f"Health: {health}")
            print(f"Repo: {repo}")
            print(f"Autotune: {autotune}")
            print(f"Cards: {cards}")
            if all(x != "—" for x in [health, repo, autotune, cards]):
                print("✓ Overview populated")
            else:
                print("❌ Overview still has placeholders")
        except Exception as e:
            print(f"❌ Error reading overview: {e}")

        # Test wizard button
        print("\n=== Testing Wizard Button ===")
        try:
            page.fill('#budget', '10')
            page.click('#btn-wizard-oneclick')
            page.wait_for_timeout(3000)
            tri_out = page.locator('#tri-out').text_content()
            print("Full tri-output:")
            print(tri_out)
            if "Press button" in tri_out or len(tri_out) < 20:
                print("❌ Wizard didn't generate output")
            else:
                print("✓ Wizard generated output")
        except Exception as e:
            print(f"❌ Wizard error: {e}")

        # Test cost calculator with blur events
        print("\n=== Testing Cost Calculator ===")
        try:
            print("Typing 500 into cost-in and blurring...")
            page.fill('#cost-in', '500')
            page.locator('#cost-in').blur()
            page.wait_for_timeout(300)
            val = page.input_value('#cost-in')
            print(f"  Value after blur: '{val}'")

            print("Typing 800 into cost-out and blurring...")
            page.fill('#cost-out', '800')
            page.locator('#cost-out').blur()
            page.wait_for_timeout(300)
            val2 = page.input_value('#cost-out')
            print(f"  Value after blur: '{val2}'")

            if not val or not val2:
                print("❌ Cost inputs being cleared")
            else:
                print(f"✓ Cost inputs retained (values: {val}, {val2})")

            # Test with larger number (comma formatting disabled for type="number" inputs)
            print("Testing with 5000 (no comma formatting expected for number inputs)...")
            page.fill('#cost-in', '5000')
            page.locator('#cost-in').blur()
            page.wait_for_timeout(300)
            val3 = page.input_value('#cost-in')
            print(f"  5000 after blur: '{val3}'")
            if val3 == '5000':
                print("✓ Number input retains value")
            else:
                print(f"❌ Unexpected value: {val3}")
        except Exception as e:
            print(f"❌ Cost calculator error: {e}")

        # Print console
        print("\n=== Console Messages ===")
        for msg in console_msgs:
            print(msg)

        browser.close()
        return 0

if __name__ == '__main__':
    main()
