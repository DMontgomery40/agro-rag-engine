import { test, expect } from '@playwright/test';

test('capture console errors', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logs: string[] = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
      console.log(`[ERROR] ${text}`);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log(`[WARN] ${text}`);
    } else {
      logs.push(text);
      console.log(`[LOG] ${text}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    errors.push(error.message);
  });

  try {
    await page.goto('http://localhost:3000', { timeout: 10000 });
    await page.waitForTimeout(5000);

    const rootContent = await page.locator('#root').innerHTML();
    console.log(`\n=== ROOT CONTENT ===\n${rootContent.substring(0, 500)}\n`);

    console.log(`\n=== ERRORS (${errors.length}) ===`);
    errors.forEach(e => console.log(e));

    console.log(`\n=== WARNINGS (${warnings.length}) ===`);
    warnings.forEach(w => console.log(w));

  } catch (e: any) {
    console.log(`Navigation error: ${e.message}`);
  }

  expect(true).toBe(true);
});
