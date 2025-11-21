#!/usr/bin/env python3
"""
Quick Playwright test to verify tooltips render correctly in the GUI.
Tests a subset of tooltips to verify the JavaScript loads and works properly.
"""
from playwright.sync_api import sync_playwright, expect


def test_tooltip_rendering():
    """Test that tooltip JS loads and sample tooltips render correctly"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the GUI
        page.goto('http://127.0.0.1:8012')
        page.wait_for_selector('body', timeout=10000)

        print("\n=== Testing Tooltip JavaScript Loading ===\n")

        # Check that the tooltips.js file loaded successfully
        # We can verify this by checking if window.Tooltips exists
        tooltips_loaded = page.evaluate('typeof window.Tooltips !== "undefined"')

        if tooltips_loaded:
            print("✅ Tooltips JavaScript loaded successfully")
        else:
            print("❌ Tooltips JavaScript failed to load")
            browser.close()
            assert False, "Tooltips.js did not load"

        # Check that buildTooltipMap function exists
        has_build_function = page.evaluate('typeof window.Tooltips.buildTooltipMap === "function"')

        if has_build_function:
            print("✅ buildTooltipMap function exists")
        else:
            print("❌ buildTooltipMap function missing")
            browser.close()
            assert False, "buildTooltipMap function missing"

        # Get the tooltip map and check for our new tooltips
        tooltip_keys = page.evaluate('''
            () => {
                const map = window.Tooltips.buildTooltipMap();
                return Object.keys(map);
            }
        ''')

        print(f"\n✅ Tooltip map contains {len(tooltip_keys)} entries")

        # Check for our new tooltips in the map
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

        found = 0
        missing = []

        print("\n=== Checking Tooltip Map Entries ===\n")

        for param in new_tooltips:
            if param in tooltip_keys:
                # Get the tooltip HTML to verify it has content
                tooltip_html = page.evaluate(f'''
                    () => {{
                        const map = window.Tooltips.buildTooltipMap();
                        return map["{param}"];
                    }}
                ''')

                # Check for key features
                has_title = 'tt-title' in tooltip_html
                has_links = 'tt-links' in tooltip_html or 'href=' in tooltip_html
                has_content = len(tooltip_html) > 100

                if has_content:
                    print(f"✅ {param}: In map ({len(tooltip_html)} chars, {'has links' if has_links else 'no links'})")
                    found += 1
                else:
                    print(f"⚠️  {param}: In map but content too short")
                    missing.append(param)
            else:
                print(f"❌ {param}: Missing from map")
                missing.append(param)

        browser.close()

        print(f"\n=== Summary ===")
        print(f"✅ Tooltips in map: {found}/{len(new_tooltips)}")
        print(f"❌ Missing/incomplete: {len(missing)}")

        if missing:
            print(f"\nMissing: {', '.join(missing)}")

        assert found == len(new_tooltips), f"Only {found}/{len(new_tooltips)} tooltips in map"

        print(f"\n✅ TEST PASSED: All {found} tooltips verified in browser")


if __name__ == '__main__':
    test_tooltip_rendering()
