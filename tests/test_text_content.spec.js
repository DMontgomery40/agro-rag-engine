const { test } = require('@playwright/test');

test.describe('Text Content Check', () => {
    test('Check if text is actually present', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        await page.evaluate(() => {
            const chatBtn = document.querySelector('button[data-tab="chat"]');
            if (chatBtn) chatBtn.click();
        });
        await page.waitForTimeout(500);

        await page.evaluate(() => {
            const btn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(500);

        const textCheck = await page.evaluate(() => {
            const settingsContent = document.getElementById('chat-settings-content');
            if (!settingsContent) return 'NOT FOUND';

            const firstP = settingsContent.querySelector('p.small');
            const firstInputRow = settingsContent.querySelector('.input-row');
            const chatModelSelect = document.getElementById('chat-model');

            return {
                settingsContentText: settingsContent.textContent?.substring(0, 200) || 'NO TEXT',
                firstPText: firstP?.textContent || 'NO P TAG',
                firstPHTML: firstP?.outerHTML?.substring(0, 150) || 'NO P TAG',
                firstInputRowHTML: firstInputRow?.outerHTML?.substring(0, 200) || 'NO INPUT ROW',
                chatModelExists: !!chatModelSelect,
                chatModelHTML: chatModelSelect?.outerHTML?.substring(0, 150) || 'NO SELECT'
            };
        });

        console.log('[test] Text content check:', JSON.stringify(textCheck, null, 2));
    });
});
