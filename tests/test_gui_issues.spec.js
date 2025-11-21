const { test, expect } = require('@playwright/test');

test.describe('GUI Issues - Chat Settings & Editor Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');
    });

    test('Chat Settings subtab should display content (not black page)', async ({ page }) => {
        // Click Chat tab
        await page.click('button[data-tab="chat"]');
        await page.waitForTimeout(500);

        // Click Settings subtab
        await page.click('button[data-subtab="chat-settings"]');
        await page.waitForTimeout(500);

        // Check if chat-settings subtab is visible
        const chatSettingsTab = page.locator('#tab-chat-settings');
        await expect(chatSettingsTab).toHaveClass(/active/);

        // Check if content is visible
        const settingsContent = page.locator('#chat-settings-content');
        await expect(settingsContent).toBeVisible();

        // Check if specific settings are visible
        const chatModelSelect = page.locator('#chat-model');
        await expect(chatModelSelect).toBeVisible();

        const saveButton = page.locator('#chat-save-settings');
        await expect(saveButton).toBeVisible();

        console.log('[test] ✓ Chat Settings subtab displays content');
    });

    test('Embedded Code Editor toggle should exist in Admin tab', async ({ page }) => {
        // Click Admin tab
        await page.click('button[data-tab="admin"]');
        await page.waitForTimeout(500);

        // Scroll to Embedded Editor section
        await page.locator('#admin-editor-settings-anchor').scrollIntoViewIfNeeded();

        // Check if toggle exists
        const editorToggle = page.locator('input[name="EDITOR_ENABLED"]');
        await expect(editorToggle).toBeVisible();

        // Check current state
        const isChecked = await editorToggle.isChecked();
        console.log(`[test] Embedded Editor toggle state: ${isChecked ? 'ENABLED' : 'DISABLED'}`);

        // Check if toggle label exists
        const toggleLabel = page.locator('text=Enable Embedded Editor');
        await expect(toggleLabel).toBeVisible();

        console.log('[test] ✓ Embedded Editor toggle exists in Admin tab');
    });

    test('VS Code tab should show editor status badge', async ({ page }) => {
        // Click VS Code tab
        await page.click('button[data-tab="vscode"]');
        await page.waitForTimeout(1000);

        // Check if health badge exists
        const healthBadge = page.locator('#editor-health-badge');
        await expect(healthBadge).toBeVisible();

        // Check badge text
        const badgeText = await page.locator('#editor-health-text').textContent();
        console.log(`[test] Editor status badge text: "${badgeText}"`);

        // Badge should show either: Checking..., ○ Disabled, ● Error, or ● Ready
        expect(badgeText).toMatch(/Checking|Disabled|Error|Ready/);

        console.log('[test] ✓ Editor status badge is visible');
    });
});
