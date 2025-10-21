const { test, expect } = require('@playwright/test');

test.describe('LangSmith Button', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8012');
        await page.waitForLoadState('networkidle');
        // Wait for tab bar to be visible
        await page.waitForSelector('.tab-bar', { state: 'visible', timeout: 10000 });
    });

    test('Open in LangSmith button should call API and open new tab', async ({ page, context }) => {
        // Navigate to RAG → Retrieval subtab
        await page.click('button[data-tab="rag"]');
        await page.waitForSelector('#rag-subtabs', { state: 'visible' });
        await page.click('button[data-rag-subtab="retrieval"]');
        await page.waitForTimeout(500);

        // Mock the API response
        await page.route('/api/langsmith/latest', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    project: 'test-project',
                    url: 'https://smith.langchain.com/test-url',
                    source: 'remote'
                })
            });
        });

        // Find and click the "Open in LangSmith" button
        const langsmithBtn = page.locator('#btn-trace-open-ls');
        await expect(langsmithBtn).toBeVisible();

        // Listen for new page (window.open)
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            langsmithBtn.click()
        ]);

        // Verify the new page URL
        expect(newPage.url()).toBe('https://smith.langchain.com/test-url');
        await newPage.close();
    });

    test('Open in LangSmith button should show error if no URL', async ({ page }) => {
        // Navigate to RAG → Retrieval subtab
        await page.click('button[data-tab="rag"]');
        await page.waitForSelector('#rag-subtabs', { state: 'visible' });
        await page.click('button[data-rag-subtab="retrieval"]');
        await page.waitForTimeout(500);

        // Mock API response with no URL
        await page.route('/api/langsmith/latest', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    project: 'test-project',
                    url: null,
                    source: 'error',
                    error: 'no_runs'
                })
            });
        });

        // Listen for alert dialog
        page.on('dialog', async dialog => {
            expect(dialog.type()).toBe('alert');
            expect(dialog.message()).toContain('No LangSmith trace URL available');
            expect(dialog.message()).toContain('no_runs');
            await dialog.accept();
        });

        // Click button
        const langsmithBtn = page.locator('#btn-trace-open-ls');
        await langsmithBtn.click();
        await page.waitForTimeout(500);
    });
});
