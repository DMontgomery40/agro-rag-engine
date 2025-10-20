import { test, expect } from '@playwright/test';

test.describe('Wave 3 Smoke Tests', () => {
  const BASE_URL = 'http://127.0.0.1:8012/gui/index.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Test 1: All 9 Tabs Load Without Errors', async ({ page }) => {
    const tabs = [
      'dashboard',
      'chat',
      'vscode',
      'grafana',
      'rag',
      'profiles',
      'infrastructure',
      'admin'
    ];

    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    let tabsLoaded = 0;

    for (const tabId of tabs) {
      const tab = page.getByTestId(`tab-btn-${tabId}`);

      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(500);

        // Check if content is visible
        const content = page.locator('.tab-content.active');
        const isVisible = await content.isVisible();
        const text = await content.textContent();

        if (isVisible && !text?.includes('404')) {
          tabsLoaded++;
          console.log(`✅ Tab "${tabId}" loaded successfully`);
        } else {
          console.error(`❌ Tab "${tabId}" failed to load or returned 404`);
          errors.push(`Tab "${tabId}" failed to load`);
        }
      } else {
        console.error(`❌ Tab "${tabId}" not found in DOM`);
        errors.push(`Tab "${tabId}" not found`);
      }
    }

    console.log(`\nTest 1 Results:`);
    console.log(`Tabs loaded: ${tabsLoaded}/9`);
    console.log(`Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Error samples:', errors.slice(0, 3));
    }

    expect(tabsLoaded).toBe(9);
    expect(errors).toHaveLength(0);
  });

  test('Test 2: Infrastructure Consolidation Worked', async ({ page }) => {
    // Click Infrastructure tab
    const infraTab = page.getByTestId('tab-btn-infrastructure');
    await infraTab.click();
    await page.waitForTimeout(500);

    const expectedSections = [
      'Services',
      'MCP Servers',
      'Infrastructure Configuration',
      'Performance',
      'Usage',
      'Tracing'
    ];

    const foundSections: string[] = [];
    const missingSections: string[] = [];

    for (const section of expectedSections) {
      const content = await page.textContent('body');
      if (content?.includes(section)) {
        foundSections.push(section);
        console.log(`✅ Found section: ${section}`);
      } else {
        missingSections.push(section);
        console.log(`❌ Missing section: ${section}`);
      }
    }

    console.log(`\nTest 2 Results:`);
    console.log(`Sections found: ${foundSections.length}/6`);
    console.log(`Missing: ${missingSections.join(', ') || 'none'}`);

    expect(foundSections).toHaveLength(6);
    expect(missingSections).toHaveLength(0);
  });

  test('Test 3: No Duplicate Form IDs', async ({ page }) => {
    const duplicates = await page.evaluate(() => {
      const ids: { [key: string]: boolean } = {};
      const dups: string[] = [];

      document.querySelectorAll('[id]').forEach(el => {
        const id = el.getAttribute('id');
        if (id) {
          if (ids[id]) {
            dups.push(id);
            console.error('DUPLICATE ID:', id);
          }
          ids[id] = true;
        }
      });

      return dups;
    });

    console.log(`\nTest 3 Results:`);
    console.log(`Duplicates found: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('Examples:', duplicates.slice(0, 5));
    }

    expect(duplicates).toHaveLength(0);
  });

  test('Test 4: RAG Subtabs All Work', async ({ page }) => {
    // Click RAG tab
    const ragTab = page.getByTestId('tab-btn-rag');
    await ragTab.click();
    await page.waitForTimeout(500);

    const subtabs = [
      'data-quality',
      'retrieval',
      'external-rerankers',
      'learning-ranker',
      'indexing',
      'evaluate'
    ];

    const issues: string[] = [];
    let working = 0;

    for (const subtabId of subtabs) {
      const subtab = page.locator(`[data-subtab="${subtabId}"]`);

      if (await subtab.count() > 0) {
        await subtab.click();
        await page.waitForTimeout(300);

        const content = page.locator('.subtab-content.active');
        const isVisible = await content.isVisible();
        const hasContent = await content.evaluate(el => el.innerHTML.length > 0);

        if (isVisible && hasContent) {
          working++;
          console.log(`✅ Subtab "${subtabId}" works`);
        } else {
          issues.push(`Subtab "${subtabId}" has no visible content`);
          console.log(`❌ Subtab "${subtabId}" - no content`);
        }
      } else {
        issues.push(`Subtab "${subtabId}" not found`);
        console.log(`❌ Subtab "${subtabId}" not found`);
      }
    }

    console.log(`\nTest 4 Results:`);
    console.log(`Subtabs working: ${working}/6`);
    console.log(`Issues: ${issues.length}`);

    expect(working).toBe(6);
    expect(issues).toHaveLength(0);
  });

  test('Test 5: Console Clean (No Red Errors)', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Reload and wait
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\nTest 5 Results:`);
    console.log(`Red errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Error samples:', consoleErrors.slice(0, 3));
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('Test 6: Performance Check (Tab Switching)', async ({ page }) => {
    const tabs = ['dashboard', 'chat', 'vscode', 'grafana', 'rag', 'profiles'];
    const timings: number[] = [];

    for (const tabId of tabs) {
      const start = Date.now();

      const tab = page.getByTestId(`tab-btn-${tabId}`);
      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(100);
      }

      const end = Date.now();
      const duration = end - start;
      timings.push(duration);
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTime = Math.max(...timings);

    console.log(`\nTest 6 Results:`);
    console.log(`Average tab switch: ${avgTime.toFixed(2)}ms`);
    console.log(`Max delay: ${maxTime.toFixed(2)}ms`);

    // Performance criteria: avg < 300ms, max < 1000ms (generous for CI)
    expect(avgTime).toBeLessThan(300);
    expect(maxTime).toBeLessThan(1000);
  });
});
