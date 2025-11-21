// Playwright test for Help & Glossary feature in /gui
// Tests: Learn button, Dashboard subtabs, Glossary rendering, Search, Filters

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8012';
const GUI_URL = `${BASE_URL}/gui/`;

test.describe('Help & Glossary Feature (/gui)', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to GUI
        await page.goto(GUI_URL);
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        // Wait a bit for scripts to initialize
        await page.waitForTimeout(1000);
    });

    test('Learn button exists in topbar', async ({ page }) => {
        // Check that Learn button exists
        const learnButton = page.locator('#btn-learn');
        await expect(learnButton).toBeVisible();

        // Check button has correct text
        await expect(learnButton).toContainText('Learn');

        // Check button has icon (SVG)
        const svg = learnButton.locator('svg');
        await expect(svg).toBeVisible();
    });

    test('Learn button navigates to Dashboard Help subtab', async ({ page }) => {
        // Click the Learn button
        await page.click('#btn-learn');

        // Wait for navigation
        await page.waitForTimeout(500);

        // Check that we're on the dashboard tab
        const dashboardTab = page.locator('#tab-dashboard');
        await expect(dashboardTab).toHaveClass(/active/);

        // Check that the help subtab is active
        const helpSubtab = page.locator('#tab-dashboard-help');
        await expect(helpSubtab).toHaveClass(/active/);

        // Check that overview subtab is NOT active
        const overviewSubtab = page.locator('#tab-dashboard-overview-dash');
        await expect(overviewSubtab).not.toHaveClass(/active/);
    });

    test('Dashboard has Overview and Help & Glossary subtabs', async ({ page }) => {
        // Navigate to dashboard first
        await page.click('button[data-tab="dashboard"]');
        await page.waitForTimeout(300);

        // Check that dashboard subtabs bar exists and is visible
        const subtabBar = page.locator('#dashboard-subtabs');
        await expect(subtabBar).toBeVisible();

        // Check for Overview button
        const overviewBtn = subtabBar.locator('button[data-subtab="overview-dash"]');
        await expect(overviewBtn).toBeVisible();
        await expect(overviewBtn).toContainText('Overview');

        // Check for Help & Glossary button
        const helpBtn = subtabBar.locator('button[data-subtab="help"]');
        await expect(helpBtn).toBeVisible();
        await expect(helpBtn).toContainText('Help & Glossary');
    });

    test('Can switch between Overview and Help subtabs', async ({ page }) => {
        // Navigate to dashboard
        await page.click('button[data-tab="dashboard"]');
        await page.waitForTimeout(300);

        // Overview should be active by default
        const overviewSubtab = page.locator('#tab-dashboard-overview-dash');
        await expect(overviewSubtab).toHaveClass(/active/);

        // Click Help & Glossary subtab
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(300);

        // Help subtab should now be active
        const helpSubtab = page.locator('#tab-dashboard-help');
        await expect(helpSubtab).toHaveClass(/active/);

        // Overview should no longer be active
        await expect(overviewSubtab).not.toHaveClass(/active/);

        // Switch back to Overview
        await page.click('button[data-subtab="overview-dash"]');
        await page.waitForTimeout(300);

        // Overview should be active again
        await expect(overviewSubtab).toHaveClass(/active/);
        await expect(helpSubtab).not.toHaveClass(/active/);
    });

    test('Glossary elements exist on Help subtab', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(500);

        // Check for search input
        const searchInput = page.locator('#glossary-search');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', /Search parameters/);

        // Check for category filters container
        const filtersContainer = page.locator('#glossary-category-filters');
        await expect(filtersContainer).toBeVisible();

        // Check for glossary grid
        const glossaryGrid = page.locator('#glossary-grid');
        await expect(glossaryGrid).toBeVisible();
    });

    test('Glossary renders parameter cards', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800); // Give time for glossary to render

        // Check that glossary cards are rendered
        const cards = page.locator('.glossary-card');
        const count = await cards.count();

        // Should have many cards (100+ parameters from tooltips.js)
        expect(count).toBeGreaterThan(50);

        // Check first card has required elements
        const firstCard = cards.first();
        await expect(firstCard.locator('.glossary-card-title')).toBeVisible();
        await expect(firstCard.locator('.glossary-param-name')).toBeVisible();
        await expect(firstCard.locator('.glossary-body')).toBeVisible();
    });

    test('Category filter buttons are rendered', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        // Check for filter buttons
        const filterButtons = page.locator('.category-filter-btn');
        const count = await filterButtons.count();

        // Should have "All" plus category buttons
        expect(count).toBeGreaterThan(1);

        // Check for "All" button
        const allButton = page.locator('.category-filter-btn[data-category="all"]');
        await expect(allButton).toBeVisible();
        await expect(allButton).toHaveClass(/active/); // Should be active by default
    });

    test('Category filtering works', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        // Get initial card count
        const initialCount = await page.locator('.glossary-card').count();

        // Click on a specific category (e.g., Infrastructure)
        const categoryBtn = page.locator('.category-filter-btn:has-text("Infrastructure")').first();
        if (await categoryBtn.isVisible()) {
            await categoryBtn.click();
            await page.waitForTimeout(300);

            // Check that button is now active
            await expect(categoryBtn).toHaveClass(/active/);

            // Card count should be less than total
            const filteredCount = await page.locator('.glossary-card').count();
            expect(filteredCount).toBeLessThan(initialCount);
            expect(filteredCount).toBeGreaterThan(0);
        }
    });

    test('Search functionality works', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        // Get initial card count
        const initialCount = await page.locator('.glossary-card').count();

        // Type in search box
        await page.fill('#glossary-search', 'QDRANT');
        await page.waitForTimeout(400); // Debounce

        // Should filter cards
        const filteredCount = await page.locator('.glossary-card').count();
        expect(filteredCount).toBeLessThan(initialCount);
        expect(filteredCount).toBeGreaterThan(0);

        // Cards should contain QDRANT in param name or description
        const firstCard = page.locator('.glossary-card').first();
        const paramName = await firstCard.locator('.glossary-param-name').textContent();
        expect(paramName).toContain('QDRANT');
    });

    test('Glossary cards have proper styling', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        const firstCard = page.locator('.glossary-card').first();

        // Check that card has background
        const bg = await firstCard.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
        });
        expect(bg).toBeTruthy();

        // Check that card has border
        const border = await firstCard.evaluate(el => {
            return window.getComputedStyle(el).border;
        });
        expect(border).toContain('px');

        // Check that card has border-radius
        const borderRadius = await firstCard.evaluate(el => {
            return window.getComputedStyle(el).borderRadius;
        });
        expect(borderRadius).not.toBe('0px');
    });

    test('Glossary links open in new tab', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        // Find first card with links
        const cardWithLinks = page.locator('.glossary-card:has(.glossary-links)').first();

        if (await cardWithLinks.isVisible()) {
            const link = cardWithLinks.locator('.glossary-link').first();

            // Check that link has target="_blank"
            await expect(link).toHaveAttribute('target', '_blank');
            await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        }
    });

    test('Search clears when typing new query', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        // Search for QDRANT
        await page.fill('#glossary-search', 'QDRANT');
        await page.waitForTimeout(400);
        const qdrantCount = await page.locator('.glossary-card').count();

        // Clear and search for MODEL
        await page.fill('#glossary-search', 'MODEL');
        await page.waitForTimeout(400);
        const modelCount = await page.locator('.glossary-card').count();

        // Counts should be different
        expect(qdrantCount).not.toBe(modelCount);

        // Both should have some results
        expect(qdrantCount).toBeGreaterThan(0);
        expect(modelCount).toBeGreaterThan(0);
    });

    test('Empty search shows all cards', async ({ page }) => {
        // Navigate to Help subtab
        await page.click('#btn-learn');
        await page.waitForTimeout(800);

        const initialCount = await page.locator('.glossary-card').count();

        // Search for something
        await page.fill('#glossary-search', 'XYZ_NONEXISTENT');
        await page.waitForTimeout(400);

        // Clear search
        await page.fill('#glossary-search', '');
        await page.waitForTimeout(400);

        // Should show all cards again
        const finalCount = await page.locator('.glossary-card').count();
        expect(finalCount).toBe(initialCount);
    });
});

console.log('✓ Help & Glossary GUI tests loaded');
