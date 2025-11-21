import { test, expect } from '@playwright/test';

test('Dashboard Simple - Click tab and verify Run Eval exists', async ({ page }) => {
    console.log('\n🎥 Dashboard Verification\n');

    // Load page
    console.log('📍 Loading page...');
    await page.goto('http://127.0.0.1:8012/', { waitUntil: 'domcontentloaded' });

    // Wait for tabs to load
    await page.waitForTimeout(2000);

    // Click dashboard tab (use force to bypass visibility check)
    console.log('📍 Clicking dashboard tab...');
    const dashboardTabButton = await page.locator('button[data-tab="dashboard"]').first();
    await dashboardTabButton.click({ force: true });

    // Wait for content
    await page.waitForTimeout(2000);

    // Take full screenshot
    console.log('📸 Taking full screenshot');
    await page.screenshot({ path: 'test-results/dashboard-full-page.png', fullPage: true });

    // Look for Run Eval button
    console.log('🔍 Looking for Run Eval button...');
    const evalButton = await page.$('#dash-eval-trigger');

    if (evalButton) {
        console.log('✅ Found #dash-eval-trigger\n');

        // Get button text
        const buttonText = await evalButton.textContent();
        console.log(`Button text: "${buttonText}"`);

        // Take screenshot of button
        await page.screenshot({ path: 'test-results/dashboard-eval-button.png' });

        // Click it to test dropdown
        console.log('\n🎬 Clicking Run Eval button...');
        await evalButton.click();
        await page.waitForTimeout(800);

        // Screenshot of dropdown open
        console.log('📸 Dropdown opened');
        await page.screenshot({ path: 'test-results/dashboard-eval-dropdown.png' });

        // Check dropdown options
        const dropdown = await page.$('#dash-eval-dropdown');
        if (dropdown) {
            const dropdownText = await dropdown.textContent();
            console.log(`Dropdown content:\n${dropdownText}\n`);
        }
    } else {
        console.log('❌ Run Eval button NOT found\n');

        // Try to find what buttons exist
        const buttons = await page.$$('button.action-btn');
        console.log(`Found ${buttons.length} action buttons:`);

        for (let i = 0; i < buttons.length; i++) {
            const text = await buttons[i].textContent();
            const id = await buttons[i].getAttribute('id');
            console.log(`  ${i+1}. [${id}] ${text}`);
        }
    }

    // Check for metrics sections
    console.log('\n🔍 Checking for metrics sections...');
    const sections = ['#dash-api-perf-metrics', '#dash-index-health-metrics', '#dash-top-folders-metrics'];

    for (const selector of sections) {
        const elem = await page.$(selector);
        const found = elem ? '✅' : '❌';
        console.log(`  ${found} ${selector}`);
    }

    console.log('\n✅ Test complete');
});
