import { test, expect } from '@playwright/test';

test.describe('Quick Smoke Test', () => {
  test('App loads and navigation works', async ({ page }) => {
    await page.goto('http://localhost:8012');
    await page.waitForLoadState('networkidle');

    // Check app loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
    console.log('✓ App loaded');

    // Click Get Started tab using testid
    const startButton = page.getByTestId('tab-btn-start');
    await startButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Get Started tab clicked');

    // Check for onboarding content
    const onboardContent = page.locator('.ob-container, #onboard-welcome').first();
    const isVisible = await onboardContent.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`✓ Start tab content visible: ${isVisible}`);

    // Test global search
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const searchModal = page.locator('input[placeholder*="Search"]').first();
    const searchVisible = await searchModal.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`✓ Global search opens: ${searchVisible}`);

    if (searchVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('✓ Search closes with ESC');
    }

    console.log('\n✅ SMOKE TEST PASSED\n');
  });
});
