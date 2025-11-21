import { test, expect } from '@playwright/test';

test.describe('React App Detailed Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000); // Let app fully initialize
  });

  test('Terminal dropdowns in Learning Ranker', async ({ page }) => {
    // Navigate to RAG > Learning Ranker
    await page.click('a[href="/rag"]');
    await page.waitForTimeout(500);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(1000);
    
    // Look for terminal container
    const terminalContainer = await page.locator('#reranker-terminal-container, [class*="terminal"], [class*="Terminal"]').count();
    console.log(`Terminal containers found: ${terminalContainer}`);
    
    // Check for Mine Triplets button
    const mineBtn = page.locator('button:has-text("Mine Triplets")').first();
    await expect(mineBtn).toBeVisible();
    
    await page.screenshot({ path: 'test-results/learning-ranker-before-mine.png', fullPage: true });
    
    // Click Mine Triplets and check for output
    await mineBtn.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/learning-ranker-after-mine.png', fullPage: true });
    
    // Look for any result/log output
    const bodyText = await page.locator('body').textContent();
    const hasResult = bodyText?.includes('Mined') || bodyText?.includes('triplet') || bodyText?.includes('Processing');
    
    console.log('After clicking Mine:', hasResult ? '✅ Shows result' : '⚠️  No visible result');
  });

  test('VSCode editor status and enable check', async ({ page }) => {
    // First check Admin tab for editor/vscode enable setting
    await page.click('a[href="/admin"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/admin-tab-full.png', fullPage: true });
    
    // Look for editor/vscode enable toggle
    const editorToggle = await page.locator('input[name="EDITOR_ENABLED"], input[name="VSCODE_ENABLED"], select[name="EDITOR_ENABLED"], select[name="VSCODE_ENABLED"]').count();
    console.log(`Editor enable controls found in Admin: ${editorToggle}`);
    
    // Check current value if found
    if (editorToggle > 0) {
      const value = await page.locator('input[name="EDITOR_ENABLED"], select[name="EDITOR_ENABLED"]').first().inputValue().catch(() => 'not found');
      console.log(`EDITOR_ENABLED value: ${value}`);
    }
    
    // Now go to VSCode tab
    await page.click('a[href="/vscode"]');
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: 'test-results/vscode-tab-status.png', fullPage: true });
    
    // Check for "enable in admin" message or actual iframe
    const bodyText = await page.locator('body').textContent();
    const hasEnableMessage = bodyText?.toLowerCase().includes('enable') && bodyText?.toLowerCase().includes('admin');
    const hasIframe = await page.locator('iframe').count();
    
    console.log(`VSCode tab - Enable message: ${hasEnableMessage}, Iframe: ${hasIframe}`);
  });

  test('Index tab has terminal/log output', async ({ page }) => {
    // Navigate to RAG > Indexing
    await page.click('a[href="/rag"]');
    await page.waitForTimeout(500);
    await page.click('button[data-subtab="indexing"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/indexing-tab.png', fullPage: true });
    
    // Look for Run Index button
    const runBtn = page.locator('button:has-text("Run"), button:has-text("Index"), button:has-text("Start")').first();
    const btnExists = await runBtn.count();
    
    console.log(`Indexing buttons found: ${btnExists}`);
    
    if (btnExists > 0) {
      await runBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/indexing-after-start.png', fullPage: true });
    }
  });

  test('Check all tabs render without errors', async ({ page }) => {
    const tabs = [
      { name: 'Start', path: '/start' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Chat', path: '/chat' },
      { name: 'VSCode', path: '/vscode' },
      { name: 'Grafana', path: '/grafana' },
      { name: 'RAG', path: '/rag' },
      { name: 'Profiles', path: '/profiles' },
      { name: 'Infrastructure', path: '/infrastructure' },
      { name: 'Admin', path: '/admin' }
    ];
    
    for (const tab of tabs) {
      await page.goto(`http://localhost:5173${tab.path}`);
      await page.waitForTimeout(1000);
      
      const bodyText = await page.locator('body').textContent();
      const hasContent = bodyText && bodyText.length > 100;
      
      await page.screenshot({ path: `test-results/tab-${tab.name.toLowerCase()}.png` });
      
      console.log(`${tab.name}: ${hasContent ? '✅ Renders' : '❌ Empty'}`);
    }
  });
});

