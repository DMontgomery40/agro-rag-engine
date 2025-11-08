import { test, expect } from '@playwright/test';

test('debug CSS loading', async ({ page }) => {
  await page.goto('http://localhost:3002/');
  await page.waitForSelector('.dashboard-container', { timeout: 10000 });

  // Take a screenshot
  await page.screenshot({ path: 'test-results/css-debug.png', fullPage: true });

  // Get all loaded stylesheets
  const stylesheets = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    return sheets.map(sheet => {
      try {
        return {
          href: sheet.href || 'inline',
          rules: sheet.cssRules ? sheet.cssRules.length : 0
        };
      } catch (e) {
        return { href: sheet.href || 'inline', error: 'Access denied' };
      }
    });
  });

  console.log('Loaded stylesheets:', JSON.stringify(stylesheets, null, 2));

  // Check computed styles on documentElement
  const computedStyles = await page.evaluate(() => {
    const root = document.documentElement;
    const styles = window.getComputedStyle(root);
    return {
      bg: styles.getPropertyValue('--bg').trim(),
      line: styles.getPropertyValue('--line').trim(),
      fg: styles.getPropertyValue('--fg').trim(),
      timingFast: styles.getPropertyValue('--timing-fast').trim(),
      // Also check the body background to see if anything is applying
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    };
  });

  console.log('Computed CSS variables:', computedStyles);

  // Check if :root pseudo-class is working
  const rootCheck = await page.evaluate(() => {
    const matches = document.querySelectorAll(':root');
    return matches.length > 0;
  });
  console.log(':root pseudo-class matches:', rootCheck);

  // Check if HTML has data-theme
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('data-theme attribute:', theme);

  // Check if tokens.css content exists and show the selector
  const tokensRules = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    const found: string[] = [];
    for (const sheet of sheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of Array.from(sheet.cssRules)) {
            const cssRule = rule as CSSStyleRule;
            if (cssRule.cssText && (cssRule.cssText.includes('--bg:') || cssRule.cssText.includes('--line:'))) {
              found.push(cssRule.selectorText || 'unknown');
            }
          }
        }
      } catch (e) {
        // CORS
      }
    }
    return found;
  });

  console.log('CSS rules with --bg or --line:', tokensRules);

  // Now try to manually set data-theme and check again
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  await page.waitForTimeout(200);

  const afterThemeSet = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      bg: styles.getPropertyValue('--bg').trim(),
      fg: styles.getPropertyValue('--fg').trim(),
    };
  });

  console.log('After setting data-theme=dark:', afterThemeSet);
});
