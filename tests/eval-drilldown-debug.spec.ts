import { test, expect } from '@playwright/test';

test('Debug eval drill-down data', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173/web/');
  await page.waitForTimeout(2000);

  // Click RAG tab
  await page.click('text=RAG');
  await page.waitForTimeout(1000);

  // Click Evaluate subtab
  await page.click('text=Evaluate');
  await page.waitForTimeout(2000);

  // Scroll to drill-down section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Check if dropdown exists
  const dropdown = await page.locator('select').first();
  if (await dropdown.count() > 0) {
    console.log('✓ Dropdown found');

    // Get dropdown value
    const selectedValue = await dropdown.inputValue();
    console.log(`Selected run: ${selectedValue}`);
  }

  // Intercept API call to see actual data
  const apiResponse = await page.waitForResponse(
    response => response.url().includes('/api/eval/results/'),
    { timeout: 10000 }
  );

  const data = await apiResponse.json();
  console.log('API Response keys:', Object.keys(data));
  console.log('Config keys:', Object.keys(data.config || {}));
  console.log('Results count:', data.results?.length);
  if (data.results?.[2]) {
    console.log('Question 3 expect_paths:', data.results[2].expect_paths);
    console.log('Question 3 expect_paths type:', typeof data.results[2].expect_paths);
    console.log('Question 3 expect_paths is array:', Array.isArray(data.results[2].expect_paths));
  }

  // Click on question #3 to expand
  await page.click('text=Where is the FastAPI server');
  await page.waitForTimeout(1000);

  // Check if expected paths are displayed
  const expectedPathsSection = await page.locator('text=Expected Paths').first();
  await expect(expectedPathsSection).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: '/tmp/eval-drilldown-debug.png', fullPage: true });
});
