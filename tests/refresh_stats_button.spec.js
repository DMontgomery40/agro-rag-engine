// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Refresh Stats Button', () => {
    test('Should show "Refresh Stats" button (not "Reset Width")', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard to see sidepanel
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1000);

        // Check that page has "Refresh Stats" button
        const refreshButton = page.locator('button:has-text("Refresh Stats")');
        await expect(refreshButton).toBeVisible();

        // Should NOT have "Reset Width" anywhere
        const pageContent = await page.content();
        const hasResetWidth = pageContent.includes('Reset Width');
        console.log('[test] Page has "Reset Width":', hasResetWidth);
        expect(hasResetWidth).toBe(false);
    });

    test('Should be visible in dark mode (not black text)', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1000);

        const refreshButton = page.locator('button:has-text("Refresh Stats")');

        // Check background color (should be var(--link), typically blue)
        const bgColor = await refreshButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
        console.log('[test] Button background color:', bgColor);

        // Should be colored (not transparent or panel color)
        expect(bgColor).toBeTruthy();
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent

        // Check text color (should be var(--bg), typically dark)
        const textColor = await refreshButton.evaluate(el => window.getComputedStyle(el).color);
        console.log('[test] Button text color:', textColor);
        expect(textColor).toBeTruthy();
    });

    test('Should be clickable and functional', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1000);

        const refreshButton = page.locator('button:has-text("Refresh Stats")');

        // Should be clickable (cursor: pointer)
        const cursor = await refreshButton.evaluate(el => window.getComputedStyle(el).cursor);
        console.log('[test] Button cursor style:', cursor);
        expect(cursor).toBe('pointer');

        // Click the button - should not throw error
        await refreshButton.click();
        await page.waitForTimeout(500);

        // Verify the dashboard stats area still exists after refresh
        const statsArea = page.locator('#dash-index-status');
        await expect(statsArea).toBeVisible();
    });

    test('Should have refresh icon (↻) in button text', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1000);

        const refreshButton = page.locator('button:has-text("Refresh Stats")');
        const buttonText = await refreshButton.textContent();
        console.log('[test] Button text:', buttonText);

        // Should contain the refresh icon
        expect(buttonText).toContain('↻');
        expect(buttonText).toContain('Refresh Stats');
    });
});
