import { test } from '@playwright/test';

test('Just take a screenshot', async ({ page }) => {
    await page.goto('http://127.0.0.1:8012/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/00-initial-page.png', fullPage: true });
    console.log('📸 Screenshot saved');
});
