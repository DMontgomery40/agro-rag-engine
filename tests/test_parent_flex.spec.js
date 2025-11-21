const { test } = require('@playwright/test');

test.describe('Parent Flex Check', () => {
    test('Check if tab-chat is flex container', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012#chat');
        await page.waitForLoadState('networkidle');

        const parentDebug = await page.evaluate(() => {
            const tabChat = document.getElementById('tab-chat');
            const scrollableWrapper = tabChat?.closest('.scrollable-wrapper');
            const content = document.querySelector('.content');

            const getStyles = (el) => {
                if (!el) return 'not found';
                const s = window.getComputedStyle(el);
                return {
                    display: s.display,
                    flexDirection: s.flexDirection,
                    height: el.offsetHeight,
                    maxHeight: s.maxHeight,
                    overflow: s.overflow,
                    overflowY: s.overflowY
                };
            };

            return {
                content: getStyles(content),
                scrollableWrapper: getStyles(scrollableWrapper),
                tabChat: getStyles(tabChat)
            };
        });

        console.log('[test] Parent containers:', JSON.stringify(parentDebug, null, 2));
    });
});
