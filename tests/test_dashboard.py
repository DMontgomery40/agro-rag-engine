#!/usr/bin/env python3
"""Smoke test Grafana dashboard with Playwright"""
import asyncio
from playwright.async_api import async_playwright  # type: ignore[import]

async def test_dashboard():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to dashboard; use token from env if present
        import os
        token = os.getenv('GRAFANA_AUTH_TOKEN', '')
        base = os.getenv('GRAFANA_URL', 'http://localhost:3000')
        if token:
            dashboard_url = f"{base}/d/agro-overview/agro-overview?auth_token={token}&kiosk=tv"
        else:
            dashboard_url = f"{base}/d/agro-overview/agro-overview?kiosk=tv"
        print(f"Opening dashboard: {dashboard_url}")
        await page.goto(dashboard_url)

        # Wait for page to load
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(5)  # Give panels time to render

        # Take screenshot
        screenshot_path = "/Users/davidmontgomery/agro-rag-engine/dashboard_screenshot.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved: {screenshot_path}")

        # Check for "No data" or error messages
        page_content = await page.content()

        # Look for panels
        panels = await page.locator('[class*="panel"]').count()
        print(f"Found {panels} panels")

        # Check for errors
        errors = await page.locator('text=/error|Error|ERROR/i').count()
        print(f"Found {errors} error messages")

        # Check for "No data" messages
        no_data = await page.locator('text=/No data|no data/i').count()
        print(f"Found {no_data} 'No data' messages")

        await browser.close()

        return {
            'panels': panels,
            'errors': errors,
            'no_data': no_data,
            'screenshot': screenshot_path
        }

if __name__ == '__main__':
    result = asyncio.run(test_dashboard())
    print("\n=== DASHBOARD TEST RESULTS ===")
    print(f"Panels: {result['panels']}")
    print(f"Errors: {result['errors']}")
    print(f"No data panels: {result['no_data']}")
    print(f"Screenshot: {result['screenshot']}")
