// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dashboard System Status - All Metrics Wired Up', () => {
    test('Should populate Health metric from /api/health', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000); // Wait for async update

        const healthEl = page.locator('#dash-health');
        await expect(healthEl).toBeVisible();

        const healthText = await healthEl.textContent();
        console.log('[test] Dashboard Health:', healthText);

        // Should NOT be "—" (default placeholder)
        expect(healthText).not.toBe('—');
        // Should be "OK" or "Error"
        expect(['OK', 'Error']).toContain(healthText);
    });

    test('Should populate Repo metric from /api/index/stats', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        const repoEl = page.locator('#dash-repo');
        await expect(repoEl).toBeVisible();

        const repoText = await repoEl.textContent();
        console.log('[test] Dashboard Repo:', repoText);

        // Should NOT be "—"
        expect(repoText).not.toBe('—');
        // Should be a repo name like "agro"
        expect(repoText).toBeTruthy();
        expect(repoText.length).toBeGreaterThan(0);
    });

    test('Should populate Cards metric with count', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        const cardsEl = page.locator('#dash-cards');
        await expect(cardsEl).toBeVisible();

        const cardsText = await cardsEl.textContent();
        console.log('[test] Dashboard Cards:', cardsText);

        // Should NOT be "—"
        expect(cardsText).not.toBe('—');
        // Should be either a number or "None"
        expect(cardsText).toBeTruthy();
    });

    test('Should populate MCP Servers metric', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        const mcpEl = page.locator('#dash-mcp');
        await expect(mcpEl).toBeVisible();

        const mcpText = await mcpEl.textContent();
        console.log('[test] Dashboard MCP:', mcpText);

        // Should NOT be "—"
        expect(mcpText).not.toBe('—');
        // Should have some content
        expect(mcpText).toBeTruthy();
    });

    test('Should populate Auto-Tune metric', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        const autotuneEl = page.locator('#dash-autotune');
        await expect(autotuneEl).toBeVisible();

        const autotuneText = await autotuneEl.textContent();
        console.log('[test] Dashboard Auto-Tune:', autotuneText);

        // Should NOT be "—"
        expect(autotuneText).not.toBe('—');
        // Should be "Enabled" or "Disabled"
        expect(['Enabled', 'Disabled']).toContain(autotuneText);
    });

    test('All metrics should update when switching to dashboard', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Go to a different tab first
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);

        // Switch to dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(2000);

        // All metrics should be populated
        const health = await page.locator('#dash-health').textContent();
        const repo = await page.locator('#dash-repo').textContent();
        const cards = await page.locator('#dash-cards').textContent();
        const mcp = await page.locator('#dash-mcp').textContent();
        const autotune = await page.locator('#dash-autotune').textContent();

        console.log('[test] All metrics:', { health, repo, cards, mcp, autotune });

        // None should be "—"
        expect(health).not.toBe('—');
        expect(repo).not.toBe('—');
        expect(cards).not.toBe('—');
        expect(mcp).not.toBe('—');
        expect(autotune).not.toBe('—');
    });
});
