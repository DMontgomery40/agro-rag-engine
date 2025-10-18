import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const root = process.cwd();
function resolveUrlOrFile(base: string | undefined, pathTail: string): string {
  if (base) return new URL(pathTail, base).toString();
  return 'file://' + path.resolve(root, ...pathTail.split('/').filter(Boolean));
}

const outDir = path.resolve(root, 'screenshots');

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

test.beforeAll(() => { ensureDir(outDir); });

test('GUI index renders and theme toggles', async ({ page }, testInfo) => {
  // @ts-ignore
  const base = testInfo.project.use.baseURL as string | undefined;
  const guiIndex = resolveUrlOrFile(base, '/gui/index.html');
  await page.goto(guiIndex);
  await page.waitForSelector('.topbar');

  // Light mode
  const themeSel = page.locator('#theme-mode');
  if (await themeSel.count()) {
    await themeSel.selectOption('light');
  } else {
    await page.evaluate(() => {
      // Fallback via Theme API if select missing
      // @ts-ignore
      window.Theme && window.Theme.applyTheme && window.Theme.applyTheme('light');
    });
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'ui_light.png'), fullPage: true });

  // Dark mode
  if (await themeSel.count()) {
    await themeSel.selectOption('dark');
  } else {
    await page.evaluate(() => {
      // @ts-ignore
      window.Theme && window.Theme.applyTheme && window.Theme.applyTheme('dark');
    });
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'ui_dark.png'), fullPage: true });

  // Quick spot checks for visibility
  const tabBar = page.locator('.tab-bar');
  await expect(tabBar).toBeVisible();
});

test('Storage calculator renders (light)', async ({ page }, testInfo) => {
  // @ts-ignore
  const base = testInfo.project.use.baseURL as string | undefined;
  const calcPage = resolveUrlOrFile(base, '/gui/rag-calculator.html');
  await page.goto(calcPage);
  await page.waitForSelector('.main-container');
  await page.evaluate(() => {
    // @ts-ignore
    window.Theme && window.Theme.applyTheme && window.Theme.applyTheme('light');
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'calculator_light.png'), fullPage: true });
});

test('Reranker buttons are readable in light mode', async ({ page }, testInfo) => {
  // @ts-ignore
  const base = testInfo.project.use.baseURL as string | undefined;
  const guiIndex = resolveUrlOrFile(base, '/gui/index.html');
  await page.goto(guiIndex);
  // Force light theme
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme','light'); });
  // Click the Learning Reranker tab
  const rerankTab = page.getByRole('button', { name: /Learning Reranker/i });
  await rerankTab.click();

  // IDs to check
  const ids = [
    '#reranker-save-baseline',
    '#reranker-compare-baseline',
    '#reranker-rollback',
    '#reranker-setup-cron',
    '#reranker-remove-cron',
    '#reranker-smoke-test',
    '#reranker-cost-details'
  ];

  // Helper to compute WCAG contrast for rgb strings
  function contrastRGB(fg: string, bg: string): number {
    const parse = (s: string) => {
      const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
      if (!m) return [0,0,0];
      return [parseInt(m[1],10)/255, parseInt(m[2],10)/255, parseInt(m[3],10)/255];
    };
    const lin = (c: number) => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
    const lum = (rgb: number[]) => 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2]);
    const L1 = lum(parse(fg));
    const L2 = lum(parse(bg));
    const a = Math.max(L1, L2), b = Math.min(L1, L2);
    return (a + 0.05) / (b + 0.05);
  }

  for (const id of ids) {
    const el = page.locator(id);
    if (!(await el.count())) continue;
    const styles = await el.evaluate((node) => {
      const cs = getComputedStyle(node as HTMLElement);
      const root = getComputedStyle(document.documentElement);
      return {
        color: cs.color,
        background: cs.backgroundColor,
        border: cs.borderColor,
        pageBg: getComputedStyle(document.body).backgroundColor,
        fg: root.getPropertyValue('--fg').trim(),
      };
    });
    // Basic sanity: not transparent backgrounds
    expect(styles.background).not.toMatch(/rgba\(\s*0,\s*0,\s*0,\s*0\)/);
    // Contrast check vs the element background and page background
    const c1 = contrastRGB(styles.color, styles.background);
    const c2 = contrastRGB(styles.color, styles.pageBg);
    expect(Math.max(c1, c2)).toBeGreaterThanOrEqual(3.0);
  }
});
