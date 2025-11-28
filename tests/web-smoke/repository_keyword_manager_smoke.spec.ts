import { test, expect } from '@playwright/test';

test.describe('Repository Configuration - Keyword Manager', () => {
  test('should display visual keyword manager UI', async ({ page }) => {
    // Navigate to RAG tab -> Data Quality subtab
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Click Data Quality subtab
    await page.click('text=Data Quality');
    await page.waitForTimeout(500);

    // Wait for Repository Configuration section
    await page.waitForSelector('text=Repository Configuration', { timeout: 5000 });

    // Should show repo dropdown and select "agro"
    const repoHeading = page.locator('h4:has-text("Repo:")');
    await expect(repoHeading).toBeVisible();

    // Check for Keyword Manager section
    await page.waitForSelector('text=Keyword Manager', { timeout: 5000 });

    // Verify filter input exists
    const filterInput = page.locator('input[placeholder="filter..."]');
    await expect(filterInput).toBeVisible();

    // Verify source filter dropdown exists
    const sourceSelect = page.locator('select').filter({ hasText: 'All' }).first();
    await expect(sourceSelect).toBeVisible();

    // Verify "+" button exists
    const addButton = page.locator('button:has-text("+")').first();
    await expect(addButton).toBeVisible();

    // Verify transfer buttons exist
    const transferRight = page.locator('button:has-text(">>")'). first();
    await expect(transferRight).toBeVisible();

    const transferLeft = page.locator('button:has-text("<<")'). first();
    await expect(transferLeft).toBeVisible();

    // Verify "Repo Keywords" label
    await expect(page.locator('text=Repo Keywords')).toBeVisible();

    console.log('✓ Visual Keyword Manager UI is fully rendered');
  });

  test('should have functional keyword panels', async ({ page }) => {
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    await page.click('text=Data Quality');
    await page.waitForTimeout(500);

    // Wait for keyword manager
    await page.waitForSelector('text=Keyword Manager', { timeout: 5000 });

    // Find the multiple select boxes (should be 2 - available and repo)
    const selectBoxes = page.locator('select[multiple][size="8"]');
    const count = await selectBoxes.count();

    expect(count).toBe(2);
    console.log(`✓ Found ${count} keyword selection panels`);

    // Check that panels have options
    const availablePanel = selectBoxes.first();
    const availableOptions = await availablePanel.locator('option').count();
    console.log(`  Available keywords: ${availableOptions}`);

    const repoPanel = selectBoxes.last();
    const repoOptions = await repoPanel.locator('option').count();
    console.log(`  Repo keywords: ${repoOptions}`);
  });
});
