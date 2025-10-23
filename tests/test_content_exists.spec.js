const { test } = require('@playwright/test');

test.describe('Content Existence Check', () => {
    test('Check if chat settings content actually exists in DOM', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        // Click chat tab via button (not hash)
        await page.evaluate(() => {
            const chatBtn = document.querySelector('button[data-tab="chat"]');
            if (chatBtn) chatBtn.click();
        });
        await page.waitForTimeout(1000);

        // Click settings subtab
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-subtab="settings"][data-parent="chat"]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(500);

        // Count children and check structure
        const structure = await page.evaluate(() => {
            const tabChatSettings = document.getElementById('tab-chat-settings');
            if (!tabChatSettings) return 'tab-chat-settings NOT FOUND';

            const getAllChildren = (el, depth = 0) => {
                if (depth > 3) return '...'; // Limit depth
                const children = Array.from(el.children);
                return children.map(child => ({
                    tag: child.tagName,
                    id: child.id || null,
                    classes: child.className || null,
                    display: window.getComputedStyle(child).display,
                    height: child.offsetHeight,
                    childCount: child.children.length,
                    children: child.children.length > 0 ? getAllChildren(child, depth + 1) : null
                }));
            };

            return {
                exists: true,
                active: tabChatSettings.classList.contains('active'),
                display: window.getComputedStyle(tabChatSettings).display,
                flexDirection: window.getComputedStyle(tabChatSettings).flexDirection,
                gap: window.getComputedStyle(tabChatSettings).gap,
                flex: window.getComputedStyle(tabChatSettings).flex,
                height: tabChatSettings.offsetHeight,
                scrollHeight: tabChatSettings.scrollHeight,
                childCount: tabChatSettings.children.length,
                children: getAllChildren(tabChatSettings)
            };
        });

        console.log('[test] tab-chat-settings structure:', JSON.stringify(structure, null, 2));
    });
});
