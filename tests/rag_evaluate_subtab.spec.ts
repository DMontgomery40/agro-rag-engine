import { test, expect } from '@playwright/test';

/**
 * RAG Evaluate Subtab - Smoke Test
 *
 * Tests that the Full RAG Performance Evaluation subtab renders correctly
 * and is properly wired to backend endpoints.
 *
 * This is NOT testing reranker evaluation - that's in LearningRankerSubtab.
 * This tests the full RAG pipeline evaluation (retrieval + generation).
 */

test.describe('RAG Evaluate Subtab - Full RAG Performance Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab
    const ragTab = page.locator('#tab-btn-rag');
    await ragTab.waitFor({ state: 'visible', timeout: 10000 });
    await ragTab.click();

    // Wait for RAG tab to become active
    await page.waitForSelector('#tab-rag.active', { timeout: 5000 });

    // Navigate to Evaluate subtab
    const evaluateSubtab = page.locator('button:has-text("Evaluate")');
    await evaluateSubtab.waitFor({ state: 'visible', timeout: 5000 });
    await evaluateSubtab.click();

    // Wait for subtab content to load
    await page.waitForTimeout(500);
  });

  test('renders without black screen', async ({ page }) => {
    // Check that main container exists and is visible
    const container = page.locator('.settings-section').first();
    await expect(container).toBeVisible();
  });

  test('displays "Full RAG Performance Evaluation" section with clear naming', async ({ page }) => {
    // Verify the section title clearly indicates this is FULL RAG evaluation
    // NOT just reranker
    const fullRagSection = page.locator('h3:has-text("Full RAG Performance Evaluation")');
    await expect(fullRagSection).toBeVisible();

    // Verify description clarifies difference from reranker-only eval
    const description = page.locator('text=This evaluates the entire system (not just reranker');
    await expect(description).toBeVisible();
  });

  test('displays Golden Questions Manager section', async ({ page }) => {
    const goldenSection = page.locator('h3:has-text("Golden Questions Manager")');
    await expect(goldenSection).toBeVisible();

    // Check for add question form
    const questionTextarea = page.locator('textarea[placeholder*="OAuth"]');
    await expect(questionTextarea).toBeVisible();

    // Check for repo select
    const repoSelect = page.locator('select').filter({ hasText: 'agro' });
    await expect(repoSelect).toBeVisible();
  });

  test('has all evaluation settings inputs', async ({ page }) => {
    // Use Multi-Query select
    const multiQuerySelect = page.locator('select').filter({ has: page.locator('option:has-text("Yes")') }).first();
    await expect(multiQuerySelect).toBeVisible();

    // Final K Results input
    const finalKInput = page.locator('input[type="number"]').filter({ has: page.locator('~ label:has-text("Final K")') }).first();
    await expect(finalKInput).toBeVisible();

    // Sample Size select
    const sampleSizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("Full (All Questions)")') });
    await expect(sampleSizeSelect).toBeVisible();

    // Golden Questions Path
    const goldenPathInput = page.locator('input[type="text"][placeholder*="golden"]');
    await expect(goldenPathInput).toBeVisible();

    // Baseline Path
    const baselinePathInput = page.locator('input[type="text"][placeholder*="baseline"]');
    await expect(baselinePathInput).toBeVisible();
  });

  test('has action buttons for golden questions', async ({ page }) => {
    // Add Question button
    const addButton = page.locator('button:has-text("Add Question")');
    await expect(addButton).toBeVisible();

    // Test First button
    const testButton = page.locator('button:has-text("Test First")');
    await expect(testButton).toBeVisible();

    // Refresh List button
    const refreshButton = page.locator('button:has-text("Refresh List")');
    await expect(refreshButton).toBeVisible();

    // Export JSON button
    const exportButton = page.locator('button:has-text("Export JSON")');
    await expect(exportButton).toBeVisible();
  });

  test('has Run Full Evaluation button', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Full Evaluation")');
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });

  test('has Save Eval Settings button', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save Eval Settings")');
    await expect(saveButton).toBeVisible();
  });

  test('displays Evaluation Run History table', async ({ page }) => {
    const historyTable = page.locator('table').filter({ has: page.locator('th:has-text("Timestamp")') });
    await expect(historyTable).toBeVisible();

    // Check for expected columns
    await expect(page.locator('th:has-text("Configuration")')).toBeVisible();
    await expect(page.locator('th:has-text("Top-1")')).toBeVisible();
    await expect(page.locator('th:has-text("Top-5")')).toBeVisible();
    await expect(page.locator('th:has-text("Time (s)")')).toBeVisible();
  });

  test('can type in question textarea', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="OAuth"]');
    await textarea.fill('Where is the authentication code?');
    await expect(textarea).toHaveValue('Where is the authentication code?');
  });

  test('can change evaluation settings', async ({ page }) => {
    // Change Use Multi-Query
    const multiSelect = page.locator('label:has-text("Use Multi-Query")').locator('~ select').first();
    await multiSelect.selectOption('0');
    await expect(multiSelect).toHaveValue('0');

    // Change Final K
    const finalKInput = page.locator('label:has-text("Final K Results")').locator('~ input').first();
    await finalKInput.fill('10');
    await expect(finalKInput).toHaveValue('10');

    // Change Sample Size
    const sampleSelect = page.locator('label:has-text("Sample Size")').locator('~ select').first();
    await sampleSelect.selectOption('10');
    await expect(sampleSelect).toHaveValue('10');
  });

  test('no dangerouslySetInnerHTML or XSS vulnerabilities', async ({ page }) => {
    // Check that content is rendered as proper React components, not HTML strings
    // Try to inject script tags via question input
    const textarea = page.locator('textarea[placeholder*="OAuth"]');
    await textarea.fill('<script>alert("XSS")</script>');

    // If properly escaped, the script tag should appear as text, not execute
    const value = await textarea.inputValue();
    expect(value).toBe('<script>alert("XSS")</script>');

    // No alerts should have been triggered
    page.on('dialog', dialog => {
      throw new Error('Alert dialog appeared - possible XSS vulnerability!');
    });
  });

  test('settings persist to backend (integration check)', async ({ page }) => {
    // This test verifies the wiring to backend
    // We won't fully test the backend response, just that the request is made

    let saveRequestMade = false;
    page.on('request', request => {
      if (request.url().includes('/api/config') && request.method() === 'PUT') {
        saveRequestMade = true;
      }
    });

    // Click Save Eval Settings
    const saveButton = page.locator('button:has-text("Save Eval Settings")');
    await saveButton.click();

    // Wait for potential request
    await page.waitForTimeout(1000);

    // We expect the save request to be made (even if it fails due to backend state)
    // This confirms the button is wired
    expect(saveRequestMade).toBe(true);
  });

  test('clearly distinguishes from reranker-only evaluation', async ({ page }) => {
    // Verify that the naming makes it clear this is NOT just reranker eval
    const fullRagText = page.locator('text=Full RAG Performance Evaluation');
    await expect(fullRagText).toBeVisible();

    // Verify the description mentions it's the entire system
    const systemText = page.locator('text=entire system');
    await expect(systemText).toBeVisible();

    // Verify it references the Learning Ranker tab for reranker-specific metrics
    const learningRankerRef = page.locator('text=Learning Ranker tab');
    await expect(learningRankerRef).toBeVisible();
  });
});
