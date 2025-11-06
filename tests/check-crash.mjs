import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const jsErrors = [];
  const crashes = [];

  // Capture JavaScript errors only
  page.on('pageerror', error => {
    jsErrors.push(error.message);
    console.error('[JS ERROR]', error.message);
  });

  // Capture crash
  page.on('crash', () => {
    crashes.push('Page crashed!');
    console.error('[CRASH] Page crashed!');
  });

  console.log('Navigating to http://localhost:3000...');

  try {
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Wait for React to try to render
    await page.waitForTimeout(3000);

    // Check root
    const html = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });

    console.log(`\n=== ROOT HTML LENGTH: ${html} ===`);
    console.log(`=== JS ERRORS: ${jsErrors.length} ===`);
    console.log(`=== CRASHES: ${crashes.length} ===`);

    if (jsErrors.length > 0) {
      console.log('\nJavaScript Errors:');
      jsErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));
    }

  } catch (err) {
    console.error('[TEST ERROR]', err.message);
  }

  await browser.close();
})();
