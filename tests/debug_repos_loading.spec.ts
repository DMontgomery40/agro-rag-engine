import { test } from '@playwright/test';

test('Debug why repos are not loading in /web', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/rag');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Check if repos-section exists
  const reposSection = await page.locator('#repos-section').count();
  console.log('\n=== Repos Section Check ===');
  console.log('repos-section element exists:', reposSection > 0);

  if (reposSection > 0) {
    const html = await page.locator('#repos-section').innerHTML();
    console.log('repos-section HTML length:', html.length);
    console.log('repos-section children count:', await page.locator('#repos-section > div').count());

    if (html.length < 50) {
      console.log('repos-section is EMPTY - repos not loaded');
    } else {
      console.log('repos-section has content:', html.substring(0, 200));
    }
  }

  // Check network requests
  console.log('\n=== Checking Config API Call ===');
  const apiCalled = await page.evaluate(() => {
    return window.performance.getEntriesByType('resource')
      .filter((r: any) => r.name.includes('/api/config'))
      .map((r: any) => ({ name: r.name, duration: r.duration }));
  });
  console.log('Config API calls:', JSON.stringify(apiCalled, null, 2));

  // Check if config module is loaded
  const configLoaded = await page.evaluate(() => {
    return {
      hasConfig: typeof window.Config !== 'undefined',
      hasPopulateRepos: typeof window.populateReposSection === 'function',
      hasState: typeof window.CoreUtils?.state !== 'undefined'
    };
  });
  console.log('\n=== Module Check ===');
  console.log('Config module status:', JSON.stringify(configLoaded, null, 2));

  // Try to manually call the API
  console.log('\n=== Manual API Test ===');
  const response = await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:8012/api/config');
      const data = await res.json();
      return {
        status: res.status,
        hasRepos: Array.isArray(data?.repos),
        repoCount: data?.repos?.length || 0,
        repoNames: data?.repos?.map((r: any) => r.name) || []
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });
  console.log('Manual API call result:', JSON.stringify(response, null, 2));
});
