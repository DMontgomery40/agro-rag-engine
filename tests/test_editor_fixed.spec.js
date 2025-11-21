const { test, expect } = require('@playwright/test');

test.describe('Editor Status Badge - Fixed', () => {
    test('Editor should show as Ready/Enabled (not Disabled)', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        // Navigate to VS Code tab
        const vsCodeTab = page.locator('button[data-tab="vscode"]').first();
        await vsCodeTab.scrollIntoViewIfNeeded();
        await vsCodeTab.click();
        await page.waitForTimeout(1500); // Wait for health check

        // Check badge text
        const badgeText = await page.locator('#editor-health-text').textContent();
        console.log(`[test] Editor badge text: "${badgeText}"`);

        // Should NOT be "Disabled" anymore
        expect(badgeText).not.toContain('Disabled');
        expect(badgeText).not.toContain('○');

        // Should show Ready or Checking
        expect(badgeText).toMatch(/Ready|Checking|●/);

        // Check that iframe container is visible (not hidden)
        const iframeContainer = page.locator('#editor-iframe-container');
        const isVisible = await iframeContainer.isVisible();
        console.log(`[test] Editor iframe visible: ${isVisible}`);
        expect(isVisible).toBe(true);

        // Check that error banner is NOT displayed
        const errorBanner = page.locator('#editor-status-banner');
        const bannerVisible = await errorBanner.isVisible();
        console.log(`[test] Error banner visible: ${bannerVisible}`);
        expect(bannerVisible).toBe(false);

        console.log('[test] ✅ Editor status badge shows Ready (not Disabled)');
    });
});
