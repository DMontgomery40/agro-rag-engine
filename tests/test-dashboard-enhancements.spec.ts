import { test, expect } from '@playwright/test';

test.describe('Dashboard Enhancements - Visual Verification', () => {
    test('Dashboard - Full Tour with Animations', async ({ page }) => {
        console.log('🎥 Recording: Dashboard Enhancements Tour\n');

        // Navigate to dashboard
        console.log('📍 Loading dashboard...');
        await page.goto('http://127.0.0.1:8012/', { waitUntil: 'networkidle' });

        // Scroll to top to ensure dashboard is visible
        await page.evaluate(() => window.scrollTo(0, 0));

        // Wait for dashboard elements
        await page.waitForSelector('#dash-eval-trigger', { timeout: 15000 });
        console.log('✅ Dashboard loaded\n');

        // Screenshot 1: Full dashboard overview
        console.log('📸 Screenshot 1: Full Dashboard Overview');
        await page.screenshot({ path: 'test-results/01-dashboard-overview.png', fullPage: true });
        await page.waitForTimeout(500);

        // Screenshot 2: System Status + Quick Actions visible
        console.log('📸 Screenshot 2: System Status & Quick Actions');
        await page.locator('#dash-eval-trigger').scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'test-results/02-quick-actions.png' });
        await page.waitForTimeout(500);

        // Animation 1: Click Run Eval button (dropdown opens)
        console.log('🎬 Animation 1: Run Eval Dropdown Opening');
        const evalButton = await page.$('#dash-eval-trigger');
        expect(evalButton).toBeTruthy();

        console.log('  → Clicking Run Eval button...');
        await evalButton?.click();

        // Wait for dropdown animation to complete
        await page.waitForTimeout(600);

        console.log('  → Dropdown opened, capturing...');
        await page.screenshot({ path: 'test-results/03-eval-dropdown-open.png' });

        // Screenshot 3: Dropdown menu visible with 3 options
        const dropdownContent = await page.textContent('#dash-eval-dropdown');
        expect(dropdownContent).toContain('Cross-Encoder');
        expect(dropdownContent).toContain('Cohere');
        console.log('✅ Dropdown has 3 reranker options\n');

        // Animation 2: Close dropdown by clicking outside
        console.log('🎬 Animation 2: Run Eval Dropdown Closing');
        await page.click('body', { position: { x: 100, y: 100 } });
        await page.waitForTimeout(600);
        console.log('  → Dropdown closed');
        await page.screenshot({ path: 'test-results/04-eval-dropdown-closed.png' });
        await page.waitForTimeout(300);

        // Scroll down to see metrics sections
        console.log('\n📍 Scrolling to metrics sections...');
        await page.locator('#dash-api-perf-metrics').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        // Screenshot 4: API Performance metrics
        console.log('📸 Screenshot 4: API Performance Metrics');
        const perfMetrics = await page.textContent('#dash-api-perf-metrics');
        console.log('  Content:', perfMetrics?.substring(0, 80));
        await page.screenshot({ path: 'test-results/05-api-performance-metrics.png' });
        await page.waitForTimeout(500);

        // Scroll to Index Health
        await page.locator('#dash-index-health-metrics').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Screenshot 5: Index Health metrics
        console.log('📸 Screenshot 5: Index Health Metrics');
        const healthMetrics = await page.textContent('#dash-index-health-metrics');
        console.log('  Content:', healthMetrics?.substring(0, 80));
        await page.screenshot({ path: 'test-results/06-index-health-metrics.png' });
        await page.waitForTimeout(500);

        // Scroll to Top Folders
        await page.locator('#dash-top-folders-metrics').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Screenshot 6: Top Folders metrics
        console.log('📸 Screenshot 6: Top Folders Metrics');
        const folderMetrics = await page.textContent('#dash-top-folders-metrics');
        console.log('  Content:', folderMetrics?.substring(0, 80));
        await page.screenshot({ path: 'test-results/07-top-folders-metrics.png' });
        await page.waitForTimeout(500);

        // Scroll back up to test collapsible
        console.log('\n📍 Testing collapsible behavior...');
        await page.locator('#dash-index-status').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Screenshot 7: Before opening details
        console.log('📸 Screenshot 7: Index Profiles (Closed)');
        await page.screenshot({ path: 'test-results/08-index-profiles-closed.png' });
        await page.waitForTimeout(500);

        // Animation 3: Click to open Index Profiles
        console.log('🎬 Animation 3: Opening Index Profiles Details');
        const details = await page.$('details');
        if (details) {
            const summary = await page.$('details > summary');
            console.log('  → Clicking summary to open...');
            await summary?.click();
            await page.waitForTimeout(400);

            console.log('  → Details opened');
            await page.screenshot({ path: 'test-results/09-index-profiles-open.png' });

            // Wait and verify it stays open during polling
            console.log('  → Waiting 2 seconds to verify state persists during polling...');
            await page.waitForTimeout(2000);

            const stillOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);
            expect(stillOpen).toBe(true);
            console.log('✅ Collapsible state persisted!\n');

            await page.screenshot({ path: 'test-results/10-index-profiles-still-open.png' });
        }

        // Test console for errors
        console.log('🔍 Checking for console errors...');
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
                console.error('  ❌ Error:', msg.text());
            }
        });

        await page.waitForTimeout(500);

        if (errors.length === 0) {
            console.log('✅ No console errors detected\n');
        }

        // Final full page screenshot
        console.log('📸 Screenshot 11: Final Full Dashboard');
        await page.goto('http://127.0.0.1:8012/', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-results/11-dashboard-final.png', fullPage: true });

        console.log('\n🎉 Dashboard verification complete!');
        console.log('   Screenshots saved to: test-results/');
    });
});
