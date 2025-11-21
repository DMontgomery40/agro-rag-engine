import { test, expect } from '@playwright/test';

test.describe('Help Icons Verification', () => {
  test('should have help icons for Grafana settings', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate to Grafana config tab (use desktop nav)
    await page.click('[data-nav="desktop"][data-tab="grafana"]');
    await page.waitForTimeout(500);

    // Click on config subtab
    await page.click('[data-subtab="config"]');
    await page.waitForTimeout(500);

    // Verify help icons are present for Grafana settings
    const grafanaBaseUrlIcon = await page.locator('label:has-text("Grafana Base URL") .help-icon[data-tooltip="GRAFANA_BASE_URL"]');
    await expect(grafanaBaseUrlIcon).toBeVisible();
    console.log('✓ GRAFANA_BASE_URL help icon found');

    const dashboardUidIcon = await page.locator('label:has-text("Dashboard UID") .help-icon[data-tooltip="GRAFANA_DASHBOARD_UID"]');
    await expect(dashboardUidIcon).toBeVisible();
    console.log('✓ GRAFANA_DASHBOARD_UID help icon found');

    const dashboardSlugIcon = await page.locator('label:has-text("Dashboard Slug") .help-icon[data-tooltip="GRAFANA_DASHBOARD_SLUG"]');
    await expect(dashboardSlugIcon).toBeVisible();
    console.log('✓ GRAFANA_DASHBOARD_SLUG help icon found');

    const orgIdIcon = await page.locator('label:has-text("Org ID") .help-icon[data-tooltip="GRAFANA_ORG_ID"]');
    await expect(orgIdIcon).toBeVisible();
    console.log('✓ GRAFANA_ORG_ID help icon found');

    const refreshIcon = await page.locator('label:has-text("Refresh Interval") .help-icon[data-tooltip="GRAFANA_REFRESH"]');
    await expect(refreshIcon).toBeVisible();
    console.log('✓ GRAFANA_REFRESH help icon found');

    const kioskIcon = await page.locator('label:has-text("Kiosk Mode") .help-icon[data-tooltip="GRAFANA_KIOSK"]');
    await expect(kioskIcon).toBeVisible();
    console.log('✓ GRAFANA_KIOSK help icon found');

    const authModeIcon = await page.locator('label:has-text("Auth Mode") .help-icon[data-tooltip="GRAFANA_AUTH_MODE"]');
    await expect(authModeIcon).toBeVisible();
    console.log('✓ GRAFANA_AUTH_MODE help icon found');

    const authTokenIcon = await page.locator('label:has-text("Auth Token (optional)") .help-icon[data-tooltip="GRAFANA_AUTH_TOKEN"]');
    await expect(authTokenIcon).toBeVisible();
    console.log('✓ GRAFANA_AUTH_TOKEN help icon found');
  });

  test('should have help icons for Cards Builder settings', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab (use desktop nav)
    await page.click('[data-nav="desktop"][data-tab="rag"]');
    await page.waitForTimeout(500);

    // Click on Data Quality subtab
    await page.click('[data-subtab="data-quality"]');
    await page.waitForTimeout(500);

    // Verify help icons are present for Cards settings
    const cardsRepoIcon = await page.locator('label:has-text("Repository to Build Cards For") .help-icon[data-tooltip="CARDS_REPO"]');
    await expect(cardsRepoIcon).toBeVisible();
    console.log('✓ CARDS_REPO help icon found');

    const excludeDirsIcon = await page.locator('label:has-text("Exclude Directories") .help-icon[data-tooltip="CARDS_EXCLUDE_DIRS"]');
    await expect(excludeDirsIcon).toBeVisible();
    console.log('✓ CARDS_EXCLUDE_DIRS help icon found');

    const excludePatternsIcon = await page.locator('label:has-text("Exclude Patterns") .help-icon[data-tooltip="CARDS_EXCLUDE_PATTERNS"]');
    await expect(excludePatternsIcon).toBeVisible();
    console.log('✓ CARDS_EXCLUDE_PATTERNS help icon found');

    const excludeKeywordsIcon = await page.locator('label:has-text("Exclude Keywords") .help-icon[data-tooltip="CARDS_EXCLUDE_KEYWORDS"]');
    await expect(excludeKeywordsIcon).toBeVisible();
    console.log('✓ CARDS_EXCLUDE_KEYWORDS help icon found');

    const cardsMaxIcon = await page.locator('label:has-text("Cards Max") .help-icon[data-tooltip="CARDS_MAX"]');
    await expect(cardsMaxIcon).toBeVisible();
    console.log('✓ CARDS_MAX help icon found');
  });

  test('should have help icons for RAG retrieval settings', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab (use desktop nav)
    await page.click('[data-nav="desktop"][data-tab="rag"]');
    await page.waitForTimeout(500);

    // Click on Retrieval subtab
    await page.click('[data-subtab="retrieval"]');
    await page.waitForTimeout(500);

    // Verify Vector Backend has help icon
    const vectorBackendIcon = await page.locator('label:has-text("Vector Backend") .help-icon[data-tooltip="VECTOR_BACKEND"]');
    await expect(vectorBackendIcon).toBeVisible();
    console.log('✓ VECTOR_BACKEND help icon found');
  });
});
