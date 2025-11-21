// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('All Indexer Buttons Smoke Test', () => {
    test('Dashboard "Run Indexer" button should work without errors', async ({ page }) => {
        // Navigate to GUI
        await page.goto('http://127.0.0.1:8012');

        // Wait for page to load
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Go to Dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForSelector('#dash-index-start', { timeout: 5000 });

        // Track console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Track network requests to /api/index/start
        let indexStartCalled = false;
        let requestPayload = null;

        page.on('request', request => {
            if (request.url().includes('/api/index/start')) {
                indexStartCalled = true;
                console.log('[test] Intercepted request to /api/index/start');
                console.log('[test] Method:', request.method());
                console.log('[test] Headers:', request.headers());

                // Try to get the post data
                try {
                    requestPayload = request.postDataJSON();
                    console.log('[test] Request payload:', requestPayload);
                } catch (e) {
                    console.log('[test] Could not parse request payload:', e.message);
                }
            }
        });

        // Click the dashboard indexer button
        console.log('[test] Clicking dashboard indexer button...');
        await page.click('#dash-index-start');

        // Wait a moment for the request to be made
        await page.waitForTimeout(2000);

        // Verify no console errors
        console.log('[test] Console errors:', consoleErrors);
        expect(consoleErrors.length).toBe(0);

        // Verify the API was called
        console.log('[test] API called:', indexStartCalled);
        console.log('[test] Request payload:', requestPayload);

        expect(indexStartCalled).toBe(true);

        // Verify payload has a repo
        if (requestPayload) {
            console.log('[test] Repo in payload:', requestPayload.repo);
            expect(requestPayload.repo).toBeTruthy();
            expect(requestPayload.repo).toBe('agro');
        } else {
            console.warn('[test] Could not verify request payload');
        }
    });

    test('RAG > Indexing "🚀 INDEX NOW" button should work without errors', async ({ page }) => {
        // Navigate to GUI
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);

        // Click Indexing subtab
        const indexingBtn = page.locator('button[data-subtab="indexing"]');
        await indexingBtn.click();
        await page.waitForSelector('#simple-index-btn', { timeout: 5000 });

        // Track network requests to /api/index/run
        let indexRunCalled = false;
        let requestUrl = null;

        page.on('request', request => {
            if (request.url().includes('/api/index/run')) {
                indexRunCalled = true;
                requestUrl = request.url();
                console.log('[test] Intercepted request to /api/index/run');
                console.log('[test] URL:', requestUrl);
            }
        });

        // Click the simple index button
        console.log('[test] Clicking simple index button...');
        await page.click('#simple-index-btn');

        // Wait a moment for the request
        await page.waitForTimeout(2000);

        // Verify the API was called
        console.log('[test] API called:', indexRunCalled);
        console.log('[test] Request URL:', requestUrl);

        expect(indexRunCalled).toBe(true);

        // Verify URL contains repo parameter
        if (requestUrl) {
            expect(requestUrl).toContain('repo=agro');
            console.log('[test] ✅ URL contains repo=agro');
        }
    });

    test('RAG > Indexing "▶ Start Indexing" button should work without errors', async ({ page }) => {
        // Navigate to GUI
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);

        // Click Indexing subtab
        const indexingBtn = page.locator('button[data-subtab="indexing"]');
        await indexingBtn.click();
        await page.waitForSelector('#btn-index-start', { timeout: 5000 });

        // Track network requests to /api/index/start
        let indexStartCalled = false;
        let requestPayload = null;

        page.on('request', request => {
            if (request.url().includes('/api/index/start')) {
                indexStartCalled = true;
                try {
                    requestPayload = request.postDataJSON();
                    console.log('[test] Request payload:', requestPayload);
                } catch (e) {
                    console.log('[test] Could not parse request payload');
                }
            }
        });

        // Click the start indexing button
        console.log('[test] Clicking start indexing button...');
        await page.click('#btn-index-start');

        // Wait a moment for the request
        await page.waitForTimeout(2000);

        // Verify the API was called
        console.log('[test] API called:', indexStartCalled);
        expect(indexStartCalled).toBe(true);

        // Verify payload has a repo
        if (requestPayload) {
            console.log('[test] Repo in payload:', requestPayload.repo);
            expect(requestPayload.repo).toBeTruthy();
            expect(requestPayload.repo).toBe('agro');
        }
    });
});
