const { test } = require('@playwright/test');

test.describe('Navigation Flow Debug', () => {
    test('Trace complete navigation to chat settings', async ({ page }) => {
        // Listen to all console messages
        page.on('console', msg => console.log(`[browser] ${msg.text()}`));

        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log('\n=== STEP 1: Navigate to #chat via hash ===');
        await page.goto('http://127.0.0.1:8012#chat');
        await page.waitForTimeout(1000);

        const step1 = await page.evaluate(() => {
            const tabChat = document.getElementById('tab-chat');
            const chatSubtabBar = document.getElementById('chat-subtabs');
            return {
                tabChatActive: tabChat?.classList.contains('active'),
                tabChatDisplay: tabChat ? window.getComputedStyle(tabChat).display : 'not found',
                subtabBarDisplay: chatSubtabBar ? chatSubtabBar.style.display : 'not found'
            };
        });
        console.log('[test] After #chat navigation:', JSON.stringify(step1, null, 2));

        console.log('\n=== STEP 2: Click settings subtab button ===');
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (btn) {
                console.log('[click] Found settings button, clicking...');
                btn.click();
            } else {
                console.log('[click] Settings button NOT FOUND');
            }
        });
        await page.waitForTimeout(500);

        const step2 = await page.evaluate(() => {
            const tabChat = document.getElementById('tab-chat');
            const tabChatSettings = document.getElementById('tab-chat-settings');
            const uiBtn = document.querySelector('button[data-subtab="ui"][data-parent="chat"]');
            const settingsBtn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');

            return {
                tabChatActive: tabChat?.classList.contains('active'),
                tabChatDisplay: tabChat ? window.getComputedStyle(tabChat).display : 'not found',
                tabChatHeight: tabChat?.offsetHeight || 0,
                tabChatSettingsActive: tabChatSettings?.classList.contains('active'),
                tabChatSettingsDisplay: tabChatSettings ? window.getComputedStyle(tabChatSettings).display : 'not found',
                tabChatSettingsHeight: tabChatSettings?.offsetHeight || 0,
                uiBtnActive: uiBtn?.classList.contains('active'),
                settingsBtnActive: settingsBtn?.classList.contains('active')
            };
        });
        console.log('[test] After subtab click:', JSON.stringify(step2, null, 2));

        // Check all .tab-content elements to see which have .active
        const allTabs = await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.tab-content'));
            return tabs.map(tab => ({
                id: tab.id,
                active: tab.classList.contains('active'),
                display: window.getComputedStyle(tab).display
            }));
        });
        console.log('[test] All .tab-content states:', JSON.stringify(allTabs, null, 2));
    });
});
