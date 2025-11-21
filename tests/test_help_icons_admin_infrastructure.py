#!/usr/bin/env python3
"""
Test help icons are present in Admin and Infrastructure tabs (lines 4500-6142)
"""
import re
import sys
from playwright.sync_api import sync_playwright, expect


def test_admin_infrastructure_help_icons():
    """Verify all form fields in Admin and Infrastructure tabs have help icons"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to AGRO GUI
        page.goto("http://127.0.0.1:8012")
        page.wait_for_load_state("networkidle")

        # Click on Admin tab using data-testid
        admin_tab = page.locator('[data-testid="tab-btn-admin"]')
        admin_tab.click()
        page.wait_for_timeout(500)

        # Test Admin tab fields
        admin_fields_to_check = [
            "THEME_MODE",
            "AGRO_EDITION",
            "THREAD_ID",
            "HOST",
            "PORT",
            "OPEN_BROWSER",
            "AGRO_PATH",
            "NETLIFY_API_KEY",
            "NETLIFY_DOMAINS",
            "CHAT_STREAMING_ENABLED",
            "TRACING_ENABLED",
            "TRACE_SAMPLING_RATE",
            "PROMETHEUS_PORT",
            "METRICS_ENABLED",
            "LOG_LEVEL",
            "ALERT_WEBHOOK_TIMEOUT",
            "EDITOR_PORT",
            "EDITOR_BIND",
        ]

        missing_admin = []
        for param in admin_fields_to_check:
            help_icon = page.locator(f'span.help-icon[data-tooltip="{param}"]')
            if help_icon.count() == 0:
                missing_admin.append(param)

        # Click on Infrastructure tab using data-testid
        infra_tab = page.locator('[data-testid="tab-btn-infrastructure"]')
        infra_tab.click()
        page.wait_for_timeout(500)

        # Test Infrastructure tab fields
        infra_fields_to_check = [
            "DEV_LOCAL_UVICORN",
            "AUTO_COLIMA",
            "COLIMA_PROFILE",
            "QDRANT_URL",
            "REDIS_URL",
            "REPO_ROOT",
            "FILES_ROOT",
            "REPO",
            "COLLECTION_SUFFIX",
            "COLLECTION_NAME",
            "REPO_PATH",
            "GUI_DIR",
            "DOCS_DIR",
            "DATA_DIR",
            "REPOS_FILE",
            "OUT_DIR_BASE",
            "RAG_OUT_BASE",
            "MCP_HTTP_HOST",
            "MCP_HTTP_PORT",
            "MCP_HTTP_PATH",
        ]

        missing_infra = []
        for param in infra_fields_to_check:
            help_icon = page.locator(f'span.help-icon[data-tooltip="{param}"]')
            if help_icon.count() == 0:
                missing_infra.append(param)

        # Click on Profiles tab to test budget/alert fields using data-testid
        profiles_tab = page.locator('[data-testid="tab-btn-profiles"]')
        profiles_tab.click()
        page.wait_for_timeout(500)

        # Test Profiles tab alert fields
        alert_fields_to_check = [
            "ALERT_COST_BURN_SPIKE_USD_PER_HOUR",
            "ALERT_TOKEN_BURN_SPIKE_PER_MINUTE",
            "ALERT_TOKEN_BURN_SUSTAINED_PER_MINUTE",
            "ALERT_MONTHLY_BUDGET_USD",
            "ALERT_BUDGET_WARNING_USD",
            "ALERT_BUDGET_CRITICAL_USD",
        ]

        missing_alerts = []
        for param in alert_fields_to_check:
            help_icon = page.locator(f'span.help-icon[data-tooltip="{param}"]')
            if help_icon.count() == 0:
                missing_alerts.append(param)

        # Test Infrastructure performance alert fields
        infra_tab.click()
        page.wait_for_timeout(500)

        perf_fields_to_check = [
            "ALERT_ERROR_RATE_THRESHOLD_PERCENT",
            "ALERT_REQUEST_LATENCY_P99_SECONDS",
            "ALERT_TIMEOUT_ERRORS_PER_5MIN",
            "ALERT_RATE_LIMIT_ERRORS_PER_5MIN",
            "ALERT_ENDPOINT_CALL_FREQUENCY_PER_MINUTE",
            "ALERT_ENDPOINT_FREQUENCY_SUSTAINED_MINUTES",
            "ALERT_COHERE_RERANK_CALLS_PER_MINUTE",
        ]

        missing_perf = []
        for param in perf_fields_to_check:
            help_icon = page.locator(f'span.help-icon[data-tooltip="{param}"]')
            if help_icon.count() == 0:
                missing_perf.append(param)

        # Test RAG tab evaluation field using data-testid
        rag_tab = page.locator('[data-testid="tab-btn-rag"]')
        rag_tab.click()
        page.wait_for_timeout(500)

        # Click evaluate subtab
        eval_subtab = page.locator('[data-subtab="evaluate"]')
        if eval_subtab.count() > 0:
            eval_subtab.click()
            page.wait_for_timeout(500)

        eval_sample_icon = page.locator('span.help-icon[data-tooltip="EVAL_SAMPLE_SIZE"]')
        missing_eval = []
        if eval_sample_icon.count() == 0:
            missing_eval.append("EVAL_SAMPLE_SIZE")

        browser.close()

        # Report results
        all_missing = []
        if missing_admin:
            print(f"\n❌ Missing help icons in Admin tab: {', '.join(missing_admin)}")
            all_missing.extend(missing_admin)
        else:
            print("\n✓ All Admin tab fields have help icons")

        if missing_infra:
            print(f"❌ Missing help icons in Infrastructure tab: {', '.join(missing_infra)}")
            all_missing.extend(missing_infra)
        else:
            print("✓ All Infrastructure tab fields have help icons")

        if missing_alerts:
            print(f"❌ Missing help icons in Profiles/Alerts: {', '.join(missing_alerts)}")
            all_missing.extend(missing_alerts)
        else:
            print("✓ All Profiles/Alert fields have help icons")

        if missing_perf:
            print(f"❌ Missing help icons in Performance Alerts: {', '.join(missing_perf)}")
            all_missing.extend(missing_perf)
        else:
            print("✓ All Performance Alert fields have help icons")

        if missing_eval:
            print(f"❌ Missing help icons in RAG Evaluate: {', '.join(missing_eval)}")
            all_missing.extend(missing_eval)
        else:
            print("✓ All RAG Evaluate fields have help icons")

        if all_missing:
            print(f"\n❌ FAILED: {len(all_missing)} fields missing help icons")
            sys.exit(1)
        else:
            print(f"\n✓ SUCCESS: All required fields have help icons")
            sys.exit(0)


if __name__ == "__main__":
    test_admin_infrastructure_help_icons()
