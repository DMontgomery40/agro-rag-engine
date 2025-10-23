const { test } = require('@playwright/test');

test.describe('Parent Chain Debug', () => {
    test('Check entire parent chain from tab-chat-settings up', async ({ page }) => {
        await page.goto('http://127.0.0.1:8012');
        await page.waitForLoadState('networkidle');

        // Navigate and click
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

        const chain = await page.evaluate(() => {
            let el = document.getElementById('tab-chat-settings');
            const parents = [];

            while (el) {
                const styles = window.getComputedStyle(el);
                parents.push({
                    tag: el.tagName,
                    id: el.id || null,
                    classes: el.className ? el.className.substring(0, 50) : null,
                    display: styles.display,
                    flexDirection: styles.flexDirection,
                    flex: styles.flex,
                    height: el.offsetHeight,
                    minHeight: styles.minHeight,
                    maxHeight: styles.maxHeight,
                    overflow: styles.overflow,
                    position: styles.position
                });
                el = el.parentElement;
                if (parents.length > 10) break; // Safety limit
            }

            return parents;
        });

        console.log('[test] Parent chain (child to root):');
        chain.forEach((p, i) => {
            console.log(`\n  [${i}] ${p.tag}#${p.id || '(no id)'}  .${p.classes || '(no class)'}`);
            console.log(`      display: ${p.display}, flexDirection: ${p.flexDirection}`);
            console.log(`      flex: ${p.flex}, height: ${p.height}px`);
            console.log(`      minHeight: ${p.minHeight}, maxHeight: ${p.maxHeight}`);
            console.log(`      overflow: ${p.overflow}, position: ${p.position}`);
        });
    });
});
