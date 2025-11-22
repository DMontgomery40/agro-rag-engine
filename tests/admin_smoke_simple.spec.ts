import { test, expect } from '@playwright/test';

test('Admin page basic smoke test', async ({ page }) => {
  // Navigate to admin
  await page.goto('http://127.0.0.1:8012/admin');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'test-results/admin-page.png', fullPage: true });

  // Log page content
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('Page contains "Admin":', content.includes('Admin'));
  console.log('Page contains "General":', content.includes('General'));
  console.log('Page contains "Git":', content.includes('Git'));

  // Check if React app loaded
  const appElement = await page.locator('#root').count();
  console.log('React root found:', appElement > 0);

  // Check for subtabs
  const subtabs = await page.locator('[data-subtab]').count();
  console.log('Subtabs found:', subtabs);

  // List all subtab values
  const subtabButtons = await page.locator('[data-subtab]').all();
  for (const btn of subtabButtons) {
    const value = await btn.getAttribute('data-subtab');
    const text = await btn.textContent();
    console.log(`Subtab: ${value} = "${text}"`);
  }

  // Very basic assertion
  expect(appElement).toBeGreaterThan(0);
});
