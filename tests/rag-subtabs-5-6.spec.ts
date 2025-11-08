/**
 * AGRO - RAG Subtabs 5-6 Test
 * Verifies Indexing and Evaluate subtabs render correctly
 * Agent B3 Emergency React Conversion
 */

import { test, expect } from '@playwright/test';

test.describe('RAG Subtabs 5-6 (Indexing + Evaluate)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3004');

    // Wait for app to load
    await page.waitForSelector('.tab-bar', { timeout: 10000 });

    // Click RAG tab
    const ragTab = page.locator('.tab-btn').filter({ hasText: 'RAG' });
    await ragTab.click();

    // Wait for subtabs to appear
    await page.waitForSelector('#rag-subtabs', { timeout: 5000 });
  });

  test('Indexing subtab renders correctly', async ({ page }) => {
    // Click Indexing subtab
    const indexingBtn = page.locator('.subtab-btn[data-subtab="indexing"]');
    await expect(indexingBtn).toBeVisible();
    await indexingBtn.click();

    // Wait for subtab content to load
    await page.waitForTimeout(500);

    // Verify main heading
    await expect(page.locator('text=🚀 Index Repository')).toBeVisible();

    // Verify simple index form exists
    await expect(page.locator('#simple-repo-select')).toBeVisible();
    await expect(page.locator('#simple-dense-check')).toBeVisible();
    await expect(page.locator('#simple-index-btn')).toBeVisible();

    // Verify advanced indexing controls
    await expect(page.locator('text=Build Index')).toBeVisible();
    await expect(page.locator('#index-repo-select')).toBeVisible();
    await expect(page.locator('#btn-index-start')).toBeVisible();
    await expect(page.locator('#btn-index-stop')).toBeVisible();

    // Verify progress bar exists
    await expect(page.locator('#index-bar')).toBeVisible();
    await expect(page.locator('#index-status')).toBeVisible();

    // Verify advanced settings section
    await expect(page.locator('text=Advanced Settings')).toBeVisible();

    // Verify index profiles section
    await expect(page.locator('text=Index Profiles')).toBeVisible();
    await expect(page.locator('#index-profile-select')).toBeVisible();
    await expect(page.locator('#btn-apply-profile')).toBeVisible();
  });

  test('Evaluate subtab renders correctly', async ({ page }) => {
    // Click Evaluate subtab
    const evaluateBtn = page.locator('.subtab-btn[data-subtab="evaluate"]');
    await expect(evaluateBtn).toBeVisible();
    await evaluateBtn.click();

    // Wait for subtab content to load
    await page.waitForTimeout(500);

    // Verify Golden Questions Manager section
    await expect(page.locator('text=Golden Questions Manager')).toBeVisible();

    // Verify add question form
    await expect(page.locator('#golden-new-q')).toBeVisible();
    await expect(page.locator('#golden-new-repo')).toBeVisible();
    await expect(page.locator('#golden-new-paths')).toBeVisible();
    await expect(page.locator('#btn-golden-add')).toBeVisible();
    await expect(page.locator('#btn-golden-test-new')).toBeVisible();

    // Verify questions list
    await expect(page.locator('#golden-questions-list')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('#btn-golden-refresh')).toBeVisible();
    await expect(page.locator('#btn-golden-load-recommended')).toBeVisible();
    await expect(page.locator('#btn-golden-run-tests')).toBeVisible();
    await expect(page.locator('#btn-golden-export')).toBeVisible();

    // Verify Evaluation Runner section
    await expect(page.locator('text=Evaluation Runner')).toBeVisible();

    // Verify eval settings
    await expect(page.locator('#eval-use-multi')).toBeVisible();
    await expect(page.locator('#eval-final-k')).toBeVisible();
    await expect(page.locator('#eval-golden-path')).toBeVisible();
    await expect(page.locator('#eval-baseline-path')).toBeVisible();

    // Verify run button
    await expect(page.locator('#btn-eval-run')).toBeVisible();

    // Verify history table
    await expect(page.locator('#eval-history-table')).toBeVisible();
    await expect(page.locator('#btn-eval-history-refresh')).toBeVisible();
    await expect(page.locator('#btn-eval-history-clear')).toBeVisible();
  });

  test('Can switch between Indexing and Evaluate subtabs', async ({ page }) => {
    // Click Indexing
    const indexingBtn = page.locator('.subtab-btn[data-subtab="indexing"]');
    await indexingBtn.click();
    await page.waitForTimeout(300);

    // Verify Indexing content visible
    await expect(page.locator('text=🚀 Index Repository')).toBeVisible();

    // Click Evaluate
    const evaluateBtn = page.locator('.subtab-btn[data-subtab="evaluate"]');
    await evaluateBtn.click();
    await page.waitForTimeout(300);

    // Verify Evaluate content visible and Indexing content hidden
    await expect(page.locator('text=Golden Questions Manager')).toBeVisible();
    await expect(page.locator('text=🚀 Index Repository')).not.toBeVisible();

    // Switch back to Indexing
    await indexingBtn.click();
    await page.waitForTimeout(300);

    // Verify Indexing content visible again
    await expect(page.locator('text=🚀 Index Repository')).toBeVisible();
    await expect(page.locator('text=Golden Questions Manager')).not.toBeVisible();
  });

  test('Indexing subtab UI elements are interactive', async ({ page }) => {
    // Navigate to Indexing
    const indexingBtn = page.locator('.subtab-btn[data-subtab="indexing"]');
    await indexingBtn.click();
    await page.waitForTimeout(500);

    // Test repository selector
    const repoSelect = page.locator('#simple-repo-select');
    await expect(repoSelect).toBeEnabled();

    // Test dense checkbox
    const denseCheck = page.locator('#simple-dense-check');
    await expect(denseCheck).toBeEnabled();
    const initialState = await denseCheck.isChecked();
    await denseCheck.click();
    const newState = await denseCheck.isChecked();
    expect(newState).toBe(!initialState);

    // Test index button exists and is enabled
    const indexBtn = page.locator('#simple-index-btn');
    await expect(indexBtn).toBeEnabled();

    // Test start/stop buttons
    await expect(page.locator('#btn-index-start')).toBeEnabled();
    // Stop button may be disabled initially (no active indexing)
    await expect(page.locator('#btn-index-stop')).toBeVisible();
  });

  test('Evaluate subtab form inputs work', async ({ page }) => {
    // Navigate to Evaluate
    const evaluateBtn = page.locator('.subtab-btn[data-subtab="evaluate"]');
    await evaluateBtn.click();
    await page.waitForTimeout(500);

    // Test question input
    const questionInput = page.locator('#golden-new-q');
    await expect(questionInput).toBeEnabled();
    await questionInput.fill('Test question');
    await expect(questionInput).toHaveValue('Test question');

    // Test paths input
    const pathsInput = page.locator('#golden-new-paths');
    await expect(pathsInput).toBeEnabled();
    await pathsInput.fill('test, path');
    await expect(pathsInput).toHaveValue('test, path');

    // Test repo select
    const repoSelect = page.locator('#golden-new-repo');
    await expect(repoSelect).toBeEnabled();

    // Test use multi-query select
    const multiSelect = page.locator('#eval-use-multi');
    await expect(multiSelect).toBeEnabled();

    // Test final K input
    const finalKInput = page.locator('#eval-final-k');
    await expect(finalKInput).toBeEnabled();
    await finalKInput.fill('10');
    await expect(finalKInput).toHaveValue('10');
  });

  test('All subtab buttons are visible and clickable', async ({ page }) => {
    // Verify all 6 subtabs exist
    const subtabs = [
      'data-quality',
      'retrieval',
      'external-rerankers',
      'learning-ranker',
      'indexing',
      'evaluate'
    ];

    for (const subtabId of subtabs) {
      const btn = page.locator(`.subtab-btn[data-subtab="${subtabId}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    }

    // Click each subtab to verify they all work
    for (const subtabId of subtabs) {
      const btn = page.locator(`.subtab-btn[data-subtab="${subtabId}"]`);
      await btn.click();
      await page.waitForTimeout(200);
      // Verify active class is applied
      await expect(btn).toHaveClass(/active/);
    }
  });
});
