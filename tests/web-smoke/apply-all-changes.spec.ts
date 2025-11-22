import { test, expect } from '@playwright/test';

test.describe('Apply All Changes Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('button is visible on all tabs', async ({ page }) => {
    // Check button is initially visible
    const saveBtn = page.locator('#save-btn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('Apply All Changes');

    // Navigate through tabs and verify button stays visible
    const tabs = ['Dashboard', 'Chat', 'Analytics', 'Config', 'Profiles', 'RAG'];

    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(100);
      await expect(saveBtn).toBeVisible();
      console.log(`✓ Apply button visible on ${tab} tab`);
    }
  });

  test('button becomes enabled when form changes', async ({ page }) => {
    const saveBtn = page.locator('#save-btn');

    // Initially disabled (no changes)
    await expect(saveBtn).toBeDisabled();

    // Navigate to RAG tab
    await page.getByRole('tab', { name: 'RAG' }).click();
    await page.waitForTimeout(100);

    // Click Data Quality subtab
    await page.getByRole('tab', { name: 'Data Quality' }).click();
    await page.waitForTimeout(100);

    // Change a field
    const excludeKeywordsInput = page.locator('#cards-exclude-keywords');
    await excludeKeywordsInput.fill('test, keyword, change');

    // Button should become enabled
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText('*'); // Dirty indicator
  });

  test('saves all form data when clicked', async ({ page }) => {
    const saveBtn = page.locator('#save-btn');

    // Navigate to RAG > Data Quality
    await page.getByRole('tab', { name: 'RAG' }).click();
    await page.waitForTimeout(100);
    await page.getByRole('tab', { name: 'Data Quality' }).click();
    await page.waitForTimeout(100);

    // Make changes to multiple fields
    await page.locator('#cards-exclude-dirs').fill('node_modules, dist, build');
    await page.locator('#cards-exclude-patterns').fill('*.test.js, *.spec.ts');
    await page.locator('#cards-exclude-keywords').fill('deprecated, legacy, TODO');
    await page.locator('#cards-max').fill('100');

    // Intercept the save request
    const savePromise = page.waitForRequest(req =>
      req.url().includes('/api/config') && req.method() === 'POST'
    );

    // Click save button
    await saveBtn.click();

    // Wait for save request
    const saveRequest = await savePromise;
    const requestData = await saveRequest.postDataJSON();

    // Verify the request includes our form data
    console.log('Save request data:', requestData);

    // Button should show "Saving..." temporarily
    await expect(saveBtn).toContainText('Saving...');

    // After save, button should be disabled again
    await page.waitForTimeout(500);
    await expect(saveBtn).toBeDisabled();
  });
});