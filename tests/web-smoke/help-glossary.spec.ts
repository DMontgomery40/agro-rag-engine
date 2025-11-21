// Playwright test for Help & Glossary feature in /web (React)
// Tests: Learn button, Dashboard subtabs, Glossary rendering, Search, Filters

import { test, expect } from '@playwright/test';

test.describe('Help & Glossary Feature (/web React)', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to web interface (uses baseURL from config)
        await page.goto('/');
        // Wait for React to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500); // Give time for modules to load
    });

    test('Learn button exists in topbar', async ({ page }) => {
        const learnButton = page.locator('#btn-learn');
        await expect(learnButton).toBeVisible();
        await expect(learnButton).toContainText('Learn');
    });

    test('Learn button navigates to Dashboard Help subtab', async ({ page }) => {
        await page.click('#btn-learn');
        await page.waitForTimeout(500);

        // Check URL contains subtab=help
        expect(page.url()).toContain('dashboard');
        expect(page.url()).toContain('subtab=help');

        // Check that help subtab is visible
        await expect(page.locator('.help-glossary-container')).toBeVisible();
    });

    test('Dashboard has Overview and Help & Glossary subtabs', async ({ page }) => {
        // Navigate to dashboard by clicking the tab
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(500);

        // Check for subtab buttons
        const subtabBar = page.locator('#dashboard-subtabs');
        await expect(subtabBar).toBeVisible();

        const overviewBtn = page.locator('button[data-subtab="overview"]');
        await expect(overviewBtn).toBeVisible();

        const helpBtn = page.locator('button[data-subtab="help"]');
        await expect(helpBtn).toBeVisible();
        await expect(helpBtn).toContainText('Help & Glossary');
    });

    test('Can switch between Overview and Help subtabs', async ({ page }) => {
        // Navigate to dashboard
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(500);

        // Overview should be active by default
        const overviewBtn = page.locator('button[data-subtab="overview"]');
        await expect(overviewBtn).toHaveClass(/active/);

        // Click Help & Glossary
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(300);

        // Help should be active
        const helpBtn = page.locator('button[data-subtab="help"]');
        await expect(helpBtn).toHaveClass(/active/);
        await expect(page.locator('.help-glossary-container')).toBeVisible();

        // Switch back to Overview
        await page.click('button[data-subtab="overview"]');
        await page.waitForTimeout(300);
        await expect(overviewBtn).toHaveClass(/active/);
    });

    test('Glossary renders parameter cards', async ({ page }) => {
        // Navigate to dashboard and click Help & Glossary
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(300);
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(1000);

        const cards = page.locator('.glossary-card');
        const count = await cards.count();

        // Should have many cards
        expect(count).toBeGreaterThan(50);

        // Check first card structure
        const firstCard = cards.first();
        await expect(firstCard.locator('.glossary-card-title')).toBeVisible();
        await expect(firstCard.locator('.glossary-param-name')).toBeVisible();
        await expect(firstCard.locator('.glossary-body')).toBeVisible();
    });

    test('Category filters work', async ({ page }) => {
        // Navigate to dashboard and click Help & Glossary
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(300);
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(1000);

        const initialCount = await page.locator('.glossary-card').count();

        // Click a category filter
        const infraBtn = page.locator('.category-filter-btn:has-text("Infrastructure")').first();
        if (await infraBtn.isVisible()) {
            await infraBtn.click();
            await page.waitForTimeout(300);

            await expect(infraBtn).toHaveClass(/active/);

            const filteredCount = await page.locator('.glossary-card').count();
            expect(filteredCount).toBeLessThan(initialCount);
            expect(filteredCount).toBeGreaterThan(0);
        }
    });

    test('Search functionality works', async ({ page }) => {
        // Navigate to dashboard and click Help & Glossary
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(300);
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(1000);

        const initialCount = await page.locator('.glossary-card').count();

        // Search for QDRANT
        await page.fill('.glossary-search', 'QDRANT');
        await page.waitForTimeout(400);

        const filteredCount = await page.locator('.glossary-card').count();
        expect(filteredCount).toBeLessThan(initialCount);
        expect(filteredCount).toBeGreaterThan(0);
    });

    test('Glossary links open in new tab', async ({ page }) => {
        // Navigate to dashboard and click Help & Glossary
        await page.click('a:has-text("Dashboard")');
        await page.waitForTimeout(300);
        await page.click('button[data-subtab="help"]');
        await page.waitForTimeout(1000);

        const cardWithLinks = page.locator('.glossary-card:has(.glossary-links)').first();
        if (await cardWithLinks.isVisible()) {
            const link = cardWithLinks.locator('.glossary-link').first();
            await expect(link).toHaveAttribute('target', '_blank');
            await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        }
    });
});

console.log('✓ Help & Glossary Web tests loaded');
