import { test, expect } from '@playwright/test';

test('Grafana iframe fills the screen', async ({ page }) => {
  await page.goto('http://localhost:8012');

  // Click on Grafana tab
  await page.click('button[data-tab="grafana"]');

  // Wait for the iframe to be visible
  await page.waitForSelector('#grafana-iframe', { state: 'visible' });

  // Get viewport and iframe dimensions
  const viewportSize = page.viewportSize();
  const iframeBox = await page.locator('#grafana-iframe').boundingBox();

  console.log('Viewport:', viewportSize);
  console.log('Iframe box:', iframeBox);

  // Take screenshot
  await page.screenshot({
    path: 'grafana-fullscreen.png',
    fullPage: false
  });

  // Verify iframe takes up most of the available height
  // Accounting for topbar (~56px) and tab bar (~65px) = ~121px total
  if (iframeBox && viewportSize) {
    const expectedMinHeight = viewportSize.height - 150; // Allow some margin
    console.log(`Iframe height: ${iframeBox.height}, Expected min: ${expectedMinHeight}`);
    expect(iframeBox.height).toBeGreaterThan(expectedMinHeight);
  }
});