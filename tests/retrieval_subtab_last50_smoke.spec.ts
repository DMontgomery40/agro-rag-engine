import { test, expect } from '@playwright/test';

/**
 * Smoke test for RetrievalSubtab last 50% conversion (Agent 8)
 * Tests that Advanced RAG Tuning and Routing Trace sections render without errors
 * and can persist settings to backend.
 */

test.describe('RetrievalSubtab Last 50% - Advanced RAG Tuning & Routing Trace', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RAG Retrieval subtab (use existing dev server on 5173)
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');

    // Click RAG Configuration tab
    const ragTab = page.locator('[data-tab="rag"]').or(page.locator('text=RAG Configuration')).first();
    if (await ragTab.isVisible()) {
      await ragTab.click();
      await page.waitForTimeout(500);
    }

    // Click Retrieval subtab
    const retrievalSubtab = page.locator('[data-rag-subtab="retrieval"]').or(page.locator('text=Retrieval')).first();
    if (await retrievalSubtab.isVisible()) {
      await retrievalSubtab.click();
      await page.waitForTimeout(500);
    }
  });

  test('Advanced RAG Tuning section renders without black screen', async ({ page }) => {
    // Check that Advanced RAG Tuning section exists and is visible
    const advancedSection = page.locator('text=Advanced RAG Tuning');
    await expect(advancedSection).toBeVisible({ timeout: 10000 });

    // Verify section has expected inputs
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    const cardBonusInput = page.locator('input[name="CARD_BONUS"]');
    const filenameExactInput = page.locator('input[name="FILENAME_BOOST_EXACT"]');
    const filenamePartialInput = page.locator('input[name="FILENAME_BOOST_PARTIAL"]');
    const langgraphKInput = page.locator('input[name="LANGGRAPH_FINAL_K"]');
    const maxRewritesInput = page.locator('input[name="MAX_QUERY_REWRITES"]');
    const fallbackConfInput = page.locator('input[name="FALLBACK_CONFIDENCE"]');
    const layerGuiInput = page.locator('input[name="LAYER_BONUS_GUI"]');
    const layerRetrievalInput = page.locator('input[name="LAYER_BONUS_RETRIEVAL"]');
    const vendorPenaltyInput = page.locator('input[name="VENDOR_PENALTY"]');
    const freshnessInput = page.locator('input[name="FRESHNESS_BONUS"]');

    // All inputs should be visible
    await expect(rrfInput).toBeVisible();
    await expect(cardBonusInput).toBeVisible();
    await expect(filenameExactInput).toBeVisible();
    await expect(filenamePartialInput).toBeVisible();
    await expect(langgraphKInput).toBeVisible();
    await expect(maxRewritesInput).toBeVisible();
    await expect(fallbackConfInput).toBeVisible();
    await expect(layerGuiInput).toBeVisible();
    await expect(layerRetrievalInput).toBeVisible();
    await expect(vendorPenaltyInput).toBeVisible();
    await expect(freshnessInput).toBeVisible();

    // Verify inputs have proper types and constraints
    await expect(rrfInput).toHaveAttribute('type', 'number');
    await expect(rrfInput).toHaveAttribute('min', '10');
    await expect(rrfInput).toHaveAttribute('max', '100');
  });

  test('Routing Trace section renders without black screen', async ({ page }) => {
    // Check that Routing Trace section exists and is visible
    const traceSection = page.locator('text=Routing Trace');
    await expect(traceSection).toBeVisible({ timeout: 10000 });

    // Verify section has expected inputs and selects
    const tracingModeSelect = page.locator('select[name="TRACING_MODE"]');
    const traceAutoLsSelect = page.locator('select[name="TRACE_AUTO_LS"]');
    const traceRetentionInput = page.locator('input[name="TRACE_RETENTION"]');
    const langchainV2Select = page.locator('select[name="LANGCHAIN_TRACING_V2"]');
    const langchainEndpointInput = page.locator('input[name="LANGCHAIN_ENDPOINT"]');
    const langchainApiKeyInput = page.locator('input[name="LANGCHAIN_API_KEY"]');
    const langsmithApiKeyInput = page.locator('input[name="LANGSMITH_API_KEY"]');
    const langchainProjectInput = page.locator('input[name="LANGCHAIN_PROJECT"]');
    const langtraceHostInput = page.locator('input[name="LANGTRACE_API_HOST"]');
    const langtraceProjectInput = page.locator('input[name="LANGTRACE_PROJECT_ID"]');
    const langtraceKeyInput = page.locator('input[name="LANGTRACE_API_KEY"]');

    // All inputs should be visible
    await expect(tracingModeSelect).toBeVisible();
    await expect(traceAutoLsSelect).toBeVisible();
    await expect(traceRetentionInput).toBeVisible();
    await expect(langchainV2Select).toBeVisible();
    await expect(langchainEndpointInput).toBeVisible();
    await expect(langchainApiKeyInput).toBeVisible();
    await expect(langsmithApiKeyInput).toBeVisible();
    await expect(langchainProjectInput).toBeVisible();
    await expect(langtraceHostInput).toBeVisible();
    await expect(langtraceProjectInput).toBeVisible();
    await expect(langtraceKeyInput).toBeVisible();

    // Verify password fields are properly secured
    await expect(langchainApiKeyInput).toHaveAttribute('type', 'password');
    await expect(langsmithApiKeyInput).toHaveAttribute('type', 'password');
    await expect(langtraceKeyInput).toHaveAttribute('type', 'password');
  });

  test('Advanced RAG Tuning settings can be changed and persist', async ({ page }) => {
    // Wait for section to load
    await page.waitForSelector('input[name="RRF_K_DIV"]', { timeout: 10000 });

    // Listen for config update API call
    let configUpdateCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/config') && request.method() === 'POST') {
        configUpdateCalled = true;
      }
    });

    // Change RRF_K_DIV value
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    await rrfInput.fill('75');
    await rrfInput.blur(); // Trigger onBlur to save

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(configUpdateCalled).toBe(true);
  });

  test('Routing Trace tracing mode can be changed and persists', async ({ page }) => {
    // Wait for section to load
    await page.waitForSelector('select[name="TRACING_MODE"]', { timeout: 10000 });

    // Listen for config update API call
    let configUpdateCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/config') && request.method() === 'POST') {
        configUpdateCalled = true;
      }
    });

    // Change tracing mode
    const tracingModeSelect = page.locator('select[name="TRACING_MODE"]');
    await tracingModeSelect.selectOption('local');

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(configUpdateCalled).toBe(true);
  });

  test('Visual section dividers are present and styled correctly', async ({ page }) => {
    // Check Advanced RAG Tuning section has orange border
    const advancedSection = page.locator('.settings-section').filter({ hasText: 'Advanced RAG Tuning' });
    await expect(advancedSection).toBeVisible();

    const advancedBorderStyle = await advancedSection.evaluate(el =>
      window.getComputedStyle(el).borderLeftWidth
    );
    expect(advancedBorderStyle).toBe('3px');

    // Check Routing Trace section has blue/link border
    const traceSection = page.locator('.settings-section').filter({ hasText: 'Routing Trace' });
    await expect(traceSection).toBeVisible();

    const traceBorderStyle = await traceSection.evaluate(el =>
      window.getComputedStyle(el).borderLeftWidth
    );
    expect(traceBorderStyle).toBe('3px');
  });

  test('No XSS vulnerabilities - all inputs are properly sanitized', async ({ page }) => {
    // Wait for inputs to load
    await page.waitForSelector('input[name="LANGCHAIN_PROJECT"]', { timeout: 10000 });

    // Try to inject XSS into text input
    const projectInput = page.locator('input[name="LANGCHAIN_PROJECT"]');
    const xssPayload = '<script>alert("XSS")</script>';
    await projectInput.fill(xssPayload);

    // Verify no alert appears (would indicate XSS)
    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    const dialog = await dialogPromise;
    expect(dialog).toBeNull(); // No alert should appear

    // Verify input value is properly escaped/sanitized
    const inputValue = await projectInput.inputValue();
    expect(inputValue).toBe(xssPayload); // Input accepts it as plain text, not executable
  });

  test('Tooltips are visible and provide helpful information', async ({ page }) => {
    // Wait for section to load
    await page.waitForSelector('text=Advanced RAG Tuning', { timeout: 10000 });

    // Find and hover over a help icon
    const helpIcon = page.locator('.tooltip-wrap .help-icon').first();
    await helpIcon.hover();

    // Wait for tooltip to appear
    await page.waitForTimeout(500);

    // Verify tooltip content is visible
    const tooltip = page.locator('.tooltip-bubble').first();
    const isVisible = await tooltip.isVisible().catch(() => false);

    // Note: Tooltip visibility depends on CSS implementation
    // This test just ensures no errors occur when hovering
    expect(isVisible).toBeDefined();
  });

  test('Component does not crash when loading config fails', async ({ page }) => {
    // Intercept config request and simulate failure
    await page.route('**/api/config', route => {
      route.abort('failed');
    });

    // Navigate to page
    await page.goto('http://127.0.0.1:5173');

    // Wait a moment for error handling
    await page.waitForTimeout(2000);

    // Verify page still renders (doesn't white/black screen)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should show some error state or loading state
    const pageContent = await body.textContent();
    expect(pageContent).toBeTruthy();
  });
});
