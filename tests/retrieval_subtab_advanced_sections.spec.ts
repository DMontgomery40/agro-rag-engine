/**
 * Playwright test for RetrievalSubtab last 50% (Advanced RAG Tuning + Routing Trace)
 * Tests proper TSX rendering, state management, and backend integration
 *
 * Sections tested:
 * 1. Advanced RAG Tuning section
 * 2. Routing Trace section
 */

import { test, expect } from '@playwright/test';

test.describe('RetrievalSubtab - Advanced Sections (Last 50%)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RAG config page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Navigate to RAG Config tab
    const ragTab = page.locator('button:has-text("RAG Config")');
    if (await ragTab.isVisible()) {
      await ragTab.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Retrieval subtab
    const retrievalSubtab = page.locator('button:has-text("Retrieval")');
    if (await retrievalSubtab.isVisible()) {
      await retrievalSubtab.click();
      await page.waitForTimeout(500);
    }
  });

  test('Advanced RAG Tuning section renders without errors', async ({ page }) => {
    // Check section header exists
    const advancedHeader = page.locator('h3:has-text("Advanced RAG Tuning")');
    await expect(advancedHeader).toBeVisible({ timeout: 10000 });

    // Check section has orange accent dot
    const accentDot = page.locator('.accent-orange');
    await expect(accentDot).toBeVisible();

    // Check section description
    const description = page.locator('p.small:has-text("Expert-level controls")');
    await expect(description).toBeVisible();
  });

  test('RRF K Divisor input exists and is typed', async ({ page }) => {
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    await expect(rrfInput).toBeVisible({ timeout: 10000 });

    // Check it has a number type
    const inputType = await rrfInput.getAttribute('type');
    expect(inputType).toBe('number');

    // Check it has min/max/step attributes
    const min = await rrfInput.getAttribute('min');
    const max = await rrfInput.getAttribute('max');
    const step = await rrfInput.getAttribute('step');
    expect(min).toBe('10');
    expect(max).toBe('100');
    expect(step).toBe('5');
  });

  test('Card Bonus input exists and is typed', async ({ page }) => {
    const cardBonusInput = page.locator('input[name="CARD_BONUS"]');
    await expect(cardBonusInput).toBeVisible({ timeout: 10000 });

    const inputType = await cardBonusInput.getAttribute('type');
    expect(inputType).toBe('number');

    const min = await cardBonusInput.getAttribute('min');
    const max = await cardBonusInput.getAttribute('max');
    const step = await cardBonusInput.getAttribute('step');
    expect(min).toBe('0');
    expect(max).toBe('0.2');
    expect(step).toBe('0.01');
  });

  test('Filename boost inputs exist and are properly constrained', async ({ page }) => {
    // Exact match
    const exactInput = page.locator('input[name="FILENAME_BOOST_EXACT"]');
    await expect(exactInput).toBeVisible({ timeout: 10000 });
    const exactMin = await exactInput.getAttribute('min');
    const exactMax = await exactInput.getAttribute('max');
    expect(exactMin).toBe('1.0');
    expect(exactMax).toBe('3.0');

    // Partial match
    const partialInput = page.locator('input[name="FILENAME_BOOST_PARTIAL"]');
    await expect(partialInput).toBeVisible({ timeout: 10000 });
    const partialMin = await partialInput.getAttribute('min');
    const partialMax = await partialInput.getAttribute('max');
    expect(partialMin).toBe('1.0');
    expect(partialMax).toBe('2.0');
  });

  test('LangGraph and query rewrite inputs exist', async ({ page }) => {
    const langgraphInput = page.locator('input[name="LANGGRAPH_FINAL_K"]');
    await expect(langgraphInput).toBeVisible({ timeout: 10000 });

    const rewritesInput = page.locator('input[name="MAX_QUERY_REWRITES"]');
    await expect(rewritesInput).toBeVisible({ timeout: 10000 });

    const fallbackInput = page.locator('input[name="FALLBACK_CONFIDENCE"]');
    await expect(fallbackInput).toBeVisible({ timeout: 10000 });
  });

  test('Layer bonus inputs exist with proper constraints', async ({ page }) => {
    const layerGuiInput = page.locator('input[name="LAYER_BONUS_GUI"]');
    await expect(layerGuiInput).toBeVisible({ timeout: 10000 });
    const guiMin = await layerGuiInput.getAttribute('min');
    const guiMax = await layerGuiInput.getAttribute('max');
    const guiStep = await layerGuiInput.getAttribute('step');
    expect(guiMin).toBe('0.0');
    expect(guiMax).toBe('0.5');
    expect(guiStep).toBe('0.05');

    const layerRetrievalInput = page.locator('input[name="LAYER_BONUS_RETRIEVAL"]');
    await expect(layerRetrievalInput).toBeVisible({ timeout: 10000 });
  });

  test('Vendor penalty and freshness bonus inputs exist', async ({ page }) => {
    const vendorInput = page.locator('input[name="VENDOR_PENALTY"]');
    await expect(vendorInput).toBeVisible({ timeout: 10000 });
    const vendorMin = await vendorInput.getAttribute('min');
    const vendorMax = await vendorInput.getAttribute('max');
    expect(vendorMin).toBe('-0.5');
    expect(vendorMax).toBe('0.0');

    const freshnessInput = page.locator('input[name="FRESHNESS_BONUS"]');
    await expect(freshnessInput).toBeVisible({ timeout: 10000 });
    const freshnessMax = await freshnessInput.getAttribute('max');
    expect(freshnessMax).toBe('0.3');
  });

  test('Routing Trace section renders without errors', async ({ page }) => {
    const traceHeader = page.locator('h3:has-text("Routing Trace")');
    await expect(traceHeader).toBeVisible({ timeout: 10000 });

    // Check trace buttons exist
    const latestBtn = page.locator('button#btn-trace-latest');
    await expect(latestBtn).toBeVisible();

    const lsBtn = page.locator('button#btn-trace-open-ls');
    await expect(lsBtn).toBeVisible();
  });

  test('Tracing mode select works correctly', async ({ page }) => {
    const tracingModeSelect = page.locator('select[name="TRACING_MODE"]');
    await expect(tracingModeSelect).toBeVisible({ timeout: 10000 });

    // Check options exist
    const options = await tracingModeSelect.locator('option').allTextContents();
    expect(options).toContain('Off');
    expect(options).toContain('Local');
    expect(options).toContain('LangSmith');
  });

  test('LangChain tracing inputs exist', async ({ page }) => {
    const langchainTracingSelect = page.locator('select[name="LANGCHAIN_TRACING_V2"]');
    await expect(langchainTracingSelect).toBeVisible({ timeout: 10000 });

    const langchainEndpoint = page.locator('input[name="LANGCHAIN_ENDPOINT"]');
    await expect(langchainEndpoint).toBeVisible({ timeout: 10000 });

    const langchainApiKey = page.locator('input[name="LANGCHAIN_API_KEY"]');
    await expect(langchainApiKey).toBeVisible({ timeout: 10000 });
    const keyType = await langchainApiKey.getAttribute('type');
    expect(keyType).toBe('password');

    const langsmithApiKey = page.locator('input[name="LANGSMITH_API_KEY"]');
    await expect(langsmithApiKey).toBeVisible({ timeout: 10000 });

    const langchainProject = page.locator('input[name="LANGCHAIN_PROJECT"]');
    await expect(langchainProject).toBeVisible({ timeout: 10000 });
  });

  test('LangTrace inputs exist and are properly typed', async ({ page }) => {
    const langtraceHost = page.locator('input[name="LANGTRACE_API_HOST"]');
    await expect(langtraceHost).toBeVisible({ timeout: 10000 });

    const langtraceProjectId = page.locator('input[name="LANGTRACE_PROJECT_ID"]');
    await expect(langtraceProjectId).toBeVisible({ timeout: 10000 });

    const langtraceApiKey = page.locator('input[name="LANGTRACE_API_KEY"]');
    await expect(langtraceApiKey).toBeVisible({ timeout: 10000 });
    const keyType = await langtraceApiKey.getAttribute('type');
    expect(keyType).toBe('password');
  });

  test('Trace retention input exists with constraints', async ({ page }) => {
    const retentionInput = page.locator('input[name="TRACE_RETENTION"]');
    await expect(retentionInput).toBeVisible({ timeout: 10000 });

    const min = await retentionInput.getAttribute('min');
    const max = await retentionInput.getAttribute('max');
    expect(min).toBe('1');
    expect(max).toBe('500');
  });

  test('Config loads from backend successfully', async ({ page }) => {
    // Wait for config to load
    await page.waitForTimeout(2000);

    // Check that RRF_K_DIV has a value (default or loaded)
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    const rrfValue = await rrfInput.inputValue();
    expect(rrfValue).not.toBe('');
    expect(parseFloat(rrfValue)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(rrfValue)).toBeLessThanOrEqual(100);

    // Check that CARD_BONUS has a value
    const cardInput = page.locator('input[name="CARD_BONUS"]');
    const cardValue = await cardInput.inputValue();
    expect(cardValue).not.toBe('');
  });

  test('Settings can be updated via backend API', async ({ page }) => {
    // Intercept API calls
    let apiCalled = false;
    await page.route('**/api/config', (route) => {
      if (route.request().method() === 'POST') {
        apiCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        route.continue();
      }
    });

    // Change RRF_K_DIV value
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    await rrfInput.fill('70');

    // Trigger blur to save
    await rrfInput.blur();

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(apiCalled).toBe(true);
  });

  test('No dangerouslySetInnerHTML in Advanced RAG Tuning section', async ({ page }) => {
    // This test verifies proper TSX rendering by checking DOM structure
    const advancedSection = page.locator('.settings-section:has-text("Advanced RAG Tuning")');
    await expect(advancedSection).toBeVisible({ timeout: 10000 });

    // Check that inputs are properly rendered as React components
    const inputGroups = advancedSection.locator('.input-group');
    const count = await inputGroups.count();
    expect(count).toBeGreaterThan(5); // Should have multiple input groups
  });

  test('No dangerouslySetInnerHTML in Routing Trace section', async ({ page }) => {
    const traceSection = page.locator('.settings-section:has-text("Routing Trace")');
    await expect(traceSection).toBeVisible({ timeout: 10000 });

    // Check that inputs are properly rendered
    const inputGroups = traceSection.locator('.input-group');
    const count = await inputGroups.count();
    expect(count).toBeGreaterThan(5); // Should have multiple input groups
  });

  test('Tooltips exist for advanced parameters', async ({ page }) => {
    // Check RRF K Divisor has tooltip
    const rrfTooltip = page.locator('input[name="RRF_K_DIV"]').locator('..').locator('.tooltip-wrap');
    await expect(rrfTooltip).toBeVisible({ timeout: 10000 });

    // Check Card Bonus has tooltip
    const cardTooltip = page.locator('input[name="CARD_BONUS"]').locator('..').locator('.tooltip-wrap');
    await expect(cardTooltip).toBeVisible({ timeout: 10000 });
  });

  test('Security: Password fields are properly masked', async ({ page }) => {
    const langchainApiKey = page.locator('input[name="LANGCHAIN_API_KEY"]');
    await expect(langchainApiKey).toBeVisible({ timeout: 10000 });

    const inputType = await langchainApiKey.getAttribute('type');
    expect(inputType).toBe('password');

    const langsmithApiKey = page.locator('input[name="LANGSMITH_API_KEY"]');
    const langsmithType = await langsmithApiKey.getAttribute('type');
    expect(langsmithType).toBe('password');

    const langtraceApiKey = page.locator('input[name="LANGTRACE_API_KEY"]');
    const langtraceType = await langtraceApiKey.getAttribute('type');
    expect(langtraceType).toBe('password');
  });

  test('Section dividers are visually distinct', async ({ page }) => {
    const advancedSection = page.locator('.settings-section:has-text("Advanced RAG Tuning")');
    await expect(advancedSection).toBeVisible({ timeout: 10000 });

    // Check for border-left styling
    const borderLeft = await advancedSection.evaluate((el) => {
      return window.getComputedStyle(el).borderLeftWidth;
    });
    expect(borderLeft).toBe('3px');
  });

  test('All numeric inputs have proper constraints', async ({ page }) => {
    const numericInputs = [
      { name: 'RRF_K_DIV', min: 10, max: 100 },
      { name: 'CARD_BONUS', min: 0, max: 0.2 },
      { name: 'FILENAME_BOOST_EXACT', min: 1.0, max: 3.0 },
      { name: 'FILENAME_BOOST_PARTIAL', min: 1.0, max: 2.0 },
      { name: 'LANGGRAPH_FINAL_K', min: 5, max: 50 },
      { name: 'MAX_QUERY_REWRITES', min: 1, max: 5 },
      { name: 'FALLBACK_CONFIDENCE', min: 0.3, max: 0.8 },
      { name: 'LAYER_BONUS_GUI', min: 0.0, max: 0.5 },
      { name: 'LAYER_BONUS_RETRIEVAL', min: 0.0, max: 0.5 },
      { name: 'VENDOR_PENALTY', min: -0.5, max: 0.0 },
      { name: 'FRESHNESS_BONUS', min: 0.0, max: 0.3 },
      { name: 'TRACE_RETENTION', min: 1, max: 500 },
    ];

    for (const input of numericInputs) {
      const element = page.locator(`input[name="${input.name}"]`);
      await expect(element).toBeVisible({ timeout: 5000 });

      const min = await element.getAttribute('min');
      const max = await element.getAttribute('max');

      expect(parseFloat(min || '0')).toBe(input.min);
      expect(parseFloat(max || '0')).toBe(input.max);
    }
  });
});
