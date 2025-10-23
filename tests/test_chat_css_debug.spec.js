const { test, expect } = require('@playwright/test');

test.describe('Chat Settings - CSS Debug', () => {
    test('Check computed CSS for chat settings', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012#chat');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Click settings button
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(500);

        // Check computed styles
        const cssDebug = await page.evaluate(() => {
            const tabChat = document.getElementById('tab-chat');
            const tabChatSettings = document.getElementById('tab-chat-settings');
            const settingsSection = tabChatSettings?.querySelector('.settings-section');
            const settingsContent = document.getElementById('chat-settings-content');

            const getComputedDisplay = (el) => el ? window.getComputedStyle(el).display : 'not found';
            const getComputedVisibility = (el) => el ? window.getComputedStyle(el).visibility : 'not found';
            const getOffsetHeight = (el) => el ? el.offsetHeight : 'not found';
            const hasActiveClass = (el) => el ? el.classList.contains('active') : 'not found';

            return {
                tabChat: {
                    display: getComputedDisplay(tabChat),
                    visibility: getComputedVisibility(tabChat),
                    height: getOffsetHeight(tabChat),
                    active: hasActiveClass(tabChat)
                },
                tabChatSettings: {
                    display: getComputedDisplay(tabChatSettings),
                    visibility: getComputedVisibility(tabChatSettings),
                    height: getOffsetHeight(tabChatSettings),
                    active: hasActiveClass(tabChatSettings)
                },
                settingsSection: {
                    display: getComputedDisplay(settingsSection),
                    visibility: getComputedVisibility(settingsSection),
                    height: getOffsetHeight(settingsSection)
                },
                settingsContent: {
                    display: getComputedDisplay(settingsContent),
                    visibility: getComputedVisibility(settingsContent),
                    height: getOffsetHeight(settingsContent)
                }
            };
        });

        console.log('[test] CSS Debug:', JSON.stringify(cssDebug, null, 2));
    });
});
