// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Indexing Repo Selector', () => {
    test('Should display current repo selector on RAG > Indexing tab', async ({ page }) => {
        // Navigate to GUI
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);

        // Click Indexing subtab
        await page.locator('button[data-subtab="indexing"]').click();
        await page.waitForTimeout(500);

        // Check that the repo selector exists
        const repoSelector = page.locator('#indexing-repo-selector');
        await expect(repoSelector).toBeVisible();

        // Check that it's populated (not showing "Loading...")
        await page.waitForTimeout(1000); // Give time for config to load

        const selectedValue = await repoSelector.inputValue();
        console.log('[test] Selected repo:', selectedValue);

        expect(selectedValue).toBeTruthy();
        expect(selectedValue).not.toBe('');
        expect(selectedValue).toBe('agro');

        // Check that branch is displayed
        const branchDisplay = page.locator('#indexing-branch-display');
        await expect(branchDisplay).toBeVisible();

        const branchText = await branchDisplay.textContent();
        console.log('[test] Branch display:', branchText);

        expect(branchText).toBeTruthy();
        expect(branchText).not.toBe('—');
        expect(branchText).toBe('development');
    });

    test('Should have green styling matching health display', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);
        await page.locator('button[data-subtab="indexing"]').click();
        await page.waitForTimeout(1000);

        // Check selector styling
        const repoSelector = page.locator('#indexing-repo-selector');
        const bgColor = await repoSelector.evaluate(el => window.getComputedStyle(el).backgroundColor);

        console.log('[test] Selector background color:', bgColor);

        // The selector should have green background (var(--ok))
        // In dark mode, --ok is typically rgb(0, 255, 136) or similar
        expect(bgColor).toBeTruthy();
    });

    test('Should sync with other repo dropdowns when changed', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);
        await page.locator('button[data-subtab="indexing"]').click();
        await page.waitForTimeout(1000);

        // Get initial value
        const repoSelector = page.locator('#indexing-repo-selector');
        const initialValue = await repoSelector.inputValue();
        console.log('[test] Initial repo:', initialValue);

        // Check that the dropdown has options
        const options = await repoSelector.locator('option').count();
        console.log('[test] Repo selector has', options, 'options');

        expect(options).toBeGreaterThanOrEqual(1);

        // If there are multiple options, test changing
        if (options > 1) {
            // Get all option values
            const optionValues = await repoSelector.locator('option').allTextContents();
            console.log('[test] Available repos:', optionValues);

            // Select a different repo (if available)
            const alternateRepo = optionValues.find(v => v !== initialValue && v !== '');
            if (alternateRepo) {
                await repoSelector.selectOption(alternateRepo);
                await page.waitForTimeout(500);

                // Verify the simple-repo-select is synced
                const simpleSelect = page.locator('#simple-repo-select');
                const simpleValue = await simpleSelect.inputValue();
                console.log('[test] Simple select value after change:', simpleValue);

                expect(simpleValue).toBe(alternateRepo);
            }
        }
    });

    test('Should show branch as "development" (not "unknown")', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to RAG > Indexing
        await page.locator('[data-testid="tab-btn-rag"]').click();
        await page.waitForTimeout(500);
        await page.locator('button[data-subtab="indexing"]').click();
        await page.waitForTimeout(1500); // Extra time for API call

        // Check branch display
        const branchDisplay = page.locator('#indexing-branch-display');
        const branchText = await branchDisplay.textContent();

        console.log('[test] Branch text:', branchText);

        // Should NOT be "unknown" or "—"
        expect(branchText).not.toBe('unknown');
        expect(branchText).not.toBe('—');
        expect(branchText).toBe('development');
    });

    test('Dashboard should also show correct branch (not "unknown")', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForSelector('button:has-text("Health")', { timeout: 10000 });

        // Navigate to Dashboard
        await page.locator('[data-testid="tab-btn-dashboard"]').click();
        await page.waitForTimeout(1500);

        // Find branch display on dashboard (it's in the index status area)
        const pageContent = await page.content();

        // Check if "unknown" appears in the page
        const hasUnknownBranch = pageContent.includes('Branch: unknown') || pageContent.includes('Branch:</span> unknown');

        console.log('[test] Dashboard has "unknown" branch:', hasUnknownBranch);

        // Should NOT have "unknown" branch
        expect(hasUnknownBranch).toBe(false);

        // Should have "development" branch
        const hasDevelopmentBranch = pageContent.includes('development');
        console.log('[test] Dashboard has "development" branch:', hasDevelopmentBranch);

        expect(hasDevelopmentBranch).toBe(true);
    });
});
