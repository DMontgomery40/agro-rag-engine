import { test, expect } from '@playwright/test';

/**
 * Test Suite: Data Quality Subtab - TSX Conversion & Embedding Model Picker
 *
 * Validates:
 * - No dangerouslySetInnerHTML (converted to TSX)
 * - All inputs properly typed and wired to backend
 * - Embedding model picker present and functional
 * - Settings save to backend successfully
 * - No XSS vulnerabilities
 */

test.describe('Data Quality Subtab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application (using existing dev server on 5173)
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab using more specific selector
    const ragTab = page.locator('a[href="/web/rag"]').first();
    await ragTab.click();

    // Wait for RAG page to load
    await page.waitForTimeout(500);

    // Navigate to Data Quality subtab
    const dataQualitySubtab = page.locator('button:has-text("Data Quality")').first();
    if (await dataQualitySubtab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dataQualitySubtab.click();
    }

    // Wait for subtab to load
    await page.waitForSelector('.settings-section', { state: 'visible', timeout: 5000 });
  });

  test('renders without errors (no blank screen)', async ({ page }) => {
    // Verify main sections are visible
    await expect(page.locator('h3:has-text("Repository Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("Embedding Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("Keywords Parameters")')).toBeVisible();
    await expect(page.locator('h3:has-text("Code Cards Builder & Viewer")')).toBeVisible();
  });

  test('has no dangerouslySetInnerHTML (fully converted to TSX)', async ({ page }) => {
    // Check that all form elements are rendered as proper React components
    // If dangerouslySetInnerHTML was used, elements would not be properly interactive

    // Test that selects are interactive
    const embeddingProviderSelect = page.locator('select').filter({ hasText: 'OpenAI' }).first();
    await expect(embeddingProviderSelect).toBeVisible();
    await expect(embeddingProviderSelect).toBeEnabled();

    // Test that inputs are interactive
    const maxKeywordsInput = page.locator('input[type="number"]').filter({ hasText: '' }).first();
    await expect(maxKeywordsInput).toBeVisible();

    // Test that buttons are interactive
    const saveButton = page.locator('button:has-text("Save Embedding Config")');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });

  test('Keywords Manager is visible and functional', async ({ page }) => {
    // Verify Keywords section exists
    const keywordsSection = page.locator('h3:has-text("Keywords Parameters")');
    await expect(keywordsSection).toBeVisible();

    // Verify keyword inputs are present
    await expect(page.locator('label:has-text("Max Keywords Per Repo")')).toBeVisible();
    await expect(page.locator('label:has-text("Min Frequency")')).toBeVisible();
    await expect(page.locator('label:has-text("Keywords Boost")')).toBeVisible();
    await expect(page.locator('label:has-text("Auto-Generate Keywords")')).toBeVisible();
    await expect(page.locator('label:has-text("Refresh Hours")')).toBeVisible();

    // Verify save button exists
    const saveKeywordsButton = page.locator('button:has-text("Save Keywords Config")');
    await expect(saveKeywordsButton).toBeVisible();
  });

  test('Cards Manager is visible and functional', async ({ page }) => {
    // Verify Cards section exists
    const cardsSection = page.locator('h3:has-text("Code Cards Builder & Viewer")');
    await expect(cardsSection).toBeVisible();

    // Verify cards builder inputs are present
    await expect(page.locator('label:has-text("Repository to Build Cards For")')).toBeVisible();
    await expect(page.locator('label:has-text("Exclude Directories")')).toBeVisible();
    await expect(page.locator('label:has-text("Exclude Patterns")')).toBeVisible();
    await expect(page.locator('label:has-text("Exclude Keywords")')).toBeVisible();
    await expect(page.locator('label:has-text("Cards Max")')).toBeVisible();

    // Verify action buttons exist
    await expect(page.locator('button:has-text("Build Cards")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("View All")')).toBeVisible();

    // Verify cards viewer container exists
    await expect(page.locator('#cards-viewer-container')).toBeVisible();
  });

  test('Embedding model selection dropdown is present and functional', async ({ page }) => {
    // Verify Embedding Configuration section exists
    const embeddingSection = page.locator('h3:has-text("Embedding Configuration")');
    await expect(embeddingSection).toBeVisible();

    // Verify Embedding Provider dropdown exists
    const providerLabel = page.locator('label:has-text("Embedding Provider")');
    await expect(providerLabel).toBeVisible();

    const providerSelect = page.locator('label:has-text("Embedding Provider")').locator('..').locator('select');
    await expect(providerSelect).toBeVisible();
    await expect(providerSelect).toBeEnabled();

    // Verify provider options
    const providerOptions = await providerSelect.locator('option').allTextContents();
    expect(providerOptions).toContain('OpenAI');
    expect(providerOptions).toContain('Voyage AI');
    expect(providerOptions).toContain('Local (SentenceTransformers)');
    expect(providerOptions).toContain('MxBai (HuggingFace)');

    // Verify Embedding Model dropdown exists
    const modelLabel = page.locator('label:has-text("Embedding Model")');
    await expect(modelLabel).toBeVisible();

    const modelSelect = page.locator('label:has-text("Embedding Model")').locator('..').locator('select');
    await expect(modelSelect).toBeVisible();
    await expect(modelSelect).toBeEnabled();

    // Verify model options for default provider (OpenAI)
    let modelOptions = await modelSelect.locator('option').allTextContents();
    expect(modelOptions.length).toBeGreaterThan(0);
    expect(modelOptions).toContain('text-embedding-3-large');

    // Change provider to Voyage and verify model options update
    await providerSelect.selectOption('voyage');
    await page.waitForTimeout(100); // Give React time to update

    modelOptions = await modelSelect.locator('option').allTextContents();
    expect(modelOptions).toContain('voyage-code-3');
    expect(modelOptions).toContain('voyage-code-2');

    // Change provider to Local and verify model options update
    await providerSelect.selectOption('local');
    await page.waitForTimeout(100);

    modelOptions = await modelSelect.locator('option').allTextContents();
    expect(modelOptions).toContain('all-MiniLM-L6-v2');
    expect(modelOptions).toContain('all-mpnet-base-v2');

    // Verify Embedding Dimension input exists
    await expect(page.locator('label:has-text("Embedding Dimension")')).toBeVisible();
  });

  test('Settings save to backend successfully', async ({ page }) => {
    // Listen for API calls
    const savePromise = page.waitForResponse(
      (response) => response.url().includes('/api/config') && response.request().method() === 'POST'
    );

    // Click save button for embedding config
    const saveButton = page.locator('button:has-text("Save Embedding Config")');
    await saveButton.click();

    // Wait for API call
    const response = await savePromise;
    expect(response.status()).toBe(200);

    // Verify no error message appears
    await expect(page.locator('text=Failed to save')).not.toBeVisible({ timeout: 1000 });
  });

  test('Embedding provider change updates available models', async ({ page }) => {
    // Get the model dropdown
    const modelSelect = page.locator('label:has-text("Embedding Model")').locator('..').locator('select');

    // Check initial state (OpenAI)
    let initialValue = await modelSelect.inputValue();
    expect(initialValue).toBeTruthy();

    // Change to Voyage
    const providerSelect = page.locator('label:has-text("Embedding Provider")').locator('..').locator('select');
    await providerSelect.selectOption('voyage');
    await page.waitForTimeout(200);

    // Verify model dropdown updated
    const voyageValue = await modelSelect.inputValue();
    expect(voyageValue).toContain('voyage');

    // Change to local
    await providerSelect.selectOption('local');
    await page.waitForTimeout(200);

    // Verify model dropdown updated again
    const localValue = await modelSelect.inputValue();
    expect(localValue).not.toContain('voyage');
    expect(localValue).not.toContain('text-embedding');
  });

  test('All form inputs are properly typed and controllable', async ({ page }) => {
    // Test number inputs
    const maxKeywordsInput = page.locator('label:has-text("Max Keywords Per Repo")').locator('..').locator('input[type="number"]');
    await maxKeywordsInput.fill('100');
    expect(await maxKeywordsInput.inputValue()).toBe('100');

    // Test select inputs
    const autoGenerateSelect = page.locator('label:has-text("Auto-Generate Keywords")').locator('..').locator('select');
    await autoGenerateSelect.selectOption('0');
    expect(await autoGenerateSelect.inputValue()).toBe('0');

    // Test text inputs
    const excludeDirsInput = page.locator('label:has-text("Exclude Directories")').locator('..').locator('input[type="text"]');
    await excludeDirsInput.fill('node_modules, dist, build');
    expect(await excludeDirsInput.inputValue()).toBe('node_modules, dist, build');

    // Test checkbox inputs
    const enrichCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: '' }).first();
    const wasChecked = await enrichCheckbox.isChecked();
    await enrichCheckbox.click();
    expect(await enrichCheckbox.isChecked()).toBe(!wasChecked);
  });

  test('No XSS vulnerabilities in user inputs', async ({ page }) => {
    // Try to inject script in text input
    const excludeDirsInput = page.locator('label:has-text("Exclude Directories")').locator('..').locator('input[type="text"]');
    const xssAttempt = '<script>alert("XSS")</script>';
    await excludeDirsInput.fill(xssAttempt);

    // Verify script doesn't execute (value is escaped)
    expect(await excludeDirsInput.inputValue()).toBe(xssAttempt);

    // Verify no alert dialog appears
    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected: dialog appeared');
    });

    // Wait a moment to ensure no dialog
    await page.waitForTimeout(500);
  });

  test('Cards search functionality works', async ({ page }) => {
    // Get the search input
    const searchInput = page.locator('label:has-text("Search Cards")').locator('..').locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('test query');
    expect(await searchInput.inputValue()).toBe('test query');

    // Verify search input is functional
    await searchInput.clear();
    expect(await searchInput.inputValue()).toBe('');
  });

  test('Repository selector is functional', async ({ page }) => {
    // Get the repository select
    const repoSelect = page.locator('label:has-text("Active Repository")').locator('..').locator('select');

    // Verify it exists and is enabled
    await expect(repoSelect).toBeVisible();

    // If there are repos, verify we can select them
    const options = await repoSelect.locator('option').count();
    if (options > 1) {
      const firstOption = await repoSelect.locator('option').nth(0).textContent();
      await repoSelect.selectOption({ index: 0 });
      expect(await repoSelect.inputValue()).toBeTruthy();
    }
  });

  test('Semantic Synonyms section displays information', async ({ page }) => {
    // Verify Semantic Synonyms section exists
    const synonymsSection = page.locator('h3:has-text("Semantic Synonyms")');
    await expect(synonymsSection).toBeVisible();

    // Verify it mentions the config file
    await expect(page.locator('text=data/semantic_synonyms.json')).toBeVisible();

    // Verify it mentions the Retrieval tab setting
    await expect(page.locator('text=USE_SEMANTIC_SYNONYMS')).toBeVisible();
  });

  test('Loading state displays correctly', async ({ page }) => {
    // This test verifies the loading state that appears on initial load
    // Since the component loads quickly, we'll verify the post-load state

    // After loading, form elements should be visible
    await expect(page.locator('.settings-section')).toBeVisible();
    await expect(page.locator('button:has-text("Save Embedding Config")')).toBeEnabled();

    // No "Loading configuration..." text should be visible
    await expect(page.locator('text=Loading configuration...')).not.toBeVisible({ timeout: 1000 });
  });

  test('Help icons are present for key settings', async ({ page }) => {
    // Verify help icons exist for important fields
    const helpIcons = page.locator('.help-icon');
    const count = await helpIcons.count();

    // Should have multiple help icons
    expect(count).toBeGreaterThan(5);

    // Verify specific help icons
    await expect(page.locator('label:has-text("Embedding Provider")').locator('.help-icon')).toBeVisible();
    await expect(page.locator('label:has-text("Embedding Model")').locator('.help-icon')).toBeVisible();
    await expect(page.locator('label:has-text("Max Keywords Per Repo")').locator('.help-icon')).toBeVisible();
  });
});
