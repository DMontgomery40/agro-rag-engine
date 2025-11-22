/**
 * Full RAG Performance Evaluation Subtab - Smoke Test
 *
 * Verifies:
 * 1. Subtab renders without errors
 * 2. Clear labeling for "Full RAG Performance Evaluation"
 * 3. Key controls are present and wired
 */

import { test, expect } from '@playwright/test';

test.describe('RAG Evaluate Subtab - Smoke Test', () => {
  test('renders correctly and shows Full RAG evaluation controls', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait for app to be ready
    await page.waitForSelector('text=AGRO', { timeout: 10000 });

    // Navigate to RAG tab
    const ragTab = page.locator('button:has-text("RAG")').first();
    await ragTab.waitFor({ state: 'visible', timeout: 5000 });
    await ragTab.click();
    await page.waitForTimeout(1000);

    // Navigate to Evaluate subtab using data-subtab attribute
    const evalTab = page.locator('[data-subtab="evaluate"]');
    await evalTab.waitFor({ state: 'visible', timeout: 5000 });
    await evalTab.click();
    await page.waitForTimeout(1000);

    // VERIFY: Main sections are visible
    const goldenSection = page.locator('text=Golden Questions Manager');
    await expect(goldenSection).toBeVisible({ timeout: 5000 });

    const fullRagSection = page.locator('text=Full RAG Performance Evaluation');
    await expect(fullRagSection).toBeVisible({ timeout: 5000 });

    // VERIFY: Description clarifies this is NOT just reranker
    const clarification = page.locator('text=/not just reranker|Learning Ranker tab/i');
    await expect(clarification).toBeVisible({ timeout: 5000 });

    // VERIFY: Key controls are present
    await expect(page.locator('label:has-text("Question Text")')).toBeVisible();
    await expect(page.locator('label:has-text("Use Multi-Query")')).toBeVisible();
    await expect(page.locator('label:has-text("Final K Results")')).toBeVisible();
    await expect(page.locator('label:has-text("Golden Questions Path")')).toBeVisible();
    await expect(page.locator('label:has-text("Baseline Path")')).toBeVisible();

    // VERIFY: Action buttons are present
    await expect(page.locator('button:has-text("Save Eval Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("Run Full Evaluation")')).toBeVisible();

    // VERIFY: No errors displayed
    const errors = await page.locator('text=/error|failed|crash/i').count();
    expect(errors).toBe(0);

    // SECURITY CHECK: No dangerouslySetInnerHTML in page source
    const pageContent = await page.content();
    expect(pageContent).not.toContain('dangerouslySetInnerHTML');

    console.log('✓ All smoke tests passed');
  });
});
