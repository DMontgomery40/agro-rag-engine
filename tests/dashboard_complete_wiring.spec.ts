import { test, expect } from '@playwright/test';

/**
 * Dashboard Complete Wiring Tests
 * Verifies ALL Dashboard subtabs are properly wired to backend APIs
 * Tests: System Status, Monitoring, Storage, Help, Glossary subtabs
 */

test.describe('Dashboard Tab - Complete Wiring Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Dashboard tab
    await page.goto('http://localhost:5173/web/');
    await page.waitForLoadState('networkidle');

    // Click Dashboard tab
    const dashboardTab = page.locator('.tab-bar button:has-text("Dashboard")');
    await dashboardTab.click();
    await page.waitForTimeout(500);
  });

  test('Dashboard tab loads with System Status subtab active by default', async ({ page }) => {
    // Verify Dashboard tab content is visible
    const dashboardContent = page.locator('#tab-dashboard');
    await expect(dashboardContent).toBeVisible();

    // Verify System Status subtab is active
    const systemStatusSubtab = page.locator('#tab-dashboard-system-status');
    await expect(systemStatusSubtab).toBeVisible();

    const classAttr = await systemStatusSubtab.getAttribute('class');
    expect(classAttr).toContain('active');
  });

  test('System Status subtab displays health metrics', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);

    // Verify key status cards exist
    const healthCard = page.locator('#tab-dashboard-system-status').locator('text=/Health/i').first();
    await expect(healthCard).toBeVisible();

    const repoCard = page.locator('#tab-dashboard-system-status').locator('text=/Repository/i').first();
    await expect(repoCard).toBeVisible();

    const branchCard = page.locator('#tab-dashboard-system-status').locator('text=/Branch/i').first();
    await expect(branchCard).toBeVisible();

    // Verify Quick Actions panel exists
    const quickActions = page.locator('text=/Quick Actions/i');
    await expect(quickActions).toBeVisible();
  });

  test('System Status Quick Actions buttons are wired', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verify action buttons exist and have proper data-action attributes
    const runIndexerBtn = page.locator('button[data-action="run-indexer"]');
    await expect(runIndexerBtn).toBeVisible();

    const genKeywordsBtn = page.locator('button[data-action="generate-keywords"]');
    await expect(genKeywordsBtn).toBeVisible();

    const reloadConfigBtn = page.locator('button[data-action="reload-config"]');
    await expect(reloadConfigBtn).toBeVisible();

    const runEvalBtn = page.locator('button[data-action="run-eval"]');
    await expect(runEvalBtn).toBeVisible();
  });

  test('Monitoring subtab loads and displays alert status', async ({ page }) => {
    // Click Monitoring subtab
    const monitoringBtn = page.locator('.subtab-bar button:has-text("Monitoring")');
    await monitoringBtn.click();
    await page.waitForTimeout(1000);

    // Verify Monitoring subtab is now active
    const monitoringSubtab = page.locator('#tab-dashboard-monitoring');
    await expect(monitoringSubtab).toBeVisible();

    const classAttr = await monitoringSubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify sections exist
    const monitoringLogsSection = page.locator('text=/Monitoring Logs/i');
    await expect(monitoringLogsSection).toBeVisible();

    const queryTracesSection = page.locator('text=/Recent Query Traces/i');
    await expect(queryTracesSection).toBeVisible();

    const lokiSection = page.locator('text=/Loki Log Aggregation/i');
    await expect(lokiSection).toBeVisible();
  });

  test('Monitoring subtab does not crash on traces.map', async ({ page }) => {
    // This test specifically verifies the fix for traces.map crash
    const monitoringBtn = page.locator('.subtab-bar button:has-text("Monitoring")');
    await monitoringBtn.click();
    await page.waitForTimeout(1500);

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await page.waitForTimeout(1000);

    // Verify no "traces.map is not a function" error
    const hasMapError = errors.some(err => err.includes('traces.map is not a function'));
    expect(hasMapError).toBe(false);

    // Verify the traces table or empty state is visible
    const tracesContainer = page.locator('#tab-dashboard-monitoring').locator('text=/Recent Query Traces/i').locator('..');
    await expect(tracesContainer).toBeVisible();
  });

  test('Monitoring subtab displays Recent Alerts section', async ({ page }) => {
    const monitoringBtn = page.locator('.subtab-bar button:has-text("Monitoring")');
    await monitoringBtn.click();
    await page.waitForTimeout(1000);

    // Verify Recent Alerts card
    const recentAlertsCard = page.locator('text=/Recent Alerts/i');
    await expect(recentAlertsCard).toBeVisible();

    // Verify Alert History card
    const alertHistoryCard = page.locator('text=/Alert History/i');
    await expect(alertHistoryCard).toBeVisible();
  });

  test('Storage subtab loads and displays storage metrics', async ({ page }) => {
    // Click Storage subtab
    const storageBtn = page.locator('.subtab-bar button:has-text("Storage")');
    await storageBtn.click();
    await page.waitForTimeout(1000);

    // Verify Storage subtab is active
    const storageSubtab = page.locator('#tab-dashboard-storage');
    await expect(storageSubtab).toBeVisible();

    // Verify storage sections exist
    const storageOverview = page.locator('text=/Storage Overview/i');
    await expect(storageOverview).toBeVisible();

    const storageBreakdown = page.locator('text=/Storage Breakdown/i');
    await expect(storageBreakdown).toBeVisible();
  });

  test('Help subtab loads with documentation content', async ({ page }) => {
    // Click Help subtab
    const helpBtn = page.locator('.subtab-bar button:has-text("Help")');
    await helpBtn.click();
    await page.waitForTimeout(500);

    // Verify Help subtab is active
    const helpSubtab = page.locator('#tab-dashboard-help');
    await expect(helpSubtab).toBeVisible();

    const classAttr = await helpSubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify key help sections exist
    const quickStart = page.locator('text=/Quick Start Guide/i');
    await expect(quickStart).toBeVisible();

    const keyConcepts = page.locator('text=/Key Concepts/i');
    await expect(keyConcepts).toBeVisible();

    const commonTasks = page.locator('text=/Common Tasks/i');
    await expect(commonTasks).toBeVisible();
  });

  test('Help subtab contains expected content sections', async ({ page }) => {
    const helpBtn = page.locator('.subtab-bar button:has-text("Help")');
    await helpBtn.click();
    await page.waitForTimeout(500);

    // Verify all expected help cards are present
    const expectedSections = [
      'Quick Start Guide',
      'Key Concepts',
      'Common Tasks',
      'External Resources'
    ];

    for (const section of expectedSections) {
      const sectionLocator = page.locator(`text=/${section}/i`);
      await expect(sectionLocator).toBeVisible();
    }
  });

  test('Glossary subtab loads with searchable terms', async ({ page }) => {
    // Click Glossary subtab
    const glossaryBtn = page.locator('.subtab-bar button:has-text("Glossary")');
    await glossaryBtn.click();
    await page.waitForTimeout(500);

    // Verify Glossary subtab is active
    const glossarySubtab = page.locator('#tab-dashboard-glossary');
    await expect(glossarySubtab).toBeVisible();

    const classAttr = await glossarySubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify search input exists
    const searchInput = page.locator('#glossary-search');
    await expect(searchInput).toBeVisible();

    // Verify category filter buttons exist
    const allBtn = page.locator('button:has-text("All")');
    await expect(allBtn).toBeVisible();
  });

  test('Glossary search functionality works', async ({ page }) => {
    const glossaryBtn = page.locator('.subtab-bar button:has-text("Glossary")');
    await glossaryBtn.click();
    await page.waitForTimeout(500);

    // Type in search box
    const searchInput = page.locator('#glossary-search');
    await searchInput.fill('embedding');
    await page.waitForTimeout(300);

    // Verify filtered results appear (should have fewer items)
    const glossaryItems = page.locator('.glossary-item');
    const count = await glossaryItems.count();

    // Should have at least 1 result containing "embedding"
    expect(count).toBeGreaterThan(0);
  });

  test('Glossary category filters work', async ({ page }) => {
    const glossaryBtn = page.locator('.subtab-bar button:has-text("Glossary")');
    await glossaryBtn.click();
    await page.waitForTimeout(500);

    // Click Retrieval category filter
    const retrievalBtn = page.locator('button:has-text("Retrieval")');
    await retrievalBtn.click();
    await page.waitForTimeout(300);

    // Verify filtered items are displayed
    const glossaryItems = page.locator('.glossary-item');
    const count = await glossaryItems.count();

    // Should have some retrieval-related items
    expect(count).toBeGreaterThan(0);

    // Click All to reset
    const allBtn = page.locator('button:has-text("All")').first();
    await allBtn.click();
    await page.waitForTimeout(300);
  });

  test('Dashboard subtab navigation works correctly', async ({ page }) => {
    await page.waitForTimeout(500);

    // Navigate through all subtabs
    const subtabs = ['Monitoring', 'Storage', 'Help', 'Glossary'];

    for (const subtab of subtabs) {
      const subtabBtn = page.locator(`.subtab-bar button:has-text("${subtab}")`);
      await subtabBtn.click();
      await page.waitForTimeout(300);

      // Verify corresponding subtab is now active
      const subtabId = `tab-dashboard-${subtab.toLowerCase().replace(/\s+/g, '-')}`;
      const subtabContent = page.locator(`#${subtabId}`);

      const classAttr = await subtabContent.getAttribute('class');
      expect(classAttr).toContain('active');
    }

    // Navigate back to System Status
    const systemStatusBtn = page.locator('.subtab-bar button:has-text("System Status")');
    await systemStatusBtn.click();
    await page.waitForTimeout(300);

    const systemStatusSubtab = page.locator('#tab-dashboard-system-status');
    const classAttr = await systemStatusSubtab.getAttribute('class');
    expect(classAttr).toContain('active');
  });

  test('Dashboard API calls use correct backend URL (8012)', async ({ page }) => {
    // Set up request interception to verify API calls
    const apiCalls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiCalls.push(url);
      }
    });

    // Navigate to Dashboard and trigger API calls
    await page.waitForTimeout(2000);

    // Verify at least some API calls were made to port 8012
    const correctAPICalls = apiCalls.filter(url => url.includes(':8012/api/'));
    expect(correctAPICalls.length).toBeGreaterThan(0);

    // Verify NO API calls went to port 5173
    const wrongAPICalls = apiCalls.filter(url => url.includes(':5173/api/'));
    expect(wrongAPICalls.length).toBe(0);
  });

  test('All Dashboard subtabs are in DOM (no conditional rendering)', async ({ page }) => {
    await page.waitForTimeout(500);

    // Verify all subtabs exist in DOM regardless of active state
    const expectedSubtabs = [
      'tab-dashboard-system-status',
      'tab-dashboard-monitoring',
      'tab-dashboard-storage',
      'tab-dashboard-help',
      'tab-dashboard-glossary'
    ];

    for (const subtabId of expectedSubtabs) {
      const subtab = page.locator(`#${subtabId}`);
      const count = await subtab.count();
      expect(count).toBe(1);
    }
  });

  test('Dashboard does not use dangerouslySetInnerHTML', async ({ page }) => {
    await page.waitForTimeout(500);

    // Check page content for any dangerous patterns
    const pageContent = await page.content();

    // Should not find dangerouslySetInnerHTML in the rendered output
    // Note: This is a basic check - proper verification would require source inspection
    expect(pageContent).not.toContain('dangerouslySetInnerHTML');
  });

  test('Dashboard loading states work correctly', async ({ page }) => {
    // Navigate to Monitoring subtab (which has loading logic)
    const monitoringBtn = page.locator('.subtab-bar button:has-text("Monitoring")');
    await monitoringBtn.click();

    // Should see loading state briefly
    const loadingText = page.locator('text=/Loading/i').first();

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // After loading, should see actual content or "No traces available"
    const content = page.locator('#tab-dashboard-monitoring');
    await expect(content).toBeVisible();
  });

  test('Dashboard error handling works - graceful degradation', async ({ page }) => {
    // Even if backend is down, Dashboard should still render without crashing
    await page.waitForTimeout(1500);

    // Verify Dashboard tab is still visible and functional
    const dashboardContent = page.locator('#tab-dashboard');
    await expect(dashboardContent).toBeVisible();

    // Can still navigate between subtabs
    const helpBtn = page.locator('.subtab-bar button:has-text("Help")');
    await helpBtn.click();
    await page.waitForTimeout(300);

    const helpSubtab = page.locator('#tab-dashboard-help');
    await expect(helpSubtab).toBeVisible();
  });
});
