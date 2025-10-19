import { test, expect } from '@playwright/test';

test.describe('VS Code WebSocket Connection', () => {
  test('VS Code workbench loads without WebSocket 1006 errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Click VS Code tab
    await page.locator('.tab-bar button[data-tab="vscode"]').first().click();

    // Wait for iframe to be visible with src
    const iframe = page.locator('#editor-iframe');
    await expect(iframe).toBeVisible({ timeout: 10000 });

    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBeTruthy();
    console.log('Iframe src:', iframeSrc);

    console.log('Waiting for VS Code to fully load...');

    // Wait longer for VS Code to initialize
    await page.waitForTimeout(15000);

    // Try to access iframe content to check for error dialog
    const frame = page.frameLocator('#editor-iframe');

    // Check for the specific error dialog
    const errorDialog = frame.locator('text=An unexpected error occurred');
    const hasErrorDialog = await errorDialog.isVisible().catch(() => false);

    if (hasErrorDialog) {
      // Get the error message
      const errorMessage = await frame.locator('.dialog-message-container, .monaco-dialog-box').textContent().catch(() => 'Could not read error');
      console.error('❌ VS Code Error Dialog:', errorMessage);
      expect(hasErrorDialog, `VS Code should not show error dialog. Got: ${errorMessage}`).toBe(false);
    }

    // Check for WebSocket 1006 in console
    const ws1006Errors = consoleErrors.filter(e => e.includes('1006') || e.includes('WebSocket'));
    if (ws1006Errors.length > 0) {
      console.error('❌ WebSocket errors found:', ws1006Errors);
      expect(ws1006Errors.length, `Should not have WebSocket 1006 errors. Found: ${ws1006Errors.join(', ')}`).toBe(0);
    }

    // Look for the Monaco workbench as a sign of successful load
    const workbench = frame.locator('.monaco-workbench');
    const workbenchVisible = await workbench.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('Workbench visible:', workbenchVisible);

    expect(workbenchVisible, 'VS Code workbench should be visible').toBe(true);

    console.log('✓ VS Code loaded successfully without WebSocket errors');
  });
});
