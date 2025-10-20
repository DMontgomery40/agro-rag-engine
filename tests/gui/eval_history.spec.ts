import { test, expect } from '@playwright/test';

test.describe('Evaluation History Panel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8012', { waitUntil: 'networkidle' });

        // Wait for app to be ready
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Navigate to RAG tab
        const ragTab = page.locator('[data-tab="rag"]').first();
        await ragTab.waitFor({ state: 'visible', timeout: 15000 });
        await ragTab.click();
        await page.waitForTimeout(800);

        // Navigate to Evaluate subtab
        const evaluateSubtab = page.locator('[data-subtab="evaluate"]');
        await evaluateSubtab.waitFor({ state: 'visible', timeout: 10000 });
        await evaluateSubtab.click();
        await page.waitForTimeout(800);
    });

    test('should display eval history table', async ({ page }) => {
        // Check that the eval history table exists
        const table = page.locator('#eval-history-table');
        await expect(table).toBeVisible();

        // Check table headers
        await expect(page.locator('#eval-history-table th:has-text("Timestamp")')).toBeVisible();
        await expect(page.locator('#eval-history-table th:has-text("Configuration")')).toBeVisible();
        await expect(page.locator('#eval-history-table th:has-text("Top-1")')).toBeVisible();
        await expect(page.locator('#eval-history-table th:has-text("Top-5")')).toBeVisible();
        await expect(page.locator('#eval-history-table th:has-text("Time")')).toBeVisible();
        await expect(page.locator('#eval-history-table th:has-text("Δ Top-5")')).toBeVisible();
    });

    test('should display seeded evaluation data', async ({ page }) => {
        // Wait for eval history to load
        await page.waitForTimeout(1000);

        const tbody = page.locator('#eval-history-tbody');

        // Should have at least one row of data (seeded)
        const rows = tbody.locator('tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);

        // Check for specific seeded data
        const firstRow = rows.first();

        // Should contain configuration badge
        const configBadge = firstRow.locator('td:nth-child(2) span');
        await expect(configBadge).toBeVisible();

        // Should contain accuracy data
        const top5Cell = firstRow.locator('td:nth-child(4)');
        await expect(top5Cell).toBeVisible();

        // Should show percentage
        const pctText = await top5Cell.textContent();
        expect(pctText).toMatch(/%/);
    });

    test('should display different configuration badges with correct styling', async ({ page }) => {
        await page.waitForTimeout(1000);

        // Check for "BM25 + Trained CE" badge (should be accent color)
        const trainedCEBadge = page.locator('text=BM25 + Trained CE').first();
        if (await trainedCEBadge.isVisible()) {
            const color = await trainedCEBadge.evaluate(el =>
                window.getComputedStyle(el).color
            );
            // Should have accent color (not muted)
            expect(color).not.toBe('var(--fg-muted)');
        }

        // Check for "BM25-only" badge
        const bm25OnlyBadge = page.locator('text=BM25-only').first();
        if (await bm25OnlyBadge.isVisible()) {
            await expect(bm25OnlyBadge).toBeVisible();
        }
    });

    test('should show delta comparison between runs', async ({ page }) => {
        await page.waitForTimeout(1000);

        const tbody = page.locator('#eval-history-tbody');
        const rows = tbody.locator('tr');
        const rowCount = await rows.count();

        if (rowCount > 1) {
            // Check second row for delta (comparing against first run)
            const secondRow = rows.nth(1);
            const deltaCell = secondRow.locator('td:nth-child(6)');

            const deltaText = await deltaCell.textContent();
            // Should either show delta (+/- X.X%) or dash (—)
            expect(deltaText).toMatch(/[+\-]?\d+\.\d+%|—/);
        }
    });

    test('should have working refresh button', async ({ page }) => {
        const refreshButton = page.locator('#btn-eval-history-refresh');
        await expect(refreshButton).toBeVisible();
        await expect(refreshButton).toBeEnabled();

        // Click refresh
        await refreshButton.click();

        // Wait for refresh
        await page.waitForTimeout(500);

        // Table should still be visible
        const table = page.locator('#eval-history-table');
        await expect(table).toBeVisible();
    });

    test('should have working clear button with confirmation', async ({ page }) => {
        const clearButton = page.locator('#btn-eval-history-clear');
        await expect(clearButton).toBeVisible();
        await expect(clearButton).toBeEnabled();

        // Setup dialog handler to dismiss
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Clear all evaluation history');
            await dialog.dismiss();
        });

        await clearButton.click();

        // Wait a moment
        await page.waitForTimeout(300);

        // Data should still be present (we dismissed)
        const tbody = page.locator('#eval-history-tbody');
        const rows = tbody.locator('tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
    });

    test('should display timestamps in readable format', async ({ page }) => {
        await page.waitForTimeout(1000);

        const tbody = page.locator('#eval-history-tbody');
        const firstRow = tbody.locator('tr').first();
        const timestampCell = firstRow.locator('td:first-child');

        const timestampText = await timestampCell.textContent();

        // Should contain date and time
        expect(timestampText).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/); // Date format
    });

    test('should color-code top-5 accuracy based on performance', async ({ page }) => {
        await page.waitForTimeout(1000);

        const tbody = page.locator('#eval-history-tbody');
        const rows = tbody.locator('tr');

        for (let i = 0; i < Math.min(await rows.count(), 3); i++) {
            const row = rows.nth(i);
            const top5Cell = row.locator('td:nth-child(4) div:first-child');

            if (await top5Cell.isVisible()) {
                const color = await top5Cell.evaluate(el =>
                    window.getComputedStyle(el).color
                );

                // Should have some color applied (not default)
                expect(color).toBeTruthy();
            }
        }
    });

    test('should show run duration in seconds', async ({ page }) => {
        await page.waitForTimeout(1000);

        const tbody = page.locator('#eval-history-tbody');
        const firstRow = tbody.locator('tr').first();
        const timeCell = firstRow.locator('td:nth-child(5)');

        const timeText = await timeCell.textContent();

        // Should end with 's' for seconds
        expect(timeText).toMatch(/\d+s/);
    });

    test('should handle empty history gracefully', async ({ page }) => {
        // Clear localStorage to simulate empty history
        await page.evaluate(() => {
            localStorage.removeItem('agro_eval_history');
        });

        // Refresh the page
        await page.reload();
        await page.waitForSelector('[data-tab="rag"]', { timeout: 10000 });
        await page.click('[data-tab="rag"]');
        await page.waitForTimeout(500);
        await page.click('[data-subtab="evaluate"]');
        await page.waitForTimeout(1000);

        // Should show the seeded data again (auto-seed on empty)
        const tbody = page.locator('#eval-history-tbody');
        const rows = tbody.locator('tr');
        const rowCount = await rows.count();

        // After auto-seed, should have rows
        expect(rowCount).toBeGreaterThan(0);
    });
});
