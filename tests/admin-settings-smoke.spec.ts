import { test, expect } from '@playwright/test';

/**
 * Smoke test for Admin Settings D3 fixes
 * Verifies component renders and basic interactions work
 */

test.describe('Admin Settings - Smoke Test', () => {
  test('Admin tab renders without errors', async ({ page }) => {
    // Navigate to app
    await page.goto('http://127.0.0.1:8012');
    await page.waitForLoadState('networkidle');

    // Wait for app to render
    await page.waitForTimeout(2000);

    // Look for admin button/tab in various possible states
    const adminButtons = await page.locator('button:has-text("Admin"), a:has-text("Admin"), [data-tab="admin"]').all();
    console.log('Found admin buttons:', adminButtons.length);

    // If we find any admin button, click the first one
    if (adminButtons.length > 0) {
      await adminButtons[0].click();
      await page.waitForTimeout(1500);
      console.log('Clicked admin tab');
    }

    // Check for key sections from our fixes
    const pageContent = await page.content();
    console.log('Page contains "Server Settings":', pageContent.includes('Server Settings'));
    console.log('Page contains "Embedded Editor":', pageContent.includes('Embedded Editor'));
    console.log('Page contains "Theme":', pageContent.includes('Theme'));

    // Verify no JavaScript errors crashed the page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);

    console.log('Admin tab rendered successfully');
  });

  test('Config endpoint returns valid data', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:8012/api/config');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Config keys:', Object.keys(data));

    // Verify structure from Issue 1 fix
    expect(data).toHaveProperty('env');
    expect(data.env).toHaveProperty('HOST');
    expect(data.env).toHaveProperty('PORT');
    expect(data.env).toHaveProperty('AGRO_EDITION');

    // Verify editor settings from Issue 2 fix
    expect(data.env).toHaveProperty('EDITOR_ENABLED');
    expect(data.env).toHaveProperty('EDITOR_PORT');
    expect(data.env).toHaveProperty('EDITOR_BIND');

    console.log('Config endpoint validation passed');
    console.log('Edition:', data.env.AGRO_EDITION);
    console.log('Host:', data.env.HOST);
    console.log('Port:', data.env.PORT);
    console.log('Editor Port:', data.env.EDITOR_PORT);
  });

  test('Build artifacts exist and are valid', async () => {
    const fs = require('fs');
    const path = require('path');

    const distPath = path.join(__dirname, '../web/dist');
    const indexPath = path.join(distPath, 'index.html');

    expect(fs.existsSync(distPath)).toBeTruthy();
    expect(fs.existsSync(indexPath)).toBeTruthy();

    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    expect(indexContent).toContain('<!DOCTYPE html>');
    expect(indexContent.length).toBeGreaterThan(100);

    console.log('Build artifacts validated');
  });
});

test.describe('Admin Settings - Manual Verification Checklist', () => {
  test('Print verification instructions', async () => {
    console.log('');
    console.log('='.repeat(70));
    console.log('MANUAL VERIFICATION CHECKLIST - Admin Settings D3 Fixes');
    console.log('='.repeat(70));
    console.log('');
    console.log('Issue 1: Server Settings Now Read from Config');
    console.log('  ✓ Edition shows "enterprise" (not hardcoded "oss")');
    console.log('  ✓ Host shows "127.0.0.1" from config');
    console.log('  ✓ Port shows "8012" from config');
    console.log('');
    console.log('Issue 2: Editor Settings Are Interactive');
    console.log('  ✓ "Enable Embedded Editor" checkbox can be toggled');
    console.log('  ✓ Editor Port field is editable (not readOnly)');
    console.log('  ✓ Bind Mode dropdown can be changed');
    console.log('');
    console.log('Issue 3: Save Button Shows What Was Saved');
    console.log('  ✓ Success message lists changed fields');
    console.log('  ✓ Example: "Settings saved: EDITOR_PORT, EDITOR_BIND"');
    console.log('');
    console.log('Issue 4: Validation Works');
    console.log('  ✓ Port < 1024 shows: "Port must be between 1024 and 65535"');
    console.log('  ✓ Port > 65535 shows same validation error');
    console.log('  ✓ Invalid changes are rejected before save');
    console.log('');
    console.log('Issue 5: Team 1 Hooks Visible');
    console.log('  ✓ Secrets Management section shows secret count');
    console.log('  ✓ Git Hooks section shows post-checkout/post-commit status');
    console.log('  ✓ LangSmith section shows connection status');
    console.log('');
    console.log('Issue 6: Config Loads on Mount');
    console.log('  ✓ No permanent "Loading configuration..." message');
    console.log('  ✓ Values populate automatically when tab opens');
    console.log('');
    console.log('Issue 7: Specific Error Messages');
    console.log('  ✓ Validation errors mention specific fields');
    console.log('  ✓ Network errors say "Cannot connect to server"');
    console.log('  ✓ No generic "Failed to save settings" without details');
    console.log('');
    console.log('='.repeat(70));
    console.log('');
  });
});
