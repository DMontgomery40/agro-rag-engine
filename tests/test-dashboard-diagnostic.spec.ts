import { test, expect } from '@playwright/test';

test('Dashboard Diagnostic - Check what is actually rendering', async ({ page }) => {
    console.log('\n🔍 DIAGNOSTIC: Checking dashboard content\n');

    // Load page
    await page.goto('http://127.0.0.1:8012/', { waitUntil: 'domcontentloaded' });

    // Wait a bit for JS to execute
    await page.waitForTimeout(3000);

    // Take screenshot to see what's there
    console.log('📸 Screenshot of loaded page');
    await page.screenshot({ path: 'test-results/diagnostic-01-page-loaded.png', fullPage: true });

    // Check what tabs exist
    const tabs = await page.locator('[data-tab]').all();
    console.log(`Found ${tabs.length} tabs`);

    for (const tab of tabs) {
        const attr = await tab.getAttribute('data-tab');
        const text = await tab.textContent();
        console.log(`  - [${attr}] ${text}`);
    }

    // Check dashboard tab specifically
    const dashboardTab = await page.$('[data-tab="dashboard"]');
    if (dashboardTab) {
        const isVisible = await dashboardTab.isVisible();
        console.log(`\n✅ Dashboard tab found (visible: ${isVisible})`);

        // Click it if not active
        await dashboardTab.click();
        console.log('📍 Clicked dashboard tab');
    } else {
        console.log('\n❌ Dashboard tab NOT found');
    }

    await page.waitForTimeout(2000);

    // Check what IDs exist on the page
    console.log('\n🔎 Looking for dashboard-specific elements:');

    const elementsToFind = [
        '#tab-dashboard',
        '#dash-eval-trigger',
        '#dash-api-perf-metrics',
        '#dash-index-health-metrics',
        '#dash-top-folders-metrics',
        '#dash-operations-terminal',
        '#dash-index-status'
    ];

    for (const selector of elementsToFind) {
        const elem = await page.$(selector);
        const visible = elem ? await elem.isVisible() : false;
        const status = elem ? (visible ? '✅ found & visible' : '⚠️  found but hidden') : '❌ NOT found';
        console.log(`  ${selector}: ${status}`);
    }

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    await page.waitForTimeout(1000);

    if (errors.length > 0) {
        console.log(`\n⚠️  ${errors.length} console errors found:`);
        errors.forEach(err => console.log(`  - ${err}`));
    } else {
        console.log('\n✅ No console errors');
    }

    // Get the HTML of the dashboard to see if scripts loaded
    console.log('\n🔍 Checking for script tags:');
    const scripts = await page.$$('script[src]');
    const dashboardScripts = scripts.filter(async (s) => {
        const src = await s.getAttribute('src');
        return src?.includes('dashboard') || src?.includes('index_status');
    });

    console.log(`  Total scripts: ${scripts.length}`);
    console.log(`  Dashboard-related scripts: ${dashboardScripts.length}`);

    // Check if new scripts are loaded
    const hasMetrics = await page.evaluate(() => typeof (window as any).DashboardMetrics !== 'undefined');
    const hasOperations = await page.evaluate(() => typeof (window as any).DashboardOperations !== 'undefined');
    const hasLiveTerminal = await page.evaluate(() => typeof (window as any).LiveTerminal !== 'undefined');

    console.log(`\n📦 Module availability:`);
    console.log(`  DashboardMetrics: ${hasMetrics ? '✅' : '❌'}`);
    console.log(`  DashboardOperations: ${hasOperations ? '✅' : '❌'}`);
    console.log(`  LiveTerminal: ${hasLiveTerminal ? '✅' : '❌'}`);

    // Take another screenshot
    console.log('\n📸 Final screenshot after checks');
    await page.screenshot({ path: 'test-results/diagnostic-02-after-checks.png', fullPage: true });
});
