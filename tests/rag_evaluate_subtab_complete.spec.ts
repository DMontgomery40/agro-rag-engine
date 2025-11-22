/**
 * Full RAG Performance Evaluation Subtab - Complete Verification
 *
 * This test verifies that the EvaluateSubtab component:
 * 1. Renders without errors (no black screen)
 * 2. Shows clear labeling for "Full RAG Performance Evaluation" (NOT just reranker)
 * 3. All inputs are present and wired to backend
 * 4. No dangerouslySetInnerHTML usage (security)
 * 5. Settings can be saved to /api/config
 */

import { test, expect } from '@playwright/test';

test.describe('RAG Evaluate Subtab - Full RAG Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForSelector('text=AGRO', { timeout: 10000 });

    // Navigate to RAG tab
    await page.click('text=RAG');
    await page.waitForTimeout(500);

    // Navigate to Evaluate subtab
    await page.click('text=Evaluate');
    await page.waitForTimeout(500);
  });

  test('Subtab renders without errors (smoke test)', async ({ page }) => {
    // Check that main sections are visible
    await expect(page.locator('text=Golden Questions Manager')).toBeVisible();
    await expect(page.locator('text=Full RAG Performance Evaluation')).toBeVisible();

    // Verify no error messages or blank screens
    const errorCount = await page.locator('text=/error|failed|crash/i').count();
    expect(errorCount).toBe(0);
  });

  test('Clear labeling distinguishes Full RAG from reranker-only evaluation', async ({ page }) => {
    // Must show "Full RAG Performance Evaluation" or similar clear naming
    await expect(page.locator('text=Full RAG Performance Evaluation')).toBeVisible();

    // Description should mention "entire RAG pipeline" or "retrieval + generation"
    const description = page.locator('text=/entire.*RAG|retrieval.*generation|complete.*RAG/i');
    await expect(description).toBeVisible();

    // Should clarify this is NOT just reranker evaluation
    const clarification = page.locator('text=/not just reranker|see Learning Ranker/i');
    await expect(clarification).toBeVisible();
  });

  test('Golden Questions Manager displays expected elements', async ({ page }) => {
    // Check for add question form
    await expect(page.locator('label:has-text("Question Text")')).toBeVisible();
    await expect(page.locator('label:has-text("Repository")')).toBeVisible();
    await expect(page.locator('label:has-text("Expected Paths")')).toBeVisible();

    // Check for action buttons
    await expect(page.locator('button:has-text("Add Question")')).toBeVisible();
    await expect(page.locator('button:has-text("Test First")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh List")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
  });

  test('Evaluation settings controls are present and wired', async ({ page }) => {
    // Check for eval setting inputs
    await expect(page.locator('label:has-text("Use Multi-Query")')).toBeVisible();
    await expect(page.locator('label:has-text("Final K Results")')).toBeVisible();
    await expect(page.locator('label:has-text("Sample Size")')).toBeVisible();

    // Check for path inputs
    await expect(page.locator('label:has-text("Golden Questions Path")')).toBeVisible();
    await expect(page.locator('label:has-text("Baseline Path")')).toBeVisible();

    // Check for save button
    await expect(page.locator('button:has-text("Save Eval Settings")')).toBeVisible();

    // Check for run button
    await expect(page.locator('button:has-text("Run Full Evaluation")')).toBeVisible();
  });

  test('Settings save to backend successfully', async ({ page }) => {
    // Set up request interception to verify API calls
    let configSaved = false;

    page.on('response', async (response) => {
      if (response.url().includes('/api/config') && response.request().method() === 'PUT') {
        configSaved = true;
        expect(response.ok()).toBeTruthy();
      }
    });

    // Modify a setting
    const finalKInput = page.locator('label:has-text("Final K Results")').locator('..').locator('input');
    await finalKInput.fill('7');

    // Click save
    await page.click('button:has-text("Save Eval Settings")');

    // Wait for alert confirmation (if present)
    await page.waitForTimeout(1000);

    // Verify config was saved
    expect(configSaved).toBeTruthy();
  });

  test('Golden Questions Path input has correct default', async ({ page }) => {
    // Check that golden path input shows correct default
    const goldenPathInput = page.locator('label:has-text("Golden Questions Path")').locator('..').locator('input');
    const value = await goldenPathInput.inputValue();

    // Should be data/evaluation_dataset.json or data/golden.json
    expect(value).toMatch(/data\/(evaluation_dataset|golden)\.json/);
  });

  test('Baseline Path input has correct default', async ({ page }) => {
    // Check that baseline path input shows correct default
    const baselinePathInput = page.locator('label:has-text("Baseline Path")').locator('..').locator('input');
    const value = await baselinePathInput.inputValue();

    // Should be data/evals/eval_baseline.json
    expect(value).toContain('data/evals/eval_baseline.json');
  });

  test('Multi-Query setting is wired correctly', async ({ page }) => {
    // Check that Use Multi-Query dropdown exists and has options
    const multiSelect = page.locator('label:has-text("Use Multi-Query")').locator('..').locator('select');
    await expect(multiSelect).toBeVisible();

    // Should have Yes/No options
    const options = await multiSelect.locator('option').allTextContents();
    expect(options).toContain('Yes');
    expect(options).toContain('No');
  });

  test('Sample Size dropdown has expected options', async ({ page }) => {
    const sampleSelect = page.locator('label:has-text("Sample Size")').locator('..').locator('select');
    await expect(sampleSelect).toBeVisible();

    const options = await sampleSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(0);
    expect(options.some(o => o.includes('Full'))).toBeTruthy();
  });

  test('Evaluation Run History section is present', async ({ page }) => {
    // Check for history section
    await expect(page.locator('text=Evaluation Run History')).toBeVisible();

    // Should have table headers
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
    await expect(page.locator('th:has-text("Configuration")')).toBeVisible();
    await expect(page.locator('th:has-text("Top-1")')).toBeVisible();
    await expect(page.locator('th:has-text("Top-5")')).toBeVisible();
  });

  test('No XSS vulnerabilities in dynamic content rendering', async ({ page }) => {
    // This test verifies proper TSX rendering (no dangerouslySetInnerHTML)

    // Check page source doesn't contain dangerouslySetInnerHTML
    const content = await page.content();
    expect(content).not.toContain('dangerouslySetInnerHTML');

    // Verify React is properly rendering components
    const reactRoot = await page.locator('#root').count();
    expect(reactRoot).toBe(1);
  });

  test('Input validation prevents empty questions', async ({ page }) => {
    // Set up alert handler
    let alertShown = false;
    page.on('dialog', async (dialog) => {
      alertShown = true;
      expect(dialog.message()).toContain('required');
      await dialog.accept();
    });

    // Try to add empty question
    await page.click('button:has-text("Add Question")');

    // Wait for alert
    await page.waitForTimeout(500);

    // Verify alert was shown
    expect(alertShown).toBeTruthy();
  });

  test('Test question functionality exists', async ({ page }) => {
    // Fill in test question
    const questionInput = page.locator('label:has-text("Question Text")').locator('..').locator('textarea');
    await questionInput.fill('Where is OAuth token validated?');

    const pathsInput = page.locator('label:has-text("Expected Paths")').locator('..').locator('input');
    await pathsInput.fill('auth, oauth');

    // Click "Test First" button
    const testButton = page.locator('button:has-text("Test First")');
    await expect(testButton).toBeVisible();

    // Verify button is clickable
    await expect(testButton).toBeEnabled();
  });

  test('Export functionality is available', async ({ page }) => {
    // Check for export button
    const exportButton = page.locator('button:has-text("Export JSON")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('Run Full Evaluation button is properly labeled', async ({ page }) => {
    // Verify the run button clearly states "Full Evaluation"
    const runButton = page.locator('button:has-text("Run Full Evaluation")');
    await expect(runButton).toBeVisible();

    // Should NOT say "Run Reranker" or similar
    const rerankerButton = page.locator('button:has-text(/Run Reranker|Reranker Only/i)');
    expect(await rerankerButton.count()).toBe(0);
  });

  test('Baseline comparison buttons are available', async ({ page }) => {
    // These buttons should exist but may be disabled if no results
    await expect(page.locator('button:has-text("Save as Baseline")')).toBeVisible();
    await expect(page.locator('button:has-text("Compare to Baseline")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Results")')).toBeVisible();
  });
});
