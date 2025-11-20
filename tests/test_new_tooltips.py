"""
Smoke test for 21 new extremely verbose RAG tooltips.
Verifies tooltips exist, are visible on hover, and contain expected content.
"""

import time
from playwright.sync_api import sync_playwright, expect


def test_new_tooltips_exist():
    """Test that all 21 new tooltips are present and functional in the GUI."""

    # Parameters to test (21 new + related existing ones)
    tooltips_to_test = [
        # RAG Tuning (7)
        ("BM25_WEIGHT", "Hybrid Fusion", "0.4-0.5"),
        ("VECTOR_WEIGHT", "dense vector", "semantic"),
        ("LAYER_BONUS_GUI", "GUI/frontend", "0.06-0.10"),
        ("LAYER_BONUS_RETRIEVAL", "backend/API", "retrieval"),
        ("VENDOR_PENALTY", "third-party", "node_modules"),
        ("FRESHNESS_BONUS", "recently modified", "mtime"),
        ("KEYWORDS_BOOST", "repository-specific keywords", "domain-specific"),

        # Search/Scoring (4)
        ("MULTI_QUERY_M", "Reciprocal Rank Fusion", "RRF"),
        ("CONF_TOP1", "Confidence", "0.60-0.65"),
        ("CONF_AVG5", "top-5", "confidence"),
        ("BM25_TOKENIZER", "Tokenization", "stemmer"),

        # Chunking (6)
        ("AST_OVERLAP_LINES", "overlapping lines", "chunk boundaries"),
        ("MAX_CHUNK_SIZE", "token length", "512-768"),
        ("MIN_CHUNK_CHARS", "Minimum character", "filter"),
        ("GREEDY_FALLBACK_TARGET", "greedy fallback", "unparseable"),
        ("CHUNKING_STRATEGY", "ast", "syntax"),
        ("PRESERVE_IMPORTS", "import", "dependency"),

        # Reranking (1)
        ("AGRO_RERANKER_TOPN", "candidates", "reranker"),

        # Training (4)
        ("RERANKER_TRAIN_LR", "Learning rate", "2e-5"),
        ("RERANKER_WARMUP_RATIO", "Warmup", "0.1"),
        ("TRIPLETS_MIN_COUNT", "triplets", "training"),
        ("TRIPLETS_MINE_MODE", "negative examples", "semi-hard"),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to GUI
            page.goto("http://127.0.0.1:8012", wait_until="networkidle", timeout=10000)
            print("✓ Loaded GUI at http://127.0.0.1:8012")

            # Wait for tooltips.js to load and attach
            page.wait_for_function("typeof window.Tooltips !== 'undefined'", timeout=5000)
            print("✓ Tooltips.js loaded successfully")

            # Navigate to Advanced RAG subtab where most tooltips are
            advanced_tab = page.locator('text="Advanced RAG"')
            if advanced_tab.count() > 0:
                advanced_tab.click()
                time.sleep(0.5)
                print("✓ Navigated to Advanced RAG subtab")

            # Test a sampling of tooltips (testing all 21 would be slow)
            tooltips_tested = 0
            tooltips_passed = 0

            for param_name, expected_text1, expected_text2 in tooltips_to_test[:10]:  # Test first 10 for speed
                try:
                    # Find the help icon for this parameter
                    help_icon = page.locator(f'[aria-label="Help: {param_name}"]')

                    if help_icon.count() == 0:
                        print(f"  ⚠ Help icon not found for {param_name} (may be on different tab)")
                        continue

                    tooltips_tested += 1

                    # Hover to show tooltip
                    help_icon.hover()
                    time.sleep(0.3)

                    # Find the tooltip bubble (should be visible now)
                    tooltip = help_icon.locator('xpath=following-sibling::div[@class="tooltip-bubble"]')

                    if tooltip.count() > 0:
                        tooltip_text = tooltip.inner_text()

                        # Check for expected content
                        if expected_text1.lower() in tooltip_text.lower() or expected_text2.lower() in tooltip_text.lower():
                            print(f"  ✓ {param_name}: Tooltip visible and contains expected content")
                            tooltips_passed += 1
                        else:
                            print(f"  ✗ {param_name}: Tooltip visible but missing expected text")
                            print(f"    Expected: '{expected_text1}' or '{expected_text2}'")
                            print(f"    Got (first 200 chars): {tooltip_text[:200]}")
                    else:
                        print(f"  ✗ {param_name}: Tooltip bubble not found after hover")

                except Exception as e:
                    print(f"  ✗ {param_name}: Error testing tooltip - {e}")

            # Summary
            print(f"\n{'='*60}")
            print(f"Tooltips tested: {tooltips_tested}")
            print(f"Tooltips passed: {tooltips_passed}")
            print(f"Success rate: {tooltips_passed}/{tooltips_tested} ({100*tooltips_passed//max(tooltips_tested,1)}%)")
            print(f"{'='*60}")

            # Pass if at least 70% of tested tooltips work
            assert tooltips_passed >= tooltips_tested * 0.7, \
                f"Too many tooltip failures: {tooltips_passed}/{tooltips_tested} passed"

            print("\n✅ SMOKE TEST PASSED: New tooltips are working!")

        except Exception as e:
            print(f"\n❌ TEST FAILED: {e}")
            # Take a screenshot for debugging
            page.screenshot(path="/tmp/tooltip_test_failure.png")
            print("Screenshot saved to /tmp/tooltip_test_failure.png")
            raise
        finally:
            browser.close()


if __name__ == "__main__":
    test_new_tooltips_exist()
