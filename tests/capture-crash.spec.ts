import { test, expect } from '@playwright/test';

test('capture actual crash error', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pageErrors: string[] = [];

  // Capture console errors
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
      console.log(`[CONSOLE ERROR] ${text}`);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    const errorMsg = `${error.name}: ${error.message}\n${error.stack}`;
    pageErrors.push(errorMsg);
    console.log(`[PAGE ERROR] ${errorMsg}`);
  });

  // Capture network errors
  page.on('response', response => {
    if (!response.ok() && response.status() >= 400) {
      console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    console.log('Waiting for errors to surface...');
    await page.waitForTimeout(3000);

    const html = await page.content();
    console.log(`\n=== PAGE HTML (first 1000 chars) ===`);
    console.log(html.substring(0, 1000));

  } catch (e: any) {
    console.log(`[NAVIGATION ERROR] ${e.message}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Console Errors: ${errors.length}`);
  console.log(`Page Errors: ${pageErrors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (pageErrors.length > 0) {
    console.log(`\n=== PAGE ERRORS (Uncaught Exceptions) ===`);
    pageErrors.forEach(err => console.log(err));
  }

  expect(true).toBe(true);
});
