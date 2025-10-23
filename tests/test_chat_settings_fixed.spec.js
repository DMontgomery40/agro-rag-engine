const { test, expect } = require('@playwright/test');

test.describe('Chat Settings - Fixed Navigation', () => {
    test('Chat Settings subtab should display content (not black page)', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        // Navigate directly using URL hash (bypasses click issues)
        await page.goto('http://127.0.0.1:8012#chat');
        await page.waitForTimeout(500);

        // Use JavaScript to click the settings button (bypasses viewport issues)
        await page.evaluate(() => {
            const settingsBtn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (settingsBtn) settingsBtn.click();
        });
        await page.waitForTimeout(500);

        // Check if chat-settings subtab has active class
        const chatSettingsTab = page.locator('#tab-chat-settings');
        const hasActiveClass = await chatSettingsTab.evaluate(el => el.classList.contains('active'));
        console.log(`[test] #tab-chat-settings has .active class: ${hasActiveClass}`);
        expect(hasActiveClass).toBe(true);

        // Check if content is visible
        const settingsContent = page.locator('#chat-settings-content');
        const contentVisible = await settingsContent.isVisible();
        console.log(`[test] #chat-settings-content visible: ${contentVisible}`);
        expect(contentVisible).toBe(true);

        // Check if specific settings are visible
        const chatModelSelect = page.locator('#chat-model');
        const modelVisible = await chatModelSelect.isVisible();
        console.log(`[test] #chat-model select visible: ${modelVisible}`);
        expect(modelVisible).toBe(true);

        const saveButton = page.locator('#chat-save-settings');
        const saveVisible = await saveButton.isVisible();
        console.log(`[test] Save Settings button visible: ${saveVisible}`);
        expect(saveVisible).toBe(true);

        console.log('[test] ✅ Chat Settings subtab displays content (not black page)');
    });
});
