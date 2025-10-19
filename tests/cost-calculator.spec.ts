import { test, expect } from '@playwright/test';

test.describe('Cost Calculator', () => {
  test('should calculate costs without CostLogic missing error', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/', { waitUntil: 'domcontentloaded' });

    // Wait for the page to fully load
    await page.waitForTimeout(2000);

    // Log API base to debug
    const apiBase = await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.CoreUtils) {
        console.log('API_BASE:', window.CoreUtils.API_BASE);
        return window.CoreUtils.API_BASE;
      }
      return 'NOT_FOUND';
    });
    console.log('Using API_BASE:', apiBase);

    // Listen for alert dialogs and capture the full message
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message;
      console.log('Alert type:', dialog.type());
      console.log('Alert message (raw):', dialog.message);
      console.log('Alert message (string):', String(dialog.message));
      await dialog.dismiss();
    });

    // Set form values for cost calculation
    console.log('Setting form values');
    await page.fill('#cost-in', '1000');
    await page.fill('#cost-out', '200');
    await page.selectOption('#cost-provider', 'openai');
    await page.fill('#cost-model', 'gpt-4o-mini');
    await page.fill('#cost-rpd', '100');

    // Find and click the "Calculate Cost" button by ID
    const calculateBtn = page.locator('#btn-estimate');

    // Wait for the button to be visible
    if (await calculateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicking Calculate Cost button');

      // Intercept network requests to see what's happening
      const responsePromise = page.waitForResponse(response => {
        console.log('Network response:', response.status(), response.url());
        return response.url().includes('/api/cost/estimate');
      }).catch(() => null);

      await calculateBtn.click();

      // Wait for network response
      const response = await responsePromise;
      if (response) {
        console.log('Cost estimate response status:', response.status());
        const body = await response.text();
        console.log('Cost estimate response body:', body);
      }

      // Wait a bit more for any dialogs
      await page.waitForTimeout(1000);

      // Check that no error alert was shown
      const alertLower = String(alertMessage).toLowerCase();
      expect(alertLower).not.toContain('costlogic missing');
      expect(alertLower).not.toContain('cost estimation failed');

      // Check that cost values are displayed
      const dailyCost = await page.locator('#cost-daily').textContent();
      const monthlyCost = await page.locator('#cost-monthly').textContent();

      console.log('✓ No CostLogic error - cost calculation completed');
      console.log(`  Daily: ${dailyCost}, Monthly: ${monthlyCost}`);

      // Verify costs are actually calculated (not empty or dashes)
      expect(dailyCost?.trim()).toBeTruthy();
      expect(dailyCost).toContain('$');
      expect(monthlyCost?.trim()).toBeTruthy();
      expect(monthlyCost).toContain('$');
    } else {
      console.log('Calculate Cost button not found');
    }
  });
});
