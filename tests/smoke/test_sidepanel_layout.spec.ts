import { test, expect } from '@playwright/test';

/**
 * Test that sidepanel is side-by-side on desktop, not stacked underneath
 */

test('sidepanel should be beside content on desktop viewport', async ({ page }) => {
  // Set desktop viewport
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://127.0.0.1:8012');
  await page.waitForLoadState('networkidle');

  // Get positions of content and sidepanel
  const contentBox = await page.locator('.content').boundingBox();
  const sidepanelBox = await page.locator('.sidepanel').boundingBox();

  expect(contentBox).toBeTruthy();
  expect(sidepanelBox).toBeTruthy();

  // On desktop, sidepanel should be to the RIGHT of content (higher x position)
  // Not below it (same x, higher y)
  expect(sidepanelBox!.x).toBeGreaterThan(contentBox!.x);

  // And they should overlap vertically (start at similar y positions)
  expect(Math.abs(sidepanelBox!.y - contentBox!.y)).toBeLessThan(100);

  console.log('✓ Sidepanel is correctly positioned beside content on desktop');
});

test('sidepanel should stack below on mobile viewport', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('http://127.0.0.1:8012');
  await page.waitForLoadState('networkidle');

  // Get positions
  const contentBox = await page.locator('.content').boundingBox();
  const sidepanelBox = await page.locator('.sidepanel').boundingBox();

  expect(contentBox).toBeTruthy();
  expect(sidepanelBox).toBeTruthy();

  // On mobile, sidepanel should be BELOW content (higher y position, similar x)
  expect(sidepanelBox!.y).toBeGreaterThan(contentBox!.y);
  expect(Math.abs(sidepanelBox!.x - contentBox!.x)).toBeLessThan(50);

  console.log('✓ Sidepanel correctly stacks below content on mobile');
});
