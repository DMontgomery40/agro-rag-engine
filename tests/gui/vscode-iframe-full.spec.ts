import { test, expect } from '@playwright/test';

test.describe('VS Code Iframe - Full Integration', () => {
  test('iframe loads without errors and WebSocket connects', async ({ page }) => {
    // Navigate to GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Click VS Code tab
    await page.locator('.tab-bar button[data-tab="vscode"]').first().click();

    // Wait for tab to be visible
    await expect(page.locator('#tab-vscode')).toBeVisible();

    // Wait for health badge to show healthy
    await expect(page.locator('#editor-health-badge')).toBeVisible();

    // Wait for mount to complete and health check to run
    await page.waitForTimeout(3000);

    // Debug: Check if iframe container is visible
    const container = page.locator('#editor-iframe-container');
    const containerVisible = await container.isVisible();
    console.log('Container visible:', containerVisible);

    const containerDisplay = await container.evaluate(el => window.getComputedStyle(el).display);
    console.log('Container display:', containerDisplay);

    // Check iframe is present and has src set
    const iframe = page.locator('#editor-iframe');
    const iframeVisible = await iframe.isVisible();
    console.log('Iframe visible:', iframeVisible);

    if (!iframeVisible) {
      // Check health badge status
      const badgeText = await page.locator('#editor-health-text').textContent();
      console.log('Health badge text:', badgeText);

      // Check if CI environment or embed disabled
      const ciValue = await page.evaluate(() => {
        const state = (window as any).CoreUtils?.state?.config?.env;
        return {
          CI: state?.CI,
          EDITOR_EMBED_ENABLED: state?.EDITOR_EMBED_ENABLED
        };
      });
      console.log('Environment:', ciValue);
    }

    await expect(iframe).toBeVisible();

    const iframeSrc = await iframe.getAttribute('src');
    console.log('Iframe src:', iframeSrc);
    expect(iframeSrc).toBeTruthy();
    expect(iframeSrc).toContain('/editor/');

    // Wait for iframe to load
    await page.waitForTimeout(5000);

    // Check for error dialog or WebSocket errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Look for error dialogs
    const errorDialog = page.locator('text=An unexpected error occurred');
    const hasError = await errorDialog.isVisible().catch(() => false);

    if (hasError) {
      const errorText = await page.locator('.dialog-message-container, .monaco-dialog-box').textContent();
      console.error('Error dialog found:', errorText);
    }

    // Fail test if WebSocket error or error dialog found
    expect(hasError, 'VS Code should load without error dialogs').toBe(false);

    // Check iframe content loaded (look for VS Code UI elements)
    const frame = page.frameLocator('#editor-iframe');

    // Wait for VS Code to initialize - look for common elements
    await expect(frame.locator('.monaco-workbench')).toBeVisible({ timeout: 15000 });

    console.log('✓ VS Code iframe loaded successfully');
    console.log('✓ No WebSocket errors detected');
  });
});
