import { test, expect } from '@playwright/test';

test('Eval drill-down comparison feature smoke test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173/web/');
  await page.waitForTimeout(2000);

  // Click RAG tab
  await page.click('text=RAG');
  await page.waitForTimeout(1000);

  // Click Evaluate subtab
  await page.click('text=Evaluate');
  await page.waitForTimeout(2000);

  // Scroll down to the drill-down section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Check for the two dropdown selectors
  const primaryRunDropdown = page.locator('select').first();
  const compareRunDropdown = page.locator('select').nth(1);

  // Verify both dropdowns exist
  await expect(primaryRunDropdown).toBeVisible();
  await expect(compareRunDropdown).toBeVisible();

  // Check for the labels
  await expect(page.locator('text=PRIMARY RUN (AFTER)')).toBeVisible();
  await expect(page.locator('text=COMPARE WITH (BEFORE)')).toBeVisible();

  // Select a run from the first dropdown
  const firstRunOption = await primaryRunDropdown.locator('option').nth(1).textContent();
  if (firstRunOption) {
    await primaryRunDropdown.selectOption({ index: 1 });
    await page.waitForTimeout(1500);

    // Check if EvalDrillDown component loaded
    await expect(page.locator('text=Top-1 Accuracy')).toBeVisible();
    await expect(page.locator('text=Top-K Accuracy')).toBeVisible();

    console.log('✓ Primary run selected and drill-down loaded');

    // Now select a comparison run if available
    const compareOptions = await compareRunDropdown.locator('option').count();
    if (compareOptions > 1) {
      await compareRunDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(1500);

      // Check if config diff section appears
      const configDiffSection = page.locator('text=CONFIGURATION CHANGES — ONLY WHAT\'S DIFFERENT');
      if (await configDiffSection.isVisible()) {
        console.log('✓ Config diff section visible!');

        // Check for BEFORE/AFTER labels
        await expect(page.locator('text=BEFORE:')).toBeVisible();
        await expect(page.locator('text=AFTER:')).toBeVisible();

        console.log('✓ Comparison feature working!');
      } else {
        console.log('ℹ No config changes between selected runs (both might be identical)');
      }
    } else {
      console.log('ℹ Only one eval run available, cannot test comparison feature');
    }
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/eval-drilldown-comparison.png', fullPage: true });
  console.log('✓ Screenshot saved to /tmp/eval-drilldown-comparison.png');
});
