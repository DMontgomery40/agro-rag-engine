import { test, expect } from '@playwright/test';

test.describe('VS Code Workspace Trust', () => {
  test('workspace trust prompt should NOT appear', async ({ page }) => {
    // Navigate to GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Click VS Code tab
    await page.locator('.tab-bar button[data-tab="vscode"]').first().click();

    // Wait for VS Code to load
    await page.waitForTimeout(10000);

    // Check for the workspace trust dialog
    const frame = page.frameLocator('#editor-iframe');

    // Look for trust prompt
    const trustPrompt = frame.locator('text=Do you trust the authors of the files in this folder?');
    const hasTrustPrompt = await trustPrompt.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTrustPrompt) {
      console.error('❌ Workspace trust prompt is still appearing');
      const promptText = await frame.locator('.monaco-dialog-box').textContent().catch(() => 'Could not read');
      console.error('Prompt content:', promptText);
    } else {
      console.log('✓ No workspace trust prompt - settings persisted correctly');
    }

    expect(hasTrustPrompt, 'Workspace trust prompt should not appear (security.workspace.trust.enabled = false)').toBe(false);

    // Verify workbench is accessible
    const workbench = frame.locator('.monaco-workbench');
    await expect(workbench).toBeVisible({ timeout: 10000 });

    console.log('✓ VS Code workbench loaded without trust prompt');
  });
});
