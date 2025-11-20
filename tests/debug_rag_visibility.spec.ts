import { test, expect } from '@playwright/test';

test.describe('Debug RAG Tab Visibility', () => {
  test('Check what is actually rendered and why it is hidden', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForLoadState('networkidle');

    // Wait a bit for JavaScript modules to load
    await page.waitForTimeout(2000);

    // Check if element exists
    const ragTab = page.locator('#tab-rag');
    const count = await ragTab.count();
    console.log(`#tab-rag count: ${count}`);

    if (count > 0) {
      // Get the actual HTML
      const html = await ragTab.evaluate(el => el.outerHTML.substring(0, 200));
      console.log(`#tab-rag HTML: ${html}...`);

      // Get computed styles
      const display = await ragTab.evaluate(el => window.getComputedStyle(el).display);
      const visibility = await ragTab.evaluate(el => window.getComputedStyle(el).visibility);
      const opacity = await ragTab.evaluate(el => window.getComputedStyle(el).opacity);
      const className = await ragTab.getAttribute('class');

      console.log(`display: ${display}`);
      console.log(`visibility: ${visibility}`);
      console.log(`opacity: ${opacity}`);
      console.log(`className: ${className}`);

      // Check if parent is visible
      const parent = await ragTab.evaluate(el => {
        const p = el.parentElement;
        return p ? {
          tagName: p.tagName,
          id: p.id,
          className: p.className,
          display: window.getComputedStyle(p).display
        } : null;
      });
      console.log(`Parent:`, parent);
    }

    // Also check what route React Router thinks we're on
    const location = await page.evaluate(() => window.location.pathname);
    console.log(`Current path: ${location}`);
  });
});
