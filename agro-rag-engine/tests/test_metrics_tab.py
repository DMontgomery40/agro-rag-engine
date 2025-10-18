#!/usr/bin/env python3
"""Test AGRO GUI Metrics tab with embedded Grafana"""
import asyncio
from playwright.async_api import async_playwright

async def test_metrics_tab():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to AGRO GUI
        agro_url = "http://127.0.0.1:8012"
        print(f"Opening AGRO GUI: {agro_url}")
        await page.goto(agro_url)

        # Wait for page to load
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)

        # Click on Metrics tab
        print("Clicking Metrics tab...")
        metrics_tab = page.locator('button[data-tab="metrics"]')
        await metrics_tab.click()
        await asyncio.sleep(3)

        # Take screenshot
        screenshot_path = "/Users/davidmontgomery/agro/metrics_tab_screenshot.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved: {screenshot_path}")

        # Check for Grafana iframe
        iframe = page.locator('#grafana-iframe')
        iframe_count = await iframe.count()
        print(f"Found {iframe_count} Grafana iframe(s)")

        # Check for demo mode
        demo_mode = page.locator('text=/Demo Mode/i')
        demo_count = await demo_mode.count()
        print(f"Found {demo_count} 'Demo Mode' text")

        # Check iframe visibility
        if iframe_count > 0:
            is_visible = await iframe.is_visible()
            print(f"Grafana iframe visible: {is_visible}")
            if is_visible:
                src = await iframe.get_attribute('src')
                print(f"Iframe src: {src}")

        await browser.close()

        return {
            'iframe_count': iframe_count,
            'demo_mode': demo_count,
            'screenshot': screenshot_path
        }

if __name__ == '__main__':
    result = asyncio.run(test_metrics_tab())
    print("\n=== METRICS TAB TEST RESULTS ===")
    print(f"Grafana iframes: {result['iframe_count']}")
    print(f"Demo mode messages: {result['demo_mode']}")
    print(f"Screenshot: {result['screenshot']}")

    if result['iframe_count'] > 0 and result['demo_mode'] == 0:
        print("\n✅ SUCCESS: Grafana is embedded!")
    else:
        print("\n❌ ISSUE: Still showing demo mode or no iframe found")
