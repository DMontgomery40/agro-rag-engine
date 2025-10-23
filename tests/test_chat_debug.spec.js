const { test, expect } = require('@playwright/test');

test.describe('Chat Settings - Debug', () => {
    test('Debug chat settings navigation', async ({ page }) => {
        // Listen to console messages
        page.on('console', msg => console.log(`[browser] ${msg.text()}`));
        page.on('pageerror', err => console.error(`[browser error] ${err.message}`));

        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        // Navigate to chat tab via hash
        await page.goto('http://127.0.0.1:8012#chat');
        await page.waitForTimeout(1000);

        // Debug: Check current state
        const debug1 = await page.evaluate(() => {
            const subtabBar = document.getElementById('chat-subtabs');
            const uiBtn = document.querySelector('button[data-subtab="ui"][data-parent="chat"]');
            const settingsBtn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            const uiTab = document.getElementById('tab-chat-ui');
            const settingsTab = document.getElementById('tab-chat-settings');

            return {
                subtabBarVisible: subtabBar ? subtabBar.style.display : 'not found',
                uiBtn: uiBtn ? {exists: true, active: uiBtn.classList.contains('active')} : 'not found',
                settingsBtn: settingsBtn ? {exists: true, active: settingsBtn.classList.contains('active')} : 'not found',
                uiTabActive: uiTab ? uiTab.classList.contains('active') : 'not found',
                settingsTabActive: settingsTab ? settingsTab.classList.contains('active') : 'not found',
            };
        });
        console.log('[test] Before click:', JSON.stringify(debug1, null, 2));

        // Click settings button
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (btn) {
                console.log('[click] Clicking settings button');
                btn.click();
            } else {
                console.log('[click] Settings button not found!');
            }
        });
        await page.waitForTimeout(500);

        // Debug: Check state after click
        const debug2 = await page.evaluate(() => {
            const uiBtn = document.querySelector('button[data-subtab="ui"][data-parent="chat"]');
            const settingsBtn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            const uiTab = document.getElementById('tab-chat-ui');
            const settingsTab = document.getElementById('tab-chat-settings');

            return {
                uiBtn: uiBtn ? {exists: true, active: uiBtn.classList.contains('active')} : 'not found',
                settingsBtn: settingsBtn ? {exists: true, active: settingsBtn.classList.contains('active')} : 'not found',
                uiTabActive: uiTab ? uiTab.classList.contains('active') : 'not found',
                settingsTabActive: settingsTab ? settingsTab.classList.contains('active') : 'not found',
            };
        });
        console.log('[test] After click:', JSON.stringify(debug2, null, 2));
    });
});
