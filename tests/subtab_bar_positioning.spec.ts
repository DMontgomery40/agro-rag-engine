import { test, expect } from '@playwright/test';

test.describe('Subtab Bar Positioning Fix', () => {
  test('Dashboard subtab bar does not cover content', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check that subtab bar exists
    const subtabBar = page.locator('#dashboard-subtabs.subtab-bar');
    await expect(subtabBar).toBeVisible();
    
    // Check that subtab bar is at the top of the content area
    const subtabBarBox = await subtabBar.boundingBox();
    expect(subtabBarBox).toBeTruthy();
    
    // Subtab bar should be near the top (within first 200px of viewport)
    // since it comes right after the main tab bar
    if (subtabBarBox) {
      console.log('Subtab bar Y position:', subtabBarBox.y);
      expect(subtabBarBox.y).toBeLessThan(200);
    }
    
    // Check that content below is visible and not covered
    const healthStatus = page.locator('text=HEALTH');
    if (await healthStatus.isVisible()) {
      const healthBox = await healthStatus.boundingBox();
      if (healthBox && subtabBarBox) {
        // Health status should be below the subtab bar (not overlapping)
        expect(healthBox.y).toBeGreaterThan(subtabBarBox.y + subtabBarBox.height);
      }
    }
  });
  
  test('RAG subtab bar does not cover content', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForLoadState('networkidle');
    
    // Check that RAG subtab bar exists
    const subtabBar = page.locator('#rag-subtabs.subtab-bar');
    await expect(subtabBar).toBeVisible();
    
    // Check positioning
    const subtabBarBox = await subtabBar.boundingBox();
    expect(subtabBarBox).toBeTruthy();
    
    if (subtabBarBox) {
      console.log('RAG subtab bar Y position:', subtabBarBox.y);
      // Should be near the top
      expect(subtabBarBox.y).toBeLessThan(200);
    }
  });

  test('All subtab bars use correct CSS (no sticky positioning)', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    
    const subtabBar = page.locator('#dashboard-subtabs.subtab-bar');
    const position = await subtabBar.evaluate(el => window.getComputedStyle(el).position);
    
    // Should NOT be sticky
    console.log('Subtab bar position style:', position);
    expect(position).not.toBe('sticky');
    expect(position).not.toBe('fixed');
    expect(position).toBe('static'); // or 'relative', but not sticky/fixed
  });
});
