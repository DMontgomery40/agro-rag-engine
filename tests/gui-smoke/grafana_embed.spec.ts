import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

const GUI = process.env.GUI_BASE_URL || 'http://127.0.0.1:8012/gui';

test('Grafana embed: structure, sizing, and theme variables', async ({ page }) => {
  // Load GUI
  await page.goto(GUI, { waitUntil: 'domcontentloaded' });

  // Navigate to Grafana tab (promoted tab)
  const grafanaTabBtn = page.locator('button[data-tab="grafana"]');
  await expect(grafanaTabBtn).toBeVisible();
  await grafanaTabBtn.click();

  // Ensure embed container is visible and sized for 1080p view
  const wrap = page.locator('#grafana-embed');
  await expect(wrap).toBeVisible();
  const box = await wrap.boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(600);
  expect(box?.width || 0).toBeGreaterThanOrEqual(1200);

  // Click Preview to set iframe src to built URL
  const preview = page.locator('#grafana-preview');
  await expect(preview).toBeVisible();
  await preview.click();

  const iframe = page.locator('#grafana-iframe');
  await expect(iframe).toBeVisible();
  const src = await iframe.getAttribute('src');
  // We don’t require Grafana to be up; just ensure URL composed
  expect(src).toContain('/d/');
  expect(src).toContain('orgId=');
  expect(src).toContain('refresh=');

  // Theme variables present (ensure non-black accent/background)
  const colors = await page.evaluate(() => {
    const rs = getComputedStyle(document.documentElement);
    const accent = rs.getPropertyValue('--accent').trim();
    const link = rs.getPropertyValue('--link').trim();
    const bg = rs.getPropertyValue('--bg').trim();
    return { accent, link, bg };
  });
  expect(colors.accent.length).toBeGreaterThan(0);
  expect(colors.link.length).toBeGreaterThan(0);
  expect(colors.bg.length).toBeGreaterThan(0);
  expect(colors.bg.toLowerCase()).not.toBe('#000000');
});

