import { test, expect } from '@playwright/test';

test.describe('Dashboard Help & Glossary subtab smoke', () => {
  test('shows Help & Glossary without black screen and keeps layout intact', async ({ page }) => {
    // Load root GUI
    await page.goto('http://localhost:8012', { waitUntil: 'networkidle' });

    // Ensure top-level nav renders (basic health for non-black screen)
    await expect(page.locator('[data-testid="tab-btn-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-btn-chat"]')).toBeVisible();

    // Navigate to Dashboard tab explicitly (in case another tab is active)
    await page.evaluate(() => (window as any).Navigation?.navigateTo('dashboard'));
    await page.waitForTimeout(150);

    // Subtab bar and buttons should exist
    const helpBtn = page.locator('#dashboard-subtabs .subtab-btn[data-subtab="help"]');
    await expect(helpBtn).toBeVisible({ timeout: 2000 });

    // Click Help & Glossary
    await helpBtn.click();
    await page.waitForTimeout(150);

    // Verify the help subtab is visible and overview is not forced hidden
    const helpPanel = page.locator('#tab-dashboard-help');
    await expect(helpPanel).toBeVisible({ timeout: 2000 });

    // Minimal structure checks inside help panel
    await expect(helpPanel.locator('text=Help & Glossary')).toBeVisible();

    // Also verify that Chat tab is still reachable (no layout collapse)
    await page.evaluate(() => (window as any).Navigation?.navigateTo('chat'));
    await page.waitForTimeout(150);
    await expect(page.locator('#tab-chat')).toHaveClass(/active/);
  });
});

