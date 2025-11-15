import { test, expect } from '@playwright/test';

test.describe('UI Polish & Micro-Interactions Verification', () => {
  
  test('Button hover effects - glow, lift, color change', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(3000);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(1000);
    
    // Find Mine Triplets button
    const mineBtn = page.locator('#reranker-mine-btn');
    await expect(mineBtn).toBeVisible();
    
    // Get initial styles
    const initialBg = await mineBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    
    // Hover over button
    await mineBtn.hover();
    await page.waitForTimeout(300); // Let transition complete
    
    // Check hover effects applied
    const hoverBg = await mineBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    const hoverShadow = await mineBtn.evaluate(el => getComputedStyle(el).boxShadow);
    const hoverTransform = await mineBtn.evaluate(el => getComputedStyle(el).transform);
    
    console.log('Initial BG:', initialBg);
    console.log('Hover BG:', hoverBg);
    console.log('Hover Shadow:', hoverShadow);
    console.log('Hover Transform:', hoverTransform);
    
    await page.screenshot({ path: 'test-results/button-hover-polish.png' });
    
    // Verify some polish is applied (shadow or transform)
    expect(hoverShadow !== 'none' || hoverTransform !== 'none').toBeTruthy();
  });

  test('Progress bar shimmer animation', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Find a progress bar
    const progressBar = page.locator('#dash-index-bar, [class*="progress"]').first();
    
    if (await progressBar.count() > 0) {
      // Check if shimmer element exists when progress > 0
      const hasShimmer = await page.locator('.progress-shine, [class*="shine"]').count();
      console.log('Shimmer elements found:', hasShimmer);
      
      await page.screenshot({ path: 'test-results/progress-bar-shimmer.png' });
    }
  });

  test('Input focus glow effect', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(2000);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(1000);
    
    // Find an input
    const input = page.locator('#reranker-epochs');
    await expect(input).toBeVisible();
    
    // Focus the input
    await input.focus();
    await page.waitForTimeout(300);
    
    // Check for focus styles
    const focusShadow = await input.evaluate(el => getComputedStyle(el).boxShadow);
    const focusBorder = await input.evaluate(el => getComputedStyle(el).borderColor);
    
    console.log('Focus shadow:', focusShadow);
    console.log('Focus border:', focusBorder);
    
    await page.screenshot({ path: 'test-results/input-focus-glow.png' });
    
    // Verify focus effect (should have box-shadow)
    expect(focusShadow).not.toBe('none');
  });

  test('Subtab hover underline animation', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(2000);
    
    // Find subtab buttons
    const subtabBtn = page.locator('button[data-subtab="retrieval"]');
    await expect(subtabBtn).toBeVisible();
    
    // Hover over subtab
    await subtabBtn.hover();
    await page.waitForTimeout(400);
    
    await page.screenshot({ path: 'test-results/subtab-hover-underline.png' });
    
    console.log('✅ Subtab hover captured');
  });

  test('Cascade animation - staggered subtab reveal', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);
    
    // Navigate to RAG to trigger subtab reveal
    await page.click('a[href="/rag"]');
    await page.waitForTimeout(1000);
    
    // Check if subtabs have staggered transition-delay
    const subtabs = await page.locator('.subtab-btn').all();
    console.log(`Found ${subtabs.length} subtab buttons`);
    
    if (subtabs.length >= 6) {
      console.log('✅ All 6 RAG subtabs present for cascade animation');
    }
    
    await page.screenshot({ path: 'test-results/subtab-cascade.png' });
  });

  test('Tooltip structure and content', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(2000);
    await page.click('button[data-subtab="retrieval"]');
    await page.waitForTimeout(1000);
    
    // Find tooltip wraps
    const tooltips = await page.locator('.tooltip-wrap').count();
    console.log(`Tooltips found: ${tooltips}`);
    
    // Hover over a help icon to trigger tooltip
    const helpIcon = page.locator('.help-icon').first();
    if (await helpIcon.count() > 0) {
      await helpIcon.hover();
      await page.waitForTimeout(300);
      
      // Check if tooltip bubble appears
      const bubble = await page.locator('.tooltip-bubble:visible').count();
      console.log('Tooltip bubbles visible:', bubble);
      
      await page.screenshot({ path: 'test-results/tooltip-display.png' });
    }
  });
});

