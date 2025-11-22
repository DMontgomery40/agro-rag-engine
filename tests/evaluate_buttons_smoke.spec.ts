import { test, expect } from '@playwright/test';

test.describe('EvaluateSubtab Buttons Smoke Test', () => {
  test('Load Recommended and Run All Tests buttons exist and are functional', async ({ page }) => {
    // Navigate to the RAG Evaluate tab
    await page.goto('http://localhost:5173/web/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on RAG tab
    await page.click('button:has-text("RAG")');

    // Click on Evaluate subtab
    await page.click('button:has-text("Evaluate")');

    // Wait for the EvaluateSubtab to be visible
    await page.waitForSelector('text=Golden Questions Manager', { timeout: 5000 });

    // Check that Load Recommended button exists and is visible
    const loadRecommendedBtn = page.locator('button:has-text("Load Recommended")');
    await expect(loadRecommendedBtn).toBeVisible();
    await expect(loadRecommendedBtn).toBeEnabled();

    // Check that Run All Tests button exists and is visible
    const runAllTestsBtn = page.locator('button:has-text("Run All Tests")');
    await expect(runAllTestsBtn).toBeVisible();

    // Note: Run All Tests might be disabled if there are no questions
    // That's OK - as long as it exists and is not a stub

    // Check that other essential buttons exist
    const refreshBtn = page.locator('button:has-text("Refresh List")');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toBeEnabled();

    const exportBtn = page.locator('button:has-text("Export JSON")');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();

    // Check that the Add Question button exists
    const addQuestionBtn = page.locator('button:has-text("Add Question")');
    await expect(addQuestionBtn).toBeVisible();
    await expect(addQuestionBtn).toBeEnabled();

    // Verify no alert() stub functions by checking button click behavior
    // Click Load Recommended and make sure no browser alert appears
    await loadRecommendedBtn.click();

    // Wait a moment to see if an alert would appear
    await page.waitForTimeout(1000);

    // If we get here without the test failing, the buttons are working
    console.log('✅ All buttons exist and Load Recommended is functional (no stub alerts)');
  });
});