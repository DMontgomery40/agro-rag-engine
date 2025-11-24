import { test, expect } from '@playwright/test';

test('Basic smoke test - app renders and API is healthy', async ({ page }) => {
  // Test API health
  const response = await page.request.get('http://127.0.0.1:8012/api/health');
  expect(response.ok()).toBeTruthy();
  const health = await response.json();
  expect(health.status).toBe('healthy');

  // Test frontend loads (React app on /web/dashboard)
  await page.goto('http://127.0.0.1:5173/web/dashboard');
  
  // Wait for app to render
  await page.waitForSelector('body', { timeout: 10000 });
  
  // Check that we don't have a blank screen
  const bodyText = await page.textContent('body');
  expect(bodyText).not.toBe('');
  
  // Check for dashboard or main content
  const hasContent = await page.locator('.dashboard, #root, [class*="Dashboard"]').count();
  expect(hasContent).toBeGreaterThan(0);

  console.log('✓ Basic smoke test passed - app is rendering');
});

test('Qdrant connection test', async ({ page }) => {
  // Test Qdrant directly
  const response = await page.request.get('http://127.0.0.1:6333/collections');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.result).toBeDefined();
  expect(data.result.collections).toBeDefined();
  
  console.log(`✓ Qdrant has ${data.result.collections.length} collection(s)`);
});

