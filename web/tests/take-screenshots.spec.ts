import { test } from '@playwright/test';

test('Take screenshots of each tab for visual inspection', async ({ page }) => {
  const BASE_URL = 'http://localhost:3002';

  // Navigate to app
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Dashboard
  await page.screenshot({ path: '/tmp/1-dashboard.png', fullPage: true });

  // Docker
  await page.click('text=Docker');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/2-docker.png', fullPage: true });

  // Chat
  await page.click('text=Chat');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/3-chat.png', fullPage: true });

  // RAG (keyword manager)
  await page.click('text=RAG');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/4-rag-with-keyword-manager.png', fullPage: true });

  // Profiles
  await page.click('text=Profiles');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/5-profiles.png', fullPage: true });

  // Infrastructure
  await page.click('text=Infrastructure');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/6-infrastructure.png', fullPage: true });

  // Admin
  await page.click('text=Admin');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/7-admin.png', fullPage: true });

  console.log('✓ Screenshots captured to /tmp/');
});
