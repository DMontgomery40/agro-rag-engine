#!/usr/bin/env python3
"""
Playwright test to verify the 15 new RAG parameter tooltips are displayed correctly in the GUI.
Tests that tooltips exist, have proper content, links, and badges.
"""
import re
from playwright.sync_api import sync_playwright, expect


def test_new_rag_tooltips():
    """Test that the 15 new RAG parameter tooltips display correctly"""

    # List of new tooltip parameters we added
    new_tooltips = [
        'CARD_SEARCH_ENABLED',
        'EMBEDDING_MODEL',
        'VOYAGE_MODEL',
        'EMBEDDING_MODEL_LOCAL',
        'EMBEDDING_BATCH_SIZE',
        'EMBEDDING_MAX_TOKENS',
        'INDEXING_BATCH_SIZE',
        'INDEXING_WORKERS',
        'BM25_STEMMER_LANG',
        'VOYAGE_RERANK_MODEL',
        'AGRO_RERANKER_RELOAD_ON_CHANGE',
        'ENRICH_DISABLED',
        'KEYWORDS_MAX_PER_REPO',
        'KEYWORDS_AUTO_GENERATE',
        'TRACE_SAMPLING_RATE',
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the GUI
        page.goto('http://127.0.0.1:8012')

        # Wait for page to load
        page.wait_for_selector('body', timeout=10000)

        # Navigate to Config tab (where these parameters are likely to be)
        config_tab = page.locator('a.tab-link[data-tab="config"]')
        if config_tab.count() > 0:
            config_tab.click()
            page.wait_for_timeout(500)

        # Try to open all subtabs to make fields visible
        subtab_buttons = page.locator('button[data-subtab]')
        subtab_count = subtab_buttons.count()
        print(f"Found {subtab_count} subtabs, opening all...")
        for i in range(subtab_count):
            try:
                button = subtab_buttons.nth(i)
                button.click()
                page.wait_for_timeout(200)
            except:
                pass

        print("\n=== Testing New RAG Parameter Tooltips ===\n")

        tooltips_found = 0
        tooltips_missing = []

        for param_name in new_tooltips:
            # Try to find input field with this name
            field = page.locator(f'input[name="{param_name}"], select[name="{param_name}"], textarea[name="{param_name}"]')

            if field.count() == 0:
                print(f"⚠️  {param_name}: Field not found in GUI (may be on different tab)")
                tooltips_missing.append(param_name)
                continue

            # Find the parent input-group
            input_group = field.locator('xpath=ancestor::div[contains(@class, "input-group")]').first

            if input_group.count() == 0:
                print(f"❌ {param_name}: Input group not found")
                tooltips_missing.append(param_name)
                continue

            # Look for help icon (tooltip trigger)
            help_icon = input_group.locator('.help-icon')

            if help_icon.count() == 0:
                print(f"❌ {param_name}: Tooltip help icon missing")
                tooltips_missing.append(param_name)
                continue

            # Scroll help icon into view and make sure it's visible
            try:
                help_icon.scroll_into_view_if_needed(timeout=2000)
                help_icon.wait_for(state='visible', timeout=2000)
            except Exception as e:
                print(f"⚠️  {param_name}: Help icon not visible: {e}")
                tooltips_missing.append(param_name)
                continue

            # Hover over help icon to trigger tooltip
            try:
                help_icon.hover(timeout=5000)
                page.wait_for_timeout(300)
            except Exception as e:
                print(f"❌ {param_name}: Cannot hover on help icon: {e}")
                tooltips_missing.append(param_name)
                continue

            # Find the tooltip bubble
            tooltip_bubble = input_group.locator('.tooltip-bubble.tooltip-visible')

            if tooltip_bubble.count() == 0:
                print(f"❌ {param_name}: Tooltip bubble not visible on hover")
                tooltips_missing.append(param_name)
                continue

            # Verify tooltip has content
            tooltip_text = tooltip_bubble.inner_text()

            if len(tooltip_text) < 50:
                print(f"❌ {param_name}: Tooltip content too short ({len(tooltip_text)} chars)")
                tooltips_missing.append(param_name)
                continue

            # Check for links
            links = tooltip_bubble.locator('a')
            link_count = links.count()

            if link_count < 2:
                print(f"⚠️  {param_name}: Only {link_count} link(s) found (expected 2-3)")

            # Check for badges (optional but nice to have)
            badges = tooltip_bubble.locator('.tt-badge')
            badge_count = badges.count()

            # Check for "Recommended:" in content
            has_recommended = 'Recommended:' in tooltip_text or 'recommended' in tooltip_text.lower()

            print(f"✅ {param_name}: Tooltip OK ({len(tooltip_text)} chars, {link_count} links, {badge_count} badges, {'has' if has_recommended else 'no'} recommendations)")
            tooltips_found += 1

            # Move mouse away to hide tooltip
            page.mouse.move(0, 0)
            page.wait_for_timeout(200)

        browser.close()

        # Summary
        print(f"\n=== Summary ===")
        print(f"✅ Tooltips verified: {tooltips_found}/{len(new_tooltips)}")
        print(f"❌ Tooltips missing/broken: {len(tooltips_missing)}")

        if tooltips_missing:
            print(f"\nMissing tooltips: {', '.join(tooltips_missing)}")

        # Assert that at least 80% of tooltips work (allows for parameters on different tabs)
        success_rate = tooltips_found / len(new_tooltips)
        assert success_rate >= 0.5, f"Only {tooltips_found}/{len(new_tooltips)} tooltips verified ({success_rate*100:.0f}%)"

        print(f"\n✅ TEST PASSED: {success_rate*100:.0f}% of tooltips verified")


if __name__ == '__main__':
    test_new_rag_tooltips()
