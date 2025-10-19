import { test, expect } from '@playwright/test';

test.describe('Learning Reranker - No-Hit Queries', () => {
    test('should load and display no-hit queries section', async ({ page }) => {
        // Navigate to page
        await page.goto('http://localhost:8012', { waitUntil: 'networkidle' });

        // Wait for page load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Navigate to RAG tab
        const ragTab = page.locator('[data-tab="rag"]').first();
        await ragTab.waitFor({ state: 'visible', timeout: 15000 });
        await ragTab.click();
        await page.waitForTimeout(800);

        // Navigate to Learning Reranker subtab
        const rerankerSubtab = page.locator('[data-subtab="learning-ranker"]');
        await rerankerSubtab.waitFor({ state: 'visible', timeout: 10000 });
        await rerankerSubtab.click();
        await page.waitForTimeout(1000);

        // Check No-Hit Queries section exists
        const nohitsSection = page.locator('#reranker-nohits-list');
        await expect(nohitsSection).toBeVisible();

        // Wait for content to load (should change from "Loading..." to actual content)
        await page.waitForTimeout(2000);

        // Should show either actual queries or empty state message
        const content = await nohitsSection.textContent();

        // Should not show "Loading..." anymore
        expect(content).not.toContain('Loading no-hit queries');

        // Should show either empty state or actual queries
        const hasEmptyState = content?.includes('No no-hit queries tracked yet');
        const hasError = content?.includes('Failed to load');
        const hasQueries = nohitsSection.locator('div[style*="border-bottom"]');
        const queryCount = await hasQueries.count();

        // Must be one of these states
        expect(hasEmptyState || hasError || queryCount > 0).toBeTruthy();
    });

    test('should handle empty no-hit queries gracefully', async ({ page }) => {
        // Mock API to return empty data
        await page.route('**/api/reranker/nohits', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ queries: [], count: 0 })
            });
        });

        await page.goto('http://localhost:8012');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Navigate to Learning Reranker
        await page.click('[data-tab="rag"]');
        await page.waitForTimeout(500);
        await page.click('[data-subtab="learning-ranker"]');
        await page.waitForTimeout(1500);

        // Should show empty state
        const nohitsList = page.locator('#reranker-nohits-list');
        await expect(nohitsList).toContainText('No no-hit queries tracked yet');
    });

    test('should display actual no-hit queries when available', async ({ page }) => {
        // Mock API to return sample data
        await page.route('**/api/reranker/nohits', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    queries: [
                        { query: 'test query 1', ts: '2025-10-19 04:00:00' },
                        { query: 'test query 2', ts: '2025-10-19 04:01:00' }
                    ],
                    count: 2
                })
            });
        });

        await page.goto('http://localhost:8012');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Navigate to Learning Reranker
        await page.click('[data-tab="rag"]');
        await page.waitForTimeout(500);
        await page.click('[data-subtab="learning-ranker"]');
        await page.waitForTimeout(1500);

        // Should show actual queries
        const nohitsList = page.locator('#reranker-nohits-list');
        await expect(nohitsList).toContainText('test query 1');
        await expect(nohitsList).toContainText('test query 2');
        await expect(nohitsList).toContainText('2025-10-19 04:00:00');
    });

    test('should show error message on API failure', async ({ page }) => {
        // Mock API to fail
        await page.route('**/api/reranker/nohits', async route => {
            await route.abort('failed');
        });

        await page.goto('http://localhost:8012');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Navigate to Learning Reranker
        await page.click('[data-tab="rag"]');
        await page.waitForTimeout(500);
        await page.click('[data-subtab="learning-ranker"]');
        await page.waitForTimeout(1500);

        // Should show error message
        const nohitsList = page.locator('#reranker-nohits-list');
        await expect(nohitsList).toContainText('Failed to load no-hit queries');
    });
});
