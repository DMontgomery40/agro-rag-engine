import { test } from '@playwright/test';

test('Check React app console for errors', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logs: string[] = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('❌ ERROR:', text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
      console.log('⚠️  WARN:', text);
    } else if (msg.type() === 'log' && (text.includes('[') || text.includes('✓') || text.includes('Failed'))) {
      logs.push(text);
      console.log('📝 LOG:', text);
    }
  });

  // Go to React app
  await page.goto('http://localhost:5173');
  
  // Wait longer for modules to load
  await page.waitForTimeout(15000);
  
  // Check what's rendered
  const bodyText = await page.locator('body').textContent();
  console.log('\n📄 Page content (first 500 chars):');
  console.log(bodyText?.substring(0, 500));
  
  // Check for window globals
  const globals = await page.evaluate(() => {
    const w = window as any;
    return {
      CoreUtils: !!w.CoreUtils,
      Theme: !!w.Theme,
      Tabs: !!w.Tabs,
      Search: !!w.Search,
      Config: !!w.Config,
      Health: !!w.Health,
      API_BASE: w.API_BASE || 'not set'
    };
  });
  
  console.log('\n🌐 Window globals:', JSON.stringify(globals, null, 2));
  
  await page.screenshot({ path: 'test-results/react-console-check.png', fullPage: true });
  
  console.log(`\n📊 Summary:
- Errors: ${errors.length}
- Warnings: ${warnings.length}
- Logs: ${logs.length}
`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
  }
});

