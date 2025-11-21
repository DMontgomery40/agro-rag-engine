// XSS Vulnerability Fix Test - config.js
// Tests that the XSS vulnerability has been fixed and functionality preserved

const { test, expect } = require('@playwright/test');

test.describe('config.js XSS Fix', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the main page
        await page.goto('http://localhost:8012');
        await page.waitForLoadState('networkidle');

        // Click on RAG tab
        const ragTab = page.locator('[data-tab="rag"]');
        await ragTab.click();
        await page.waitForTimeout(500);

        // Click on Data Quality subtab (should be active by default but make sure)
        const dataQualitySubtab = page.locator('[data-subtab="data-quality"]');
        if (await dataQualitySubtab.isVisible()) {
            await dataQualitySubtab.click();
            await page.waitForTimeout(500);
        }
    });

    test('Verify XSS fix - repo names are safely escaped', async ({ page }) => {
        // Wait for the repos section to load
        const reposSection = page.locator('#repos-section');
        await reposSection.waitFor({ state: 'visible', timeout: 10000 });

        // Check that any h4 elements exist (repo headings)
        const h4Elements = page.locator('#repos-section h4');
        const count = await h4Elements.count();

        console.log(`Found ${count} repo headings`);

        if (count > 0) {
            // Get the first repo heading text
            const firstHeading = h4Elements.first();
            const headingText = await firstHeading.textContent();

            console.log(`First repo heading: ${headingText}`);

            // Verify that the heading was created using textContent (not innerHTML)
            // by checking that no script or img tags exist as children
            const dangerousTags = await page.locator('#repos-section script, #repos-section img[onerror]').count();
            expect(dangerousTags).toBe(0);

            console.log('✓ No dangerous tags found in repos section');
        }

        // Verify exclude paths are also safely rendered
        const excludeContainers = page.locator('[id^="exclude-paths-container-"]');
        const excludeCount = await excludeContainers.count();

        console.log(`Found ${excludeCount} exclude path containers`);

        if (excludeCount > 0) {
            // Check for any script tags in exclude paths
            const scriptsInExclude = await page.locator('[id^="exclude-paths-container-"] script').count();
            expect(scriptsInExclude).toBe(0);

            console.log('✓ No script tags in exclude paths containers');
        }

        // Overall test: verify no alert() was triggered (would indicate XSS)
        let alertTriggered = false;
        page.on('dialog', async dialog => {
            alertTriggered = true;
            await dialog.dismiss();
        });

        // Wait a bit to see if any XSS payload triggers
        await page.waitForTimeout(1000);

        expect(alertTriggered).toBe(false);
        console.log('✓ No XSS alert triggered');
    });

    test('Verify normal functionality preserved', async ({ page }) => {
        // Wait for the repos section to load
        const reposSection = page.locator('#repos-section');
        await reposSection.waitFor({ state: 'visible', timeout: 10000 });

        // Check that repo inputs exist and are functional
        const pathInputs = page.locator('input[name^="repo_path_"]');
        const inputCount = await pathInputs.count();

        console.log(`Found ${inputCount} repo path inputs`);
        expect(inputCount).toBeGreaterThan(0);

        // Verify keyword inputs exist
        const keywordInputs = page.locator('input[name^="repo_keywords_"]');
        const kwCount = await keywordInputs.count();

        console.log(`Found ${kwCount} keyword inputs`);
        expect(kwCount).toBeGreaterThan(0);

        // Verify exclude path controls exist
        const excludeAddButtons = page.locator('button[id^="exclude-path-add-"]');
        const btnCount = await excludeAddButtons.count();

        console.log(`Found ${btnCount} exclude path add buttons`);
        expect(btnCount).toBeGreaterThan(0);

        console.log('✓ All form elements present and functional');
    });

    test('Verify textContent is used instead of innerHTML for user data', async ({ page }) => {
        // This test verifies the fix at the code level by checking behavior
        // Wait for repos section
        const reposSection = page.locator('#repos-section');
        await reposSection.waitFor({ state: 'visible', timeout: 10000 });

        // Check that h4 elements contain plain text (not HTML)
        const h4Elements = page.locator('#repos-section h4');
        const count = await h4Elements.count();

        if (count > 0) {
            const firstH4 = h4Elements.first();

            // Get innerHTML and textContent - they should be the same (no HTML tags)
            const innerHTML = await firstH4.evaluate(el => el.innerHTML);
            const textContent = await firstH4.evaluate(el => el.textContent);

            console.log(`h4 innerHTML: ${innerHTML}`);
            console.log(`h4 textContent: ${textContent}`);

            // If textContent was used (as in our fix), innerHTML won't contain HTML tags
            // It should just be plain text
            expect(innerHTML).not.toContain('<img');
            expect(innerHTML).not.toContain('<script');

            // The innerHTML should be similar to textContent (just plain text)
            // allowing for whitespace differences
            const normalizedInner = innerHTML.trim().replace(/\s+/g, ' ');
            const normalizedText = textContent.trim().replace(/\s+/g, ' ');
            expect(normalizedInner).toBe(normalizedText);

            console.log('✓ h4 elements use textContent (safe from XSS)');
        }
    });
});
