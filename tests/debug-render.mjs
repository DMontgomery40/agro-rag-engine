import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  // Capture errors
  page.on('pageerror', error => {
    console.error('[BROWSER ERROR]', error.message);
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait a bit for React to mount
  await page.waitForTimeout(2000);

  // Check what's in the DOM
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      innerHTML: root ? root.innerHTML.substring(0, 500) : 'NO ROOT',
      hasChildren: root ? root.children.length : 0
    };
  });

  console.log('\n=== ROOT CONTENT ===');
  console.log(rootContent);

  await browser.close();
})();
