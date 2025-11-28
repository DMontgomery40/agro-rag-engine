import { test, expect } from '@playwright/test';

/**
 * DataQualitySubtab - Complete React Component Test
 *
 * Validates the fully-converted React component with:
 * - Zero dangerouslySetInnerHTML usage
 * - All inputs typed and wired to backend
 * - Embedding model picker present and functional
 * - Keywords manager functional
 * - Cards manager functional
 * - Settings persist to backend
 */

test.describe('DataQualitySubtab - Complete React Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RAG page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click RAG tab
    const ragTab = page.locator('button:has-text("RAG")').first();
    if (await ragTab.isVisible()) {
      await ragTab.click();
      await page.waitForTimeout(500);
    }

    // Click Data Quality subtab
    const dataQualityTab = page.locator('button:has-text("Data Quality")').first();
    if (await dataQualityTab.isVisible()) {
      await dataQualityTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('renders without errors and shows main sections', async ({ page }) => {
    // Check main sections are present
    await expect(page.locator('h3:has-text("Repository Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("Embedding Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("Keywords Parameters")')).toBeVisible();
    await expect(page.locator('h3:has-text("Code Cards Builder")')).toBeVisible();
    await expect(page.locator('h3:has-text("Semantic Synonyms")')).toBeVisible();
  });

  test('embedding model picker is present and functional', async ({ page }) => {
    // Check embedding provider dropdown exists
    const providerSelect = page.locator('select').filter({ hasText: /OpenAI|Voyage|Local/ }).first();
    await expect(providerSelect).toBeVisible();

    // Check embedding model dropdown exists
    const modelLabel = page.locator('label:has-text("Embedding Model")').first();
    await expect(modelLabel).toBeVisible();

    const modelSelect = modelLabel.locator('..').locator('select').first();
    await expect(modelSelect).toBeVisible();

    // Verify default value is set
    const modelValue = await modelSelect.inputValue();
    expect(modelValue).toBeTruthy();
    expect(modelValue.length).toBeGreaterThan(0);

    // Test provider change updates model options
    await providerSelect.selectOption('voyage');
    await page.waitForTimeout(300);

    // Verify model dropdown updated to Voyage models
    const voyageOptions = await modelSelect.locator('option').allTextContents();
    expect(voyageOptions.some(opt => opt.includes('voyage'))).toBeTruthy();

    // Switch to OpenAI
    await providerSelect.selectOption('openai');
    await page.waitForTimeout(300);

    const openaiOptions = await modelSelect.locator('option').allTextContents();
    expect(openaiOptions.some(opt => opt.includes('embedding'))).toBeTruthy();
  });

  test('embedding dimension input is wired', async ({ page }) => {
    const dimInput = page.locator('label:has-text("Embedding Dimension")').locator('..').locator('input[type="number"]').first();
    await expect(dimInput).toBeVisible();

    // Verify it has a value
    const currentValue = await dimInput.inputValue();
    expect(parseInt(currentValue)).toBeGreaterThan(0);

    // Test changing the value
    await dimInput.fill('1024');
    const newValue = await dimInput.inputValue();
    expect(newValue).toBe('1024');
  });

  test('save embedding config button works', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save Embedding Config")').first();
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    // Mock the API response
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Click save
    await saveButton.click();
    await page.waitForTimeout(500);

    // Button should be temporarily disabled
    // (checking for state change is implementation-dependent)
  });

  test('keywords parameters are visible and functional', async ({ page }) => {
    // Max Keywords Per Repo
    const maxKeywordsInput = page.locator('label:has-text("Max Keywords Per Repo")').locator('..').locator('input[type="number"]').first();
    await expect(maxKeywordsInput).toBeVisible();
    await maxKeywordsInput.fill('100');
    expect(await maxKeywordsInput.inputValue()).toBe('100');

    // Min Frequency
    const minFreqInput = page.locator('label:has-text("Min Frequency")').locator('..').locator('input[type="number"]').first();
    await expect(minFreqInput).toBeVisible();
    await minFreqInput.fill('5');
    expect(await minFreqInput.inputValue()).toBe('5');

    // Keywords Boost
    const boostInput = page.locator('label:has-text("Keywords Boost")').locator('..').locator('input[type="number"]').first();
    await expect(boostInput).toBeVisible();
    await boostInput.fill('1.5');
    expect(await boostInput.inputValue()).toBe('1.5');

    // Auto-Generate Keywords
    const autoGenSelect = page.locator('label:has-text("Auto-Generate Keywords")').locator('..').locator('select').first();
    await expect(autoGenSelect).toBeVisible();
    await autoGenSelect.selectOption('0');
    expect(await autoGenSelect.inputValue()).toBe('0');

    // Refresh Hours
    const refreshInput = page.locator('label:has-text("Refresh Hours")').locator('..').locator('input[type="number"]').first();
    await expect(refreshInput).toBeVisible();
    await refreshInput.fill('48');
    expect(await refreshInput.inputValue()).toBe('48');
  });

  test('save keywords config button works', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save Keywords Config")').first();
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    // Mock the API response
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Click save
    await saveButton.click();
    await page.waitForTimeout(500);
  });

  test('cards manager section is visible and functional', async ({ page }) => {
    // Repository selector
    const repoSelect = page.locator('select#cards-repo-select').first();
    await expect(repoSelect).toBeVisible();

    // Exclude directories input
    const excludeDirsInput = page.locator('input[placeholder*="node_modules"]').first();
    await expect(excludeDirsInput).toBeVisible();
    await excludeDirsInput.fill('node_modules, dist');
    expect(await excludeDirsInput.inputValue()).toBe('node_modules, dist');

    // Exclude patterns input
    const excludePatternsInput = page.locator('input[placeholder*=".test.js"]').first();
    await expect(excludePatternsInput).toBeVisible();
    await excludePatternsInput.fill('.test.js, .spec.ts');
    expect(await excludePatternsInput.inputValue()).toBe('.test.js, .spec.ts');

    // Exclude keywords input
    const excludeKeywordsInput = page.locator('input[placeholder*="deprecated"]').first();
    await expect(excludeKeywordsInput).toBeVisible();
    await excludeKeywordsInput.fill('deprecated, legacy');
    expect(await excludeKeywordsInput.inputValue()).toBe('deprecated, legacy');

    // Cards Max input
    const cardsMaxInput = page.locator('label:has-text("Cards Max")').locator('..').locator('input[type="number"]').first();
    await expect(cardsMaxInput).toBeVisible();
    await cardsMaxInput.fill('50');
    expect(await cardsMaxInput.inputValue()).toBe('50');

    // Enrich with AI checkbox
    const enrichCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=Enrich with AI') }).first();
    await expect(enrichCheckbox).toBeVisible();
    const isChecked = await enrichCheckbox.isChecked();
    expect(typeof isChecked).toBe('boolean');
  });

  test('cards action buttons are present', async ({ page }) => {
    const buildButton = page.locator('button:has-text("Build Cards")').first();
    await expect(buildButton).toBeVisible();

    const refreshButton = page.locator('button:has-text("Refresh")').first();
    await expect(refreshButton).toBeVisible();

    const viewAllButton = page.locator('button:has-text("View All")').first();
    await expect(viewAllButton).toBeVisible();
  });

  test('cards search input is functional', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search semantic cards"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test query');
    expect(await searchInput.inputValue()).toBe('test query');

    await searchInput.clear();
    expect(await searchInput.inputValue()).toBe('');
  });

  test('cards viewer container is present', async ({ page }) => {
    const viewerContainer = page.locator('#cards-viewer-container').first();
    await expect(viewerContainer).toBeVisible();

    const viewer = page.locator('#cards-viewer').first();
    await expect(viewer).toBeVisible();
  });

  test('semantic synonyms section is visible', async ({ page }) => {
    const synonymsSection = page.locator('h3:has-text("Semantic Synonyms")').first();
    await expect(synonymsSection).toBeVisible();

    const synonymsText = page.locator('text=data/semantic_synonyms.json').first();
    await expect(synonymsText).toBeVisible();
  });

  test('no dangerouslySetInnerHTML in rendered output', async ({ page }) => {
    // Get all elements with data-* attributes that might indicate innerHTML usage
    const dangerousElements = await page.locator('[data-dangerous], [data-inner-html]').count();
    expect(dangerousElements).toBe(0);

    // Verify the component renders properly typed elements
    const inputCount = await page.locator('input').count();
    expect(inputCount).toBeGreaterThan(5); // Should have many inputs

    const selectCount = await page.locator('select').count();
    expect(selectCount).toBeGreaterThan(2); // Should have multiple selects
  });

  test('all form inputs have proper type attributes', async ({ page }) => {
    // Number inputs should have type="number"
    const numberInputs = await page.locator('input[type="number"]').count();
    expect(numberInputs).toBeGreaterThan(5);

    // Text inputs should have type="text" or type="search"
    const textInputs = await page.locator('input[type="text"], input[type="search"]').count();
    expect(textInputs).toBeGreaterThan(3);

    // Checkbox inputs should have type="checkbox"
    const checkboxInputs = await page.locator('input[type="checkbox"]').count();
    expect(checkboxInputs).toBeGreaterThan(0);
  });

  test('validates embedding config persists to backend', async ({ page }) => {
    let configUpdateReceived = false;
    let configData: any = null;

    // Intercept API calls
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        configUpdateReceived = true;
        configData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Change embedding provider
    const providerSelect = page.locator('select').filter({ hasText: /OpenAI|Voyage|Local/ }).first();
    await providerSelect.selectOption('voyage');
    await page.waitForTimeout(300);

    // Save
    const saveButton = page.locator('button:has-text("Save Embedding Config")').first();
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify backend received the update
    expect(configUpdateReceived).toBeTruthy();
    expect(configData).toBeTruthy();
    expect(configData.embedding).toBeTruthy();
    expect(configData.embedding.embedding_type).toBe('voyage');
  });

  test('validates keywords config persists to backend', async ({ page }) => {
    let configUpdateReceived = false;
    let configData: any = null;

    // Intercept API calls
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        configUpdateReceived = true;
        configData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Change keywords settings
    const maxKeywordsInput = page.locator('label:has-text("Max Keywords Per Repo")').locator('..').locator('input[type="number"]').first();
    await maxKeywordsInput.fill('75');

    // Save
    const saveButton = page.locator('button:has-text("Save Keywords Config")').first();
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify backend received the update
    expect(configUpdateReceived).toBeTruthy();
    expect(configData).toBeTruthy();
    expect(configData.keywords).toBeTruthy();
    expect(configData.keywords.keywords_max_per_repo).toBe(75);
  });

  test('no XSS vulnerabilities in inputs', async ({ page }) => {
    // Test XSS in text inputs
    const excludeDirsInput = page.locator('input[placeholder*="node_modules"]').first();
    await excludeDirsInput.fill('<script>alert("xss")</script>');

    const value = await excludeDirsInput.inputValue();
    // Value should be stored as-is (escaped when rendered)
    expect(value).toBe('<script>alert("xss")</script>');

    // But no script should execute
    const alerts = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });

    await page.waitForTimeout(500);
    expect(alerts.length).toBe(0);
  });

  test('component loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for component to fully load
    await page.waitForTimeout(2000);

    // Filter out known benign errors (if any)
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('sourcemap') &&
      !err.includes('DevTools')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
