import { test } from '@playwright/test';

test('Dashboard - Full scroll through with screenshots', async ({ page }) => {
    console.log('\n🎥 Dashboard Full Tour with Scrolling\n');

    await page.goto('http://127.0.0.1:8012/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Screenshot 1: Initial view (System Status + Quick Actions + Index Status)
    console.log('📸 Screenshot 1: Top of dashboard');
    await page.screenshot({ path: 'test-results/01-dashboard-top.png', fullPage: true });

    // Scroll down to see Quick Actions buttons
    console.log('📍 Scrolling to Quick Actions buttons');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(800);

    console.log('📸 Screenshot 2: Quick Actions area');
    await page.screenshot({ path: 'test-results/02-quick-actions-area.png' });

    // Scroll to see storage section and collapsible
    console.log('📍 Scrolling to Storage section');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(800);

    console.log('📸 Screenshot 3: Storage Requirements');
    await page.screenshot({ path: 'test-results/03-storage-section.png' });

    // Scroll to see Total Storage footer
    console.log('📍 Scrolling to Total Storage');
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(800);

    console.log('📸 Screenshot 4: Total Storage');
    await page.screenshot({ path: 'test-results/04-total-storage.png' });

    // Scroll to metrics sections
    console.log('📍 Scrolling to API Performance metrics');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1000);

    console.log('📸 Screenshot 5: API Performance Metrics');
    await page.screenshot({ path: 'test-results/05-api-performance-metrics.png' });

    // Scroll to Index Health
    console.log('📍 Scrolling to Index Health');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1000);

    console.log('📸 Screenshot 6: Index Health');
    await page.screenshot({ path: 'test-results/06-index-health-metrics.png' });

    // Scroll to Top Folders
    console.log('📍 Scrolling to Top Folders');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1000);

    console.log('📸 Screenshot 7: Top Folders');
    await page.screenshot({ path: 'test-results/07-top-folders-metrics.png' });

    // Back to top
    console.log('📍 Scrolling back to top');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Look for Run Eval button
    console.log('\n🔍 Checking for new elements:');

    const runEvalBtn = await page.$('#dash-eval-trigger');
    console.log(runEvalBtn ? '✅ Found #dash-eval-trigger' : '❌ #dash-eval-trigger not found');

    const apiPerfMetrics = await page.$('#dash-api-perf-metrics');
    console.log(apiPerfMetrics ? '✅ Found #dash-api-perf-metrics' : '❌ #dash-api-perf-metrics not found');

    const indexHealthMetrics = await page.$('#dash-index-health-metrics');
    console.log(indexHealthMetrics ? '✅ Found #dash-index-health-metrics' : '❌ #dash-index-health-metrics not found');

    const topFoldersMetrics = await page.$('#dash-top-folders-metrics');
    console.log(topFoldersMetrics ? '✅ Found #dash-top-folders-metrics' : '❌ #dash-top-folders-metrics not found');

    const terminal = await page.$('#dash-operations-terminal');
    console.log(terminal ? '✅ Found #dash-operations-terminal' : '❌ #dash-operations-terminal not found');

    console.log('\n✅ Tour complete! All screenshots saved to test-results/\n');
});
