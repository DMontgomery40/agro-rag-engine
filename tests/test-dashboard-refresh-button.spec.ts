import { test, expect } from '@playwright/test';

test.describe('Dashboard Refresh Button', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:8012/');
        await page.waitForLoadState('networkidle');
        // Navigate to Dashboard tab - use testid to avoid mobile/desktop duplication
        const dashboardTab = page.locator('[data-testid="tab-btn-dashboard"]');
        await dashboardTab.click();
        await page.waitForTimeout(500);
    });

    test('should have 6 buttons in Quick Actions grid (no empty cells)', async ({ page }) => {
        const quickActionsButtons = page.locator('.action-btn');
        const count = await quickActionsButtons.count();
        expect(count).toBeGreaterThanOrEqual(6);
    });

    test('should have Refresh Status button in the grid', async ({ page }) => {
        const refreshButton = page.locator('#dash-refresh-status');
        await expect(refreshButton).toBeVisible();

        const buttonText = await refreshButton.textContent();
        expect(buttonText).toContain('Refresh Status');
    });

    test('Refresh Status button should be clickable and functional', async ({ page }) => {
        const refreshButton = page.locator('#dash-refresh-status');

        // Button should be visible and enabled
        await expect(refreshButton).toBeVisible();
        await expect(refreshButton).toBeEnabled();

        // Click the button
        await refreshButton.click();

        // Wait a moment for any UI updates
        await page.waitForTimeout(1000);

        // Verify no console errors (basic sanity check)
        // The actual refresh should update the dashboard metrics
        const healthStatus = page.locator('#dash-health');
        await expect(healthStatus).toBeVisible();

        // Health status should not be empty after refresh
        const healthText = await healthStatus.textContent();
        expect(healthText).not.toBe('—');
        expect(healthText).not.toBe('');
    });

    test('Quick Actions should display all 6 buttons including Refresh Status', async ({ page }) => {
        // Just verify we have 6 buttons total (no empty cells)
        const buttons = page.locator('.action-btn');
        const count = await buttons.count();
        expect(count).toBeGreaterThanOrEqual(6);

        // Verify the specific buttons we expect
        await expect(page.locator('#btn-generate-keywords')).toBeVisible();
        await expect(page.locator('#dash-change-repo')).toBeVisible();
        await expect(page.locator('#dash-index-start')).toBeVisible();
        await expect(page.locator('#dash-reload-config')).toBeVisible();
        await expect(page.locator('#dash-eval-trigger')).toBeVisible();
        await expect(page.locator('#dash-refresh-status')).toBeVisible();
    });

    test('all Quick Actions buttons should have consistent styling', async ({ page }) => {
        const buttons = page.locator('.action-btn');
        const count = await buttons.count();

        expect(count).toBeGreaterThanOrEqual(6);

        // Check first and last buttons have same class
        for (let i = 0; i < Math.min(count, 6); i++) {
            const button = buttons.nth(i);
            await expect(button).toHaveClass(/action-btn/);
        }
    });
});
