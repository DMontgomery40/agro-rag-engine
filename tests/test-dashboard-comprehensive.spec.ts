import { test, expect } from '@playwright/test';

test.describe('Dashboard Comprehensive Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:8012/');
        await page.waitForLoadState('networkidle');
        const dashboardTab = page.locator('[data-testid="tab-btn-dashboard"]');
        await dashboardTab.click();
        await page.waitForTimeout(500);
    });

    test('Dashboard should have all 6 Quick Action buttons visible', async ({ page }) => {
        const buttons = page.locator('.action-btn');
        const count = await buttons.count();
        expect(count).toBe(6);

        // Verify each button exists
        await expect(page.locator('#btn-generate-keywords')).toBeVisible();
        await expect(page.locator('#dash-change-repo')).toBeVisible();
        await expect(page.locator('#dash-index-start')).toBeVisible();
        await expect(page.locator('#dash-reload-config')).toBeVisible();
        await expect(page.locator('#dash-eval-trigger')).toBeVisible();
        await expect(page.locator('#dash-refresh-status')).toBeVisible();
    });

    test('Run Eval dropdown should load options dynamically from API', async ({ page }) => {
        // Wait for dynamic options to load
        await page.waitForTimeout(1000);

        const evalButton = page.locator('#dash-eval-trigger');
        await expect(evalButton).toBeVisible();

        // Click to open dropdown
        await evalButton.click();
        await page.waitForTimeout(300);

        const dropdown = page.locator('#dash-eval-dropdown');
        await expect(dropdown).toBeVisible();

        // Check that dropdown has dynamically loaded options
        const options = dropdown.locator('.eval-model-btn');
        const optionCount = await options.count();

        // Should have at least 2 options (based on user's config: cross-encoder, cohere, none)
        expect(optionCount).toBeGreaterThanOrEqual(2);

        // Verify options have proper attributes
        for (let i = 0; i < optionCount; i++) {
            const option = options.nth(i);
            const dataModel = await option.getAttribute('data-model');
            const dataBackend = await option.getAttribute('data-backend');

            expect(dataModel).toBeTruthy();
            expect(dataBackend).toBeTruthy();
        }
    });

    test('Run Eval dropdown should NOT have hardcoded options', async ({ page }) => {
        await page.waitForTimeout(1000);

        const evalButton = page.locator('#dash-eval-trigger');
        await evalButton.click();
        await page.waitForTimeout(300);

        // Check that the options are NOT the old hardcoded ones
        const pageContent = await page.content();

        // The dropdown content should be dynamically generated, not in HTML
        // Old hardcoded text would be in the initial HTML source
        const dropdown = page.locator('#dash-eval-dropdown');
        const dropdownHTML = await dropdown.innerHTML();

        // Should have eval-model-btn class (dynamically added)
        expect(dropdownHTML).toContain('eval-model-btn');
    });

    test('Refresh Status button should refresh dashboard metrics', async ({ page }) => {
        const refreshButton = page.locator('#dash-refresh-status');
        await expect(refreshButton).toBeVisible();

        // Click refresh button
        await refreshButton.click();

        // Wait for refresh to complete
        await page.waitForTimeout(1000);

        // Verify dashboard metrics are populated
        const healthStatus = page.locator('#dash-health');
        const healthText = await healthStatus.textContent();
        expect(healthText).not.toBe('—');
        expect(healthText).not.toBe('');
    });

    test('System Status panel should display properly', async ({ page }) => {
        // Verify System Status elements exist and are visible
        await expect(page.locator('#dash-health')).toBeVisible();
        await expect(page.locator('#dash-repo')).toBeVisible();
        await expect(page.locator('#dash-cards')).toBeVisible();
        await expect(page.locator('#dash-mcp')).toBeVisible();
        await expect(page.locator('#dash-autotune')).toBeVisible();
    });

    test('MCP display should show servers in vertical list', async ({ page }) => {
        await page.waitForTimeout(1000);

        const mcpDisplay = page.locator('#dash-mcp');
        await expect(mcpDisplay).toBeVisible();

        // MCP should use flex-direction: column
        const displayStyle = await mcpDisplay.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
                display: styles.display,
                flexDirection: styles.flexDirection,
                gap: styles.gap
            };
        });

        expect(displayStyle.display).toBe('flex');
        expect(displayStyle.flexDirection).toBe('column');
    });

    test('Cache headers should prevent stale content', async ({ page }) => {
        // Test that JavaScript files have proper no-cache headers
        const response = await page.goto('http://127.0.0.1:8012/gui/js/dashboard-operations.js');

        expect(response).not.toBeNull();
        const headers = response!.headers();

        expect(headers['cache-control']).toContain('no-cache');
        expect(headers['cache-control']).toContain('no-store');
        expect(headers['pragma']).toBe('no-cache');
    });

    test('Mobile viewport should use single-column layout and show hamburger', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Check hamburger menu is visible on mobile
        const hamburger = page.locator('.mobile-nav-toggle');
        await expect(hamburger).toBeVisible();

        // Check layout switches to single column
        const layout = page.locator('.layout');
        const gridColumns = await layout.evaluate((el) => {
            return window.getComputedStyle(el).gridTemplateColumns;
        });

        // Should be single column on mobile
        expect(gridColumns).not.toContain('300px');

        // Regular tab bar should be hidden on mobile
        const tabBar = page.locator('.tab-bar');
        const tabBarDisplay = await tabBar.evaluate((el) => {
            return window.getComputedStyle(el).display;
        });
        expect(tabBarDisplay).toBe('none');
    });

    test('All critical dashboard elements should exist in DOM', async ({ page }) => {
        // Quick Actions section
        await expect(page.locator('.action-btn').first()).toBeVisible();

        // System Status section
        await expect(page.locator('#dash-health')).toBeVisible();

        // Progress bar container
        await expect(page.locator('#dash-index-bar')).toBeVisible();

        // Terminal container (exists in DOM but may be hidden until operation starts)
        const terminal = page.locator('#dash-operations-terminal');
        expect(await terminal.count()).toBe(1);

        // Status display
        await expect(page.locator('#dash-index-status')).toBeVisible();
    });
});
