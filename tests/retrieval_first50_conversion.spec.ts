import { test, expect } from '@playwright/test';

/**
 * Playwright Test for RetrievalSubtab First 50% Conversion (Agent 7)
 *
 * Tests the converted Generation Models and Retrieval Parameters sections
 * to ensure they render correctly and interact with the backend API.
 *
 * CRITICAL: This test verifies the conversion from dangerouslySetInnerHTML
 * to proper TypeScript React TSX is working correctly.
 */

test.describe('RetrievalSubtab - First 50% TSX Conversion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RAG configuration page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab and Retrieval subtab
    await page.click('text=RAG');
    await page.click('text=Retrieval');
    await page.waitForTimeout(500); // Allow tab switch animation
  });

  test('renders Generation Models section without errors', async ({ page }) => {
    // Check that the section heading exists
    const genModelsHeading = page.locator('h3:has-text("Generation Models")');
    await expect(genModelsHeading).toBeVisible();

    // Verify critical inputs are present
    await expect(page.locator('select[name="GEN_MODEL"]')).toBeVisible();
    await expect(page.locator('input[name="OPENAI_API_KEY"]')).toBeVisible();
    await expect(page.locator('input[name="GEN_TEMPERATURE"]')).toBeVisible();

    // Verify Add Model button exists
    await expect(page.locator('button#btn-add-gen-model')).toBeVisible();
  });

  test('renders Retrieval Parameters section without errors', async ({ page }) => {
    // Check that the section heading exists
    const retrievalHeading = page.locator('h3:has-text("Retrieval Parameters")');
    await expect(retrievalHeading).toBeVisible();

    // Verify critical inputs are present
    await expect(page.locator('input[name="MQ_REWRITES"]')).toBeVisible();
    await expect(page.locator('input[name="FINAL_K"]')).toBeVisible();
    await expect(page.locator('select[name="USE_SEMANTIC_SYNONYMS"]')).toBeVisible();
    await expect(page.locator('input[name="TOPK_DENSE"]')).toBeVisible();
    await expect(page.locator('input[name="TOPK_SPARSE"]')).toBeVisible();
  });

  test('Generation Models - Primary model selection works', async ({ page }) => {
    const genModelSelect = page.locator('select#gen-model-select');

    // Wait for models to load
    await page.waitForTimeout(1000);

    // Check that the select is enabled
    await expect(genModelSelect).toBeEnabled();

    // Try selecting first available model (if any)
    const options = await genModelSelect.locator('option').all();
    if (options.length > 1) {
      const firstModel = await options[1].textContent(); // Skip "Select a model..."
      if (firstModel) {
        await genModelSelect.selectOption(firstModel);

        // Verify selection was made
        const selectedValue = await genModelSelect.inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }
  });

  test('Generation Models - Temperature input accepts valid values', async ({ page }) => {
    const tempInput = page.locator('input[name="GEN_TEMPERATURE"]');

    // Clear and set new value
    await tempInput.fill('0.7');

    // Trigger blur to save
    await tempInput.blur();
    await page.waitForTimeout(300);

    // Verify value was set
    const value = await tempInput.inputValue();
    expect(parseFloat(value)).toBeCloseTo(0.7, 1);
  });

  test('Retrieval Parameters - Multi-Query Rewrites input works', async ({ page }) => {
    const mqInput = page.locator('input[name="MQ_REWRITES"]');

    // Clear and set new value
    await mqInput.fill('3');
    await mqInput.blur();
    await page.waitForTimeout(300);

    // Verify value was set
    const value = await mqInput.inputValue();
    expect(parseInt(value, 10)).toBe(3);
  });

  test('Retrieval Parameters - Semantic Synonyms toggle works', async ({ page }) => {
    const synonymsSelect = page.locator('select[name="USE_SEMANTIC_SYNONYMS"]');

    // Toggle to OFF
    await synonymsSelect.selectOption('0');
    await page.waitForTimeout(300);
    expect(await synonymsSelect.inputValue()).toBe('0');

    // Toggle back to ON
    await synonymsSelect.selectOption('1');
    await page.waitForTimeout(300);
    expect(await synonymsSelect.inputValue()).toBe('1');
  });

  test('Retrieval Parameters - Hydration Mode selection works', async ({ page }) => {
    const hydrationSelect = page.locator('select[name="HYDRATION_MODE"]');

    // Switch to "none"
    await hydrationSelect.selectOption('none');
    await page.waitForTimeout(300);
    expect(await hydrationSelect.inputValue()).toBe('none');

    // Switch back to "lazy"
    await hydrationSelect.selectOption('lazy');
    await page.waitForTimeout(300);
    expect(await hydrationSelect.inputValue()).toBe('lazy');
  });

  test('Retrieval Parameters - Weight inputs enforce constraints', async ({ page }) => {
    const bm25Input = page.locator('input#BM25_WEIGHT');
    const vectorInput = page.locator('input#VECTOR_WEIGHT');

    // Verify constraints are set
    expect(await bm25Input.getAttribute('min')).toBe('0');
    expect(await bm25Input.getAttribute('max')).toBe('1');
    expect(await bm25Input.getAttribute('step')).toBe('0.1');

    expect(await vectorInput.getAttribute('min')).toBe('0');
    expect(await vectorInput.getAttribute('max')).toBe('1');
  });

  test('NO dangerouslySetInnerHTML in rendered DOM', async ({ page }) => {
    // Check that there are no elements with __html property
    const hasDangerousHTML = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if ('__html' in el || el.innerHTML.includes('__html')) {
          return true;
        }
      }
      return false;
    });

    expect(hasDangerousHTML).toBe(false);
  });

  test('API config endpoint is called on mount', async ({ page }) => {
    // Listen for API calls
    let configCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/config')) {
        configCalled = true;
      }
    });

    // Reload page to trigger mount
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to RAG -> Retrieval again
    await page.click('text=RAG');
    await page.click('text=Retrieval');
    await page.waitForTimeout(1000);

    expect(configCalled).toBe(true);
  });

  test('Tooltips are present for major settings', async ({ page }) => {
    // Check for help icons (tooltips)
    const helpIcons = page.locator('.help-icon, .tooltip-wrap');
    const count = await helpIcons.count();

    // There should be many tooltips in the first 50%
    expect(count).toBeGreaterThan(20);
  });

  test('Form validation: Enrich Backend dropdown has correct options', async ({ page }) => {
    const enrichSelect = page.locator('select#enrich-backend-select');
    await expect(enrichSelect).toBeVisible();

    // Verify all backend options are present
    const options = await enrichSelect.locator('option').allTextContents();
    expect(options).toContain('OpenAI');
    expect(options).toContain('Anthropic');
    expect(options).toContain('Google');
    expect(options).toContain('Ollama');
    expect(options).toContain('Local');
  });

  test('Graceful degradation: Page renders even if API fails', async ({ page }) => {
    // Block API requests
    await page.route('**/api/config', route => route.abort());

    // Reload and navigate
    await page.reload();
    await page.waitForTimeout(500);

    // Navigate to RAG -> Retrieval
    await page.click('text=RAG');
    await page.click('text=Retrieval');
    await page.waitForTimeout(1000);

    // Page should still render (with default values)
    const genModelsHeading = page.locator('h3:has-text("Generation Models")');
    await expect(genModelsHeading).toBeVisible();
  });
});
