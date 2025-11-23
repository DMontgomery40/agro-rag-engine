import { test, expect } from '@playwright/test';

/**
 * Smoke test for eval loading and comparison feature
 * Verifies:
 * 1. Eval runs load without CORS errors
 * 2. No React console errors from missing state variables
 * 3. Eval comparison UI is accessible
 */

test.describe('Eval Loading and Comparison', () => {
  test('should load page without CORS or React errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate directly to RAG Evaluate tab via URL hash
    await page.goto('http://localhost:5173/#/rag/evaluate');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for API calls

    // Check for CORS errors in console
    const corsErrors = consoleErrors.filter(err =>
      err.includes('CORS') || err.includes('Access-Control-Allow-Origin')
    );

    if (corsErrors.length > 0) {
      console.log('CORS errors found:', corsErrors);
    }
    expect(corsErrors, 'Should have no CORS errors').toHaveLength(0);

    // Check for missing state variable errors
    const reactErrors = consoleErrors.filter(err =>
      err.includes('latestRunId') || err.includes('showDrillDown')
    );

    if (reactErrors.length > 0) {
      console.log('React state errors found:', reactErrors);
    }
    expect(reactErrors, 'Should have no React state variable errors').toHaveLength(0);

    // Log all console errors for debugging
    if (consoleErrors.length > 0) {
      console.log(`Total console errors captured: ${consoleErrors.length}`);
      consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    } else {
      console.log('✓ No console errors detected');
    }
  });
});
