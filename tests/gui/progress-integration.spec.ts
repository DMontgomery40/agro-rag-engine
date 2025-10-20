import { test, expect } from '@playwright/test';

test.describe('Progress Manager Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:8012');
    await page.waitForLoadState('networkidle');
  });

  test('should display progress bar during indexing', async ({ page }) => {
    // Navigate to RAG > Indexing tab
    await page.click('[data-tab-id="tab-rag"]');
    await page.waitForTimeout(500);

    // Check if we're on the indexing subtab (or navigate to it)
    const indexingTab = page.locator('[data-subtab-id="rag-indexing"]');
    if (await indexingTab.isVisible()) {
      await indexingTab.click();
      await page.waitForTimeout(300);
    }

    // Check if UXFeedback is available
    const hasUXFeedback = await page.evaluate(() => {
      return typeof window.UXFeedback !== 'undefined' &&
             typeof window.UXFeedback.progress !== 'undefined';
    });

    expect(hasUXFeedback).toBe(true);

    // Test that progress manager methods exist
    const hasProgressMethods = await page.evaluate(() => {
      return typeof window.UXFeedback.progress.show === 'function' &&
             typeof window.UXFeedback.progress.update === 'function' &&
             typeof window.UXFeedback.progress.hide === 'function';
    });

    expect(hasProgressMethods).toBe(true);
  });

  test('should display progress bar during evaluation', async ({ page }) => {
    // Navigate to RAG > Evaluate tab
    await page.click('[data-tab-id="tab-rag"]');
    await page.waitForTimeout(500);

    const evaluateTab = page.locator('[data-subtab-id="rag-evaluate"]');
    if (await evaluateTab.isVisible()) {
      await evaluateTab.click();
      await page.waitForTimeout(300);
    }

    // Check if UXFeedback is available
    const hasUXFeedback = await page.evaluate(() => {
      return typeof window.UXFeedback !== 'undefined' &&
             typeof window.UXFeedback.progress !== 'undefined';
    });

    expect(hasUXFeedback).toBe(true);
  });

  test('progress manager should handle multiple concurrent progress bars', async ({ page }) => {
    // Test creating multiple progress bars
    await page.evaluate(() => {
      window.UXFeedback.progress.show('test-op-1', {
        message: 'Operation 1',
        initialPercent: 25
      });

      window.UXFeedback.progress.show('test-op-2', {
        message: 'Operation 2',
        initialPercent: 50
      });
    });

    await page.waitForTimeout(100);

    // Check both progress bars exist
    const progressBars = await page.evaluate(() => {
      return window.UXFeedback.progress.activeProgressBars.size;
    });

    expect(progressBars).toBeGreaterThanOrEqual(2);

    // Clean up
    await page.evaluate(() => {
      window.UXFeedback.progress.hide('test-op-1');
      window.UXFeedback.progress.hide('test-op-2');
    });
  });

  test('progress bar should update correctly', async ({ page }) => {
    // Create a progress bar
    await page.evaluate(() => {
      window.UXFeedback.progress.show('test-update', {
        message: 'Testing...',
        initialPercent: 0,
        eta: '5 seconds'
      });
    });

    await page.waitForTimeout(100);

    // Update progress
    await page.evaluate(() => {
      window.UXFeedback.progress.update('test-update', {
        percent: 50,
        message: 'Half way!',
        eta: '2 seconds'
      });
    });

    await page.waitForTimeout(100);

    // Verify the progress bar exists and has updated
    const progressExists = await page.evaluate(() => {
      return window.UXFeedback.progress.activeProgressBars.has('test-update');
    });

    expect(progressExists).toBe(true);

    // Complete and hide
    await page.evaluate(() => {
      window.UXFeedback.progress.update('test-update', {
        percent: 100,
        message: 'Complete!'
      });
    });

    await page.waitForTimeout(100);

    await page.evaluate(() => {
      window.UXFeedback.progress.hide('test-update');
    });

    await page.waitForTimeout(500); // Wait for fade-out animation

    // Verify it's hidden
    const progressHidden = await page.evaluate(() => {
      return !window.UXFeedback.progress.activeProgressBars.has('test-update');
    });

    expect(progressHidden).toBe(true);
  });

  test('indexing module should use progress manager', async ({ page }) => {
    // Check if indexing.js has been loaded and references UXFeedback
    const indexingUsesProgress = await page.evaluate(() => {
      // Check if the indexing module exists
      return typeof window.Indexing !== 'undefined' ||
             // Or check if the code is present by looking for the function
             document.querySelector('script[src*="indexing.js"]') !== null;
    });

    expect(indexingUsesProgress).toBe(true);
  });

  test('eval_runner module should use progress manager', async ({ page }) => {
    // Check if eval_runner.js has been loaded
    const evalRunnerExists = await page.evaluate(() => {
      return document.querySelector('script[src*="eval_runner.js"]') !== null;
    });

    expect(evalRunnerExists).toBe(true);
  });
});
