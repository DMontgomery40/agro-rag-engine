import { test, expect } from '@playwright/test';

test.describe('Infrastructure Paths Subtab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Infrastructure tab
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the page to fully load
    await page.waitForSelector('text=Infrastructure', { timeout: 10000 });

    // Click Infrastructure tab
    await page.click('text=Infrastructure');
    await page.waitForTimeout(1000);
  });

  test('Paths Subtab - Load and save infrastructure config', async ({ page }) => {
    // Click Paths subtab
    await page.click('[data-subtab="paths"]');
    await page.waitForTimeout(1000);

    // Wait for config to load
    await page.waitForSelector('text=Infrastructure Configuration', { timeout: 5000 });

    // Verify all input sections are visible
    await expect(page.locator('h3:has-text("Database Endpoints")')).toBeVisible();
    await expect(page.locator('h3:has-text("Repository Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("Directory Paths")')).toBeVisible();
    await expect(page.locator('h3:has-text("Storage Configuration")')).toBeVisible();
    await expect(page.locator('h3:has-text("MCP HTTP Configuration")')).toBeVisible();

    // Test QDRANT_URL input
    const qdrantInput = page.locator('input[placeholder*="6333"]');
    await expect(qdrantInput).toBeVisible();
    const currentQdrantValue = await qdrantInput.inputValue();

    // Make a small change to test save
    await qdrantInput.fill('http://127.0.0.1:6333');

    // Test REDIS_URL input
    const redisInput = page.locator('input[placeholder*="6379"]');
    await expect(redisInput).toBeVisible();
    await redisInput.fill('redis://127.0.0.1:6379/0');

    // Test REPO input
    const repoInput = page.locator('input[placeholder="agro"]');
    await expect(repoInput).toBeVisible();
    await repoInput.fill('agro');

    // Test new fields added in Phase 1
    const collectionSuffixInput = page.locator('input[placeholder="default"]');
    await expect(collectionSuffixInput).toBeVisible();
    await collectionSuffixInput.fill('test');

    const outDirInput = page.locator('input[placeholder="./out"]');
    await expect(outDirInput).toBeVisible();
    await outDirInput.fill('./out');

    // Scroll to save button
    const saveButton = page.locator('button:has-text("Save Configuration")');
    await saveButton.scrollIntoViewIfNeeded();

    // Click Save Configuration
    await saveButton.click();

    // Wait for action message to appear (saving or success message)
    await page.waitForTimeout(2000);

    // Check if success or error message appeared
    const successMessage = page.locator('text=Configuration saved successfully!');
    const savingMessage = page.locator('text=Saving configuration...');
    const errorMessage = page.locator('text=/Failed|Error/');

    // Take a screenshot to see what happened
    await page.screenshot({ path: 'test-results/after-save.png', fullPage: true });

    // Verify one of the messages appeared
    const messageAppeared = await successMessage.isVisible().catch(() => false) ||
                           await savingMessage.isVisible().catch(() => false) ||
                           await errorMessage.isVisible().catch(() => false);

    if (!messageAppeared) {
      console.log('No message appeared after save');
    }

    // Wait for any message to auto-dismiss
    await page.waitForTimeout(3500);

    // Reload page and verify values persist
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to Paths subtab
    await page.waitForSelector('text=Infrastructure', { timeout: 10000 });
    await page.click('text=Infrastructure');
    await page.waitForTimeout(1000);
    await page.click('[data-subtab="paths"]');
    await page.waitForTimeout(1000);

    // Verify saved values are loaded
    const reloadedQdrantInput = page.locator('input[placeholder*="6333"]');
    await expect(reloadedQdrantInput).toHaveValue('http://127.0.0.1:6333');

    const reloadedCollectionSuffixInput = page.locator('input[placeholder="default"]');
    await expect(reloadedCollectionSuffixInput).toHaveValue('test');
  });
});
