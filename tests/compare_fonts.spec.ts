import { test } from '@playwright/test';

test('Compare font rendering between /gui and /web', async ({ page }) => {
  console.log('\n=== Checking /gui fonts ===');
  await page.goto('http://localhost:5173/gui/index.html');
  await page.waitForLoadState('networkidle');

  const guiBody = await page.evaluate(() => {
    const bodyFont = window.getComputedStyle(document.body).fontFamily;
    const h1Font = window.getComputedStyle(document.querySelector('h1') || document.body).fontFamily;
    const codeFont = window.getComputedStyle(document.querySelector('code, .mono, pre') || document.body).fontFamily;
    return { body: bodyFont, h1: h1Font, code: codeFont };
  });

  console.log('/gui body font:', guiBody.body);
  console.log('/gui h1 font:', guiBody.h1);
  console.log('/gui code font:', guiBody.code);

  console.log('\n=== Checking /web fonts ===');
  await page.goto('http://localhost:5173/rag');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const webBody = await page.evaluate(() => {
    const bodyFont = window.getComputedStyle(document.body).fontFamily;
    const h1Font = window.getComputedStyle(document.querySelector('h1') || document.body).fontFamily;
    const h3Font = window.getComputedStyle(document.querySelector('h3') || document.body).fontFamily;
    const codeFont = window.getComputedStyle(document.querySelector('code, .mono, pre') || document.body).fontFamily;
    return { body: bodyFont, h1: h1Font, h3: h3Font, code: codeFont };
  });

  console.log('/web body font:', webBody.body);
  console.log('/web h1 font:', webBody.h1);
  console.log('/web h3 font:', webBody.h3);
  console.log('/web code font:', webBody.code);

  console.log('\n=== Comparison ===');
  console.log('Body fonts match:', guiBody.body === webBody.body);
  console.log('Code fonts match:', guiBody.code === webBody.code);
});
