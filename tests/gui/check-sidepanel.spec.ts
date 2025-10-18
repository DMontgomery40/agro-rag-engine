import { test, expect } from '@playwright/test';

test('Check sidepanel layout', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:8012');

  // Wait for the layout to load
  await page.waitForSelector('.layout');

  // Check viewport size
  const viewportSize = page.viewportSize();
  console.log('Viewport size:', viewportSize);

  // Check computed styles
  const layoutStyle = await page.locator('.layout').evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      display: computed.display,
      gridTemplateColumns: computed.gridTemplateColumns,
      width: computed.width,
      height: computed.height
    };
  });
  console.log('Layout computed style:', layoutStyle);

  const contentStyle = await page.locator('.content').evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      gridColumn: computed.gridColumn,
      gridColumnStart: computed.gridColumnStart,
      gridColumnEnd: computed.gridColumnEnd
    };
  });
  console.log('Content computed style:', contentStyle);

  const sidepanelStyle = await page.locator('.sidepanel').evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      gridColumn: computed.gridColumn,
      gridColumnStart: computed.gridColumnStart,
      gridColumnEnd: computed.gridColumnEnd
    };
  });
  console.log('Sidepanel computed style:', sidepanelStyle);

  // Find where sidepanel actually is
  const sidepanelParent = await page.locator('.sidepanel').evaluate((el) => {
    const parent = el.parentElement;
    return {
      tagName: parent?.tagName,
      className: parent?.className,
      id: parent?.id
    };
  });
  console.log('Sidepanel parent element:', sidepanelParent);

  // Take a screenshot
  await page.screenshot({
    path: 'sidepanel-check.png',
    fullPage: false
  });

  // Get their bounding boxes
  const contentBox = await page.locator('.content').boundingBox();
  const sidepanelBox = await page.locator('.sidepanel').boundingBox();

  console.log('Content box:', contentBox);
  console.log('Sidepanel box:', sidepanelBox);
});