import { test, expect } from '@playwright/test';

test('Debug: Check what is actually rendering', async ({ page }) => {
  const BASE_URL = 'http://localhost:3002';

  // Set up logging
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // Navigate
  console.log('Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Wait a bit for content to render
  await page.waitForTimeout(3000);

  // Get page content
  const html = await page.content();
  const bodyText = await page.locator('body').textContent();

  // Screenshot
  await page.screenshot({ path: '/tmp/app-debug.png' });

  console.log('=== PAGE STRUCTURE ===');
  console.log('HTML length:', html.length);
  console.log('Body text length:', bodyText.length);
  console.log('Body text (first 500 chars):', bodyText.substring(0, 500));

  console.log('=== ELEMENTS ===');
  const navElements = await page.locator('[role="navigation"]').count();
  console.log('Elements with role="navigation":', navElements);

  const navTags = await page.locator('nav').count();
  console.log('Nav tags:', navTags);

  const links = await page.locator('a').count();
  console.log('Total links:', links);

  const root = await page.locator('#root').count();
  console.log('Root div exists:', root);

  const app = await page.locator('[class*="app"], [id*="app"]').count();
  console.log('App-like elements:', app);

  console.log('=== ERRORS ===');
  console.log(logs.join('\n'));

  // Dump first 2KB of HTML
  console.log('=== HTML DUMP ===');
  console.log(html.substring(0, 2000));

  expect(bodyText.length).toBeGreaterThan(0);
});
