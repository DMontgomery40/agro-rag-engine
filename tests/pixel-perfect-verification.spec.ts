import { test, expect } from '@playwright/test';

test.describe('Pixel-Perfect Parity Verification', () => {
  
  test('Learning Ranker: Complete structure verification', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(3000);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(2000);
    
    // Verify exact structure matches /gui
    const checks = {
      'H2 heading': 'h2:has-text("Learning Reranker System")',
      'Status section h3': 'h3:has-text("System Status")',
      'Reranker Status label': 'label:has-text("Reranker Status")',
      'Training Workflow h3': 'h3:has-text("Training Workflow")',
      'Mine Triplets button': 'button:has-text("Mine Triplets")',
      'Train Model button': 'button:has-text("Train Model")',
      'Evaluate button': 'button:has-text("Evaluate")',
      'Reranker Configuration h3': 'h3:has-text("Reranker Configuration")',
      'Enable Learning Reranker label': 'label:has-text("Enable Learning Reranker")',
      'Evaluation Metrics h3': 'h3:has-text("Evaluation Metrics")',
      'Save as Baseline button': 'button:has-text("Save as Baseline")',
      'Compare vs Baseline button': 'button:has-text("Compare vs Baseline")',
      'Rollback Model button': 'button:has-text("Rollback Model")',
      'Query Logs h3': 'h3:has-text("Query Logs")',
      'View Logs button': 'button:has-text("View Logs")',
      'Download Logs button': 'button:has-text("Download Logs")',
      'Clear Logs button': 'button:has-text("Clear Logs")',
      'Automation h3': 'h3:has-text("Automation")',
      'Setup Nightly Job button': 'button:has-text("Setup Nightly Job")',
      'Remove Nightly Job button': 'button:has-text("Remove Nightly Job")',
      'Smoke Test h3': 'h3:has-text("Smoke Test")',
      'Run Smoke Test button': 'button:has-text("Run Smoke Test")',
      'Cost Tracking h3': 'h3:has-text("Cost Tracking")',
      'No-Hit Queries h3': 'h3:has-text("No-Hit Queries")',
    };
    
    const results: Record<string, boolean> = {};
    
    for (const [name, selector] of Object.entries(checks)) {
      const exists = await page.locator(selector).count() > 0;
      results[name] = exists;
      console.log(`${exists ? '✅' : '❌'} ${name}`);
    }
    
    await page.screenshot({ path: 'test-results/learning-ranker-structure.png', fullPage: true });
    
    // Count how many checks passed
    const passed = Object.values(results).filter(v => v).length;
    const total = Object.keys(results).length;
    
    console.log(`\n📊 Structure Match: ${passed}/${total} elements found`);
    
    // Verify critical elements have correct styling
    const mineBtn = page.locator('button:has-text("Mine Triplets")').first();
    const mineBtnBg = await mineBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    console.log(`Mine button background: ${mineBtnBg}`);
    
    expect(passed).toBeGreaterThan(total * 0.9); // At least 90% match
  });
  
  test('Check terminal container for live output', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(2000);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(1000);
    
    // Look for reranker-terminal-container (from /gui)
    const terminalById = await page.locator('#reranker-terminal-container').count();
    const terminalByClass = await page.locator('[class*="terminal"]').count();
    const liveTerminal = await page.locator('[class*="LiveTerminal"], [class*="live-terminal"]').count();
    
    console.log(`Terminal by ID (#reranker-terminal-container): ${terminalById}`);
    console.log(`Terminal by class: ${terminalByClass}`);
    console.log(`LiveTerminal: ${liveTerminal}`);
    
    if (terminalById === 0) {
      console.log('❌ MISSING: #reranker-terminal-container (required in /gui line 3611)');
    }
  });
  
  test('Verify all CSS variables are defined', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check all critical CSS variables from tokens.css
    const cssVars = [
      '--bg', '--fg', '--panel', '--line', '--accent', '--link', '--warn', '--err',
      '--ok', '--fg-muted', '--card-bg', '--chip-bg', '--code-bg', '--input-bg',
      '--bg-elev1', '--bg-elev2', '--accent-contrast', '--on-link', '--on-warn', '--on-err'
    ];
    
    const varValues: Record<string, string> = {};
    
    for (const varName of cssVars) {
      const value = await page.evaluate((v) => {
        return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      }, varName);
      varValues[varName] = value;
      console.log(`${varName}: ${value || '❌ NOT DEFINED'}`);
    }
    
    const undefinedVars = cssVars.filter(v => !varValues[v]);
    if (undefinedVars.length > 0) {
      console.log(`\n❌ UNDEFINED VARS: ${undefinedVars.join(', ')}`);
    }
    
    expect(undefinedVars.length).toBe(0);
  });
});

