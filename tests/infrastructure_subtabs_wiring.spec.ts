import { test, expect } from '@playwright/test';

test.describe('Infrastructure Subtabs Wiring', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Infrastructure tab
    await page.goto('http://localhost:8012');
    await page.waitForLoadState('networkidle');

    // Click Infrastructure tab using data attribute (not mobile nav)
    const infraButton = page.locator('[data-tab="infrastructure"]:not([data-nav="mobile"])');
    await infraButton.click();
    await page.waitForTimeout(500);
  });

  test('MCP Subtab - Check status and save settings', async ({ page }) => {
    // Wait for subtab navigation to be available
    await page.waitForSelector('[data-subtab="mcp"]', { timeout: 10000 });

    // Click MCP subtab
    await page.click('[data-subtab="mcp"]');
    await page.waitForTimeout(1000);

    // Wait for MCP content heading to appear
    await page.waitForSelector('text=MCP Server Connection Status', { timeout: 10000 });

    // Verify status is displayed (either connected or disconnected)
    const statusElement = page.locator('text=/CONNECTED|DISCONNECTED/');
    await expect(statusElement).toBeVisible();

    // Click "Check Status" button
    await page.click('button:has-text("Check Status")');
    await page.waitForTimeout(1000);

    // Verify the Test Connection button exists
    await expect(page.locator('button:has-text("Test Connection")')).toBeVisible();

    // Click Test Connection
    await page.click('button:has-text("Test Connection")');
    await page.waitForTimeout(1500);

    // Verify test result appears (should show either connected or not running)
    const testResult = page.locator('text=/Connected|Not running|Connection failed/');
    await expect(testResult).toBeVisible({ timeout: 3000 });

    // Test save settings
    const serverUrlInput = page.locator('input[placeholder*="8013"]');
    await serverUrlInput.fill('http://127.0.0.1:8013/mcp');

    // Click Save Settings
    await page.click('button:has-text("Save Settings")');

    // Wait for save operation
    await page.waitForTimeout(1000);

    // Verify alert appears (Playwright will automatically handle alert dialogs)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('saved successfully');
      await dialog.accept();
    });
  });

  test('Paths Subtab - Load and save infrastructure config', async ({ page }) => {
    // Click Paths subtab
    await page.click('[data-subtab="paths"]');
    await page.waitForTimeout(1000);

    // Wait for config to load
    await page.waitForSelector('text=Infrastructure Configuration', { timeout: 5000 });

    // Verify all input sections are visible
    await expect(page.locator('text=Database Endpoints')).toBeVisible();
    await expect(page.locator('text=Repository Configuration')).toBeVisible();
    await expect(page.locator('text=Directory Paths')).toBeVisible();
    await expect(page.locator('text=Storage Configuration')).toBeVisible();
    await expect(page.locator('text=MCP HTTP Configuration')).toBeVisible();

    // Test QDRANT_URL input
    const qdrantInput = page.locator('input[placeholder*="6333"]');
    await expect(qdrantInput).toBeVisible();
    const currentQdrantValue = await qdrantInput.inputValue();

    // Make a small change to test save
    await qdrantInput.fill('http://127.0.0.1:6333');

    // Test REDIS_URL input
    const redisInput = page.locator('input[placeholder*="6379"]');
    await expect(redisInput).toBeVisible();
    await redisInput.fill('redis://127.0.0.1:6379/0');

    // Test REPO input
    const repoInput = page.locator('input[placeholder="agro"]');
    await expect(repoInput).toBeVisible();
    await repoInput.fill('agro');

    // Scroll to save button
    const saveButton = page.locator('button:has-text("Save Configuration")');
    await saveButton.scrollIntoViewIfNeeded();

    // Click Save Configuration
    await saveButton.click();

    // Wait for save operation
    await page.waitForTimeout(1500);

    // Verify alert appears
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('saved successfully');
      await dialog.accept();
    });

    // Reload page and verify values persist
    await page.reload();
    await page.waitForLoadState('networkidle');
    const infraButton = page.locator('[data-tab="infrastructure"]:not([data-nav="mobile"])');
    await infraButton.click();
    await page.waitForTimeout(500);
    await page.click('[data-subtab="paths"]');
    await page.waitForTimeout(1000);

    // Verify saved values are loaded
    const reloadedQdrantInput = page.locator('input[placeholder*="6333"]');
    await expect(reloadedQdrantInput).toHaveValue('http://127.0.0.1:6333');
  });

  test('Monitoring Subtab - Load and save alert thresholds', async ({ page }) => {
    // Click Monitoring subtab
    await page.click('[data-subtab="monitoring"]');
    await page.waitForTimeout(1000);

    // Wait for alert config to load
    await page.waitForSelector('text=Performance & Reliability Alerts', { timeout: 5000 });

    // Verify all alert sections are visible
    await expect(page.locator('text=Performance Thresholds')).toBeVisible();
    await expect(page.locator('text=API Anomaly Alerts')).toBeVisible();
    await expect(page.locator('text=Grafana Metrics')).toBeVisible();

    // Test error rate threshold input
    const errorRateInput = page.locator('input[type="number"]').first();
    await expect(errorRateInput).toBeVisible();
    const currentValue = await errorRateInput.inputValue();
    console.log('Current error rate threshold:', currentValue);

    // Change error rate threshold
    await errorRateInput.fill('7.5');

    // Test latency P99 input
    const latencyInputs = page.locator('input[type="number"]');
    const latencyP99Input = latencyInputs.nth(1);
    await latencyP99Input.fill('8.0');

    // Test timeout errors input
    const timeoutInput = latencyInputs.nth(2);
    await timeoutInput.fill('15');

    // Test rate limit errors input
    const rateLimitInput = latencyInputs.nth(3);
    await rateLimitInput.fill('8');

    // Test endpoint call frequency
    const endpointFreqInput = latencyInputs.nth(4);
    await endpointFreqInput.fill('12');

    // Test sustained duration
    const sustainedInput = latencyInputs.nth(5);
    await sustainedInput.fill('3');

    // Test cohere rerank calls
    const cohereInput = latencyInputs.nth(6);
    await cohereInput.fill('25');

    // Scroll to save button
    const saveButton = page.locator('button:has-text("Save Alert Configuration")');
    await saveButton.scrollIntoViewIfNeeded();

    // Click Save Alert Configuration
    await saveButton.click();

    // Wait for save operation
    await page.waitForTimeout(1500);

    // Verify alert appears
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('saved successfully');
      await dialog.accept();
    });

    // Reload page and verify values persist
    await page.reload();
    await page.waitForLoadState('networkidle');
    const infraButtonReload = page.locator('[data-tab="infrastructure"]:not([data-nav="mobile"])');
    await infraButtonReload.click();
    await page.waitForTimeout(500);
    await page.click('[data-subtab="monitoring"]');
    await page.waitForTimeout(1000);

    // Verify saved values are loaded
    const reloadedErrorRateInput = page.locator('input[type="number"]').first();
    await expect(reloadedErrorRateInput).toHaveValue('7.5');
  });

  test('All Subtabs - Navigation and state persistence', async ({ page }) => {
    // Test navigation between all subtabs
    const subtabs = ['mcp', 'paths', 'monitoring'];

    for (const subtab of subtabs) {
      await page.click(`[data-subtab="${subtab}"]`);
      await page.waitForTimeout(500);

      // Verify subtab content is visible
      const subtabContent = page.locator('.settings-section');
      await expect(subtabContent).toBeVisible();
    }

    // Navigate back to MCP and verify it's still functional
    await page.click('[data-subtab="mcp"]');
    await page.waitForTimeout(500);
    await expect(page.locator('text=MCP HTTP Server')).toBeVisible();

    // Navigate to Paths and verify it's still functional
    await page.click('[data-subtab="paths"]');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Database Endpoints')).toBeVisible();

    // Navigate to Monitoring and verify it's still functional
    await page.click('[data-subtab="monitoring"]');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Performance Thresholds')).toBeVisible();
  });

  test('MCP Subtab - Start/Stop server functionality', async ({ page }) => {
    // Click MCP subtab
    await page.click('[data-subtab="mcp"]');
    await page.waitForTimeout(500);

    // Wait for status check
    await page.waitForSelector('text=MCP HTTP Server', { timeout: 5000 });

    // Check if server is running
    const disconnectedButton = page.locator('button:has-text("Start Server")');
    const connectedStopButton = page.locator('button:has-text("Stop Server")');
    const connectedRestartButton = page.locator('button:has-text("Restart")');

    const isDisconnected = await disconnectedButton.isVisible();

    if (isDisconnected) {
      // Test start server
      await disconnectedButton.click();
      await page.waitForTimeout(3000);

      // Verify alert or status change
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Check status changed
      await page.click('button:has-text("Check Status")');
      await page.waitForTimeout(1000);
    } else {
      // Test restart server
      const restartVisible = await connectedRestartButton.isVisible();
      if (restartVisible) {
        await connectedRestartButton.click();
        await page.waitForTimeout(3000);

        page.on('dialog', async dialog => {
          await dialog.accept();
        });
      }
    }
  });
});
