import { test } from '@playwright/test';

test('screenshot admin general', async ({ page }) => {
  await page.goto('http://localhost:5173/web/admin?subtab=general');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/admin-general.png', fullPage: true });
});
