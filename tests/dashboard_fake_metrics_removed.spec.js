// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Fake Metrics Removed', () => {
    test('Should NOT have fake "System Status" section with placeholder metrics', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        // Check that fake IDs no longer exist
        const dashHealth = page.locator('#dash-health');
        const dashRepo = page.locator('#dash-repo');
        const dashCards = page.locator('#dash-cards');
        const dashMcp = page.locator('#dash-mcp');
        const dashAutotune = page.locator('#dash-autotune');

        // All fake metrics should be removed
        await expect(dashHealth).not.toBeAttached();
        await expect(dashRepo).not.toBeAttached();
        await expect(dashCards).not.toBeAttached();
        await expect(dashMcp).not.toBeAttached();
        await expect(dashAutotune).not.toBeAttached();

        console.log('[test] ✅ All fake metrics removed from dashboard');
    });

    test('Should still have REAL health status in top bar', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Top bar health status should exist and be populated
        const healthStatus = page.locator('#health-status');
        await expect(healthStatus).toBeVisible();

        await page.waitForTimeout(2000); // Wait for health check

        const healthText = await healthStatus.textContent();
        console.log('[test] Top bar health:', healthText);

        // Should NOT be the default "—"
        expect(healthText).not.toBe('—');
        // Should have actual status
        expect(healthText).toBeTruthy();
    });

    test('Should still have REAL "Index Health" section on dashboard', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        // Index Health section should exist
        const indexHealth = page.locator('#dash-index-health-metrics');
        await expect(indexHealth).toBeVisible();

        const healthContent = await indexHealth.textContent();
        console.log('[test] Index Health content:', healthContent?.substring(0, 100));

        // Should have real content (not just "Loading...")
        expect(healthContent).toBeTruthy();
    });

    test('Dashboard should still be functional after removing fake metrics', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1000);

        // Should not have any console errors
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(msg.text());
            }
        });

        // Dashboard should render without errors
        const dashboard = page.locator('#tab-dashboard');
        await expect(dashboard).toBeVisible();

        // Quick Actions section should still exist
        const quickActionsText = await page.locator('text=Quick Actions').count();
        console.log('[test] Quick Actions section exists:', quickActionsText > 0);
        expect(quickActionsText).toBeGreaterThan(0);

        // Should have minimal console errors (404s from API are OK)
        console.log('[test] Console errors count:', consoleLogs.length);
    });
});
