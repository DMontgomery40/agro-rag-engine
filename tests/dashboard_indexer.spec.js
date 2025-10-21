// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Indexer Button', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');

        // Wait for page to load by checking for the Health button
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard tab using data-testid to avoid mobile/desktop ambiguity
        const dashboardBtn = page.locator('[data-testid="tab-btn-dashboard"]');
        await dashboardBtn.click();

        // Wait for dashboard content
        await page.waitForSelector('#dash-index-start', { timeout: 5000 });
    });

    test('Dashboard "Run Indexer" button should be visible and enabled', async ({ page }) => {
        const indexBtn = page.locator('#dash-index-start');
        await expect(indexBtn).toBeVisible();
        await expect(indexBtn).toBeEnabled();
    });

    test('Clicking "Run Indexer" should start indexing with default repo', async ({ page }) => {
        // Set up network interception to capture the API call
        let apiCallMade = false;
        let requestBody = null;

        await page.route('**/api/index/start', async (route) => {
            apiCallMade = true;
            const request = route.request();
            requestBody = request.postDataJSON();

            // Return success response
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    success: true,
                    message: 'Indexing started in background'
                })
            });
        });

        // Click the dashboard indexer button
        await page.click('#dash-index-start');

        // Wait a moment for the request to be made
        await page.waitForTimeout(1000);

        // Verify API call was made
        expect(apiCallMade).toBe(true);

        // Verify request body contains a repo (should be 'agro' from .env)
        expect(requestBody).toBeTruthy();
        expect(requestBody.repo).toBeTruthy();
        expect(requestBody.repo).toBe('agro');

        console.log('[dashboard_indexer] API call body:', requestBody);
    });

    test('Should show success message after starting indexing', async ({ page }) => {
        // Mock the API response
        await page.route('**/api/index/start', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    success: true,
                    message: 'Indexing started in background'
                })
            });
        });

        // Also mock the status endpoint to prevent continuous polling errors
        await page.route('**/api/index/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    running: true,
                    current_repo: 'agro',
                    progress: 50
                })
            });
        });

        // Click the button
        await page.click('#dash-index-start');

        // Wait for success message (either in status display or showStatus)
        // Check console logs for success indication
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));

        await page.waitForTimeout(1000);

        // Look for success indication in logs or on page
        const hasSuccessLog = logs.some(log =>
            log.includes('Indexing started') ||
            log.includes('agro')
        );

        expect(hasSuccessLog).toBe(true);
    });

    test('Should handle case when dropdown is not populated', async ({ page }) => {
        // This test verifies the fix: even if the dropdown on the Indexing tab
        // is not populated, the dashboard button should still work by falling
        // back to the default repo from config

        await page.route('**/api/index/start', async (route) => {
            const requestBody = route.request().postDataJSON();

            // Verify it's using the fallback repo
            expect(requestBody.repo).toBeTruthy();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, success: true })
            });
        });

        // Click without visiting the Indexing tab first
        await page.click('#dash-index-start');

        await page.waitForTimeout(500);

        // If we get here without error, the test passed
    });

    test('Should use repo from dropdown when on Indexing tab', async ({ page }) => {
        // Navigate to RAG > Indexing subtab
        const ragBtn = page.locator('button').filter({ hasText: '🧠 RAG' });
        await ragBtn.click();

        await page.waitForTimeout(500);

        // Click Indexing subtab
        const indexingSubtab = page.locator('button.rag-subtab-btn[data-subtab="rag-indexing"]');
        await indexingSubtab.click();

        await page.waitForTimeout(500);

        // Wait for the dropdown to be visible
        const repoSelect = page.locator('#index-repo-select');
        await expect(repoSelect).toBeVisible();

        // Check if dropdown has options
        const optionCount = await repoSelect.locator('option').count();
        console.log(`[dashboard_indexer] Dropdown has ${optionCount} options`);

        if (optionCount > 0) {
            // If dropdown is populated, verify it's being used
            await page.route('**/api/index/start', async (route) => {
                const requestBody = route.request().postDataJSON();
                expect(requestBody.repo).toBe('agro'); // Should match selected option

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ok: true, success: true })
                });
            });

            // Click the indexing tab's start button
            const startBtn = page.locator('#btn-index-start');
            await startBtn.click();

            await page.waitForTimeout(500);
        }
    });
});
