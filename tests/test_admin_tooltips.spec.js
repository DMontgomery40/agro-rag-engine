/**
 * Test: Admin Tab Tooltips
 * Verifies that all Admin tab parameters have working tooltips with proper content
 */

const { test, expect } = require('@playwright/test');

// List of Admin parameters that should have tooltips
const ADMIN_PARAMS = [
  // Infrastructure
  'THEME_MODE',
  'HOST',
  'PORT',
  'OPEN_BROWSER',
  'DATA_DIR',
  'AUTO_COLIMA',
  'COLIMA_PROFILE',
  'DEV_LOCAL_UVICORN',

  // Editor
  'EDITOR_ENABLED',
  'EDITOR_PORT',
  'EDITOR_BIND',
  'EDITOR_EMBED_ENABLED',

  // MCP
  'MCP_HTTP_HOST',
  'MCP_HTTP_PORT',
  'MCP_HTTP_PATH',

  // Observability - Tracing
  'TRACING_ENABLED',
  'TRACING_MODE',
  'TRACE_AUTO_LS',
  'TRACE_RETENTION',

  // Observability - LangChain/LangSmith
  'LANGSMITH_API_KEY',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_PROJECT',
  'LANGCHAIN_ENDPOINT',

  // Observability - Langtrace
  'LANGTRACE_API_KEY',
  'LANGTRACE_API_HOST',
  'LANGTRACE_PROJECT_ID',

  // Observability - Metrics
  'PROMETHEUS_PORT',
  'METRICS_ENABLED',
  'LOG_LEVEL',
  'ALERT_WEBHOOK_TIMEOUT',

  // Observability - Grafana
  'GRAFANA_BASE_URL',
  'GRAFANA_AUTH_TOKEN',
  'GRAFANA_AUTH_MODE',
  'GRAFANA_DASHBOARD_UID',

  // Storage
  'QDRANT_URL',
  'REDIS_URL',

  // Repository
  'REPO',
  'COLLECTION_NAME',
  'COLLECTION_SUFFIX',
  'OUT_DIR_BASE',

  // Deployment
  'NETLIFY_API_KEY',
  'NETLIFY_DOMAINS',

  // Edition
  'AGRO_EDITION'
];

test.describe('Admin Tab Tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:8012');
    await page.waitForLoadState('networkidle');

    // Navigate to Admin tab - use desktop nav (not mobile)
    await page.locator('button[data-tab="admin"]:not([data-nav="mobile"])').first().click({ force: true });
    await page.waitForTimeout(500);
  });

  test('should have tooltips for all admin parameters', async ({ page }) => {
    const missingTooltips = [];
    const foundTooltips = [];

    for (const param of ADMIN_PARAMS) {
      // Look for input/select with this name
      const field = page.locator(`input[name="${param}"], select[name="${param}"]`).first();

      if (await field.count() === 0) {
        console.log(`Field ${param} not found in DOM (may be in collapsed subtab)`);
        continue;
      }

      // Check if there's a help icon near this field
      const label = field.locator('xpath=ancestor::div[contains(@class,"input-group")]//label');
      const helpIcon = label.locator('.help-icon');

      if (await helpIcon.count() === 0) {
        missingTooltips.push(param);
      } else {
        foundTooltips.push(param);
      }
    }

    console.log(`Found tooltips for ${foundTooltips.length} parameters`);
    console.log(`Missing tooltips for ${missingTooltips.length} parameters:`, missingTooltips);

    expect(missingTooltips.length).toBe(0);
  });

  test('sample tooltip interaction - THEME_MODE', async ({ page }) => {
    // Find THEME_MODE field
    const themeField = page.locator('select[name="THEME_MODE"]').first();

    if (await themeField.count() > 0) {
      // Find its help icon
      const helpIcon = themeField.locator('xpath=ancestor::div[contains(@class,"input-group")]//span[contains(@class,"help-icon")]').first();

      // Hover to show tooltip
      await helpIcon.hover();
      await page.waitForTimeout(300);

      // Check tooltip bubble appears
      const tooltipBubble = page.locator('.tooltip-bubble').filter({ hasText: 'GUI Theme' });
      await expect(tooltipBubble).toBeVisible();

      // Verify tooltip contains expected content
      const tooltipText = await tooltipBubble.textContent();
      expect(tooltipText).toContain('Color theme');
      expect(tooltipText.toLowerCase()).toContain('light');
      expect(tooltipText.toLowerCase()).toContain('dark');
    }
  });

  test('sample tooltip interaction - TRACING_MODE', async ({ page }) => {
    // Navigate to Observability subtab if needed
    const obsTab = page.locator('button[data-subtab="observability"]');
    if (await obsTab.count() > 0) {
      await obsTab.click();
      await page.waitForTimeout(300);
    }

    // Find TRACING_MODE field
    const tracingField = page.locator('select[name="TRACING_MODE"], input[name="TRACING_MODE"]').first();

    if (await tracingField.count() > 0) {
      // Find its help icon
      const helpIcon = tracingField.locator('xpath=ancestor::div[contains(@class,"input-group")]//span[contains(@class,"help-icon")]').first();

      // Hover to show tooltip
      await helpIcon.hover();
      await page.waitForTimeout(300);

      // Check tooltip bubble appears
      const tooltipBubble = page.locator('.tooltip-bubble').filter({ hasText: 'Tracing Mode' });
      await expect(tooltipBubble).toBeVisible();

      // Verify tooltip contains expected content
      const tooltipText = await tooltipBubble.textContent();
      expect(tooltipText).toContain('backend');
      expect(tooltipText.toLowerCase()).toContain('langsmith');
    }
  });

  test('sample tooltip interaction - GRAFANA_BASE_URL', async ({ page }) => {
    // Navigate to Observability subtab if needed
    const obsTab = page.locator('button[data-subtab="observability"]');
    if (await obsTab.count() > 0) {
      await obsTab.click();
      await page.waitForTimeout(300);
    }

    // Find GRAFANA_BASE_URL field
    const grafanaField = page.locator('input[name="GRAFANA_BASE_URL"]').first();

    if (await grafanaField.count() > 0) {
      // Find its help icon
      const helpIcon = grafanaField.locator('xpath=ancestor::div[contains(@class,"input-group")]//span[contains(@class,"help-icon")]').first();

      // Hover to show tooltip
      await helpIcon.hover();
      await page.waitForTimeout(300);

      // Check tooltip bubble appears
      const tooltipBubble = page.locator('.tooltip-bubble').filter({ hasText: 'Grafana' });
      await expect(tooltipBubble).toBeVisible();

      // Verify tooltip contains expected content
      const tooltipText = await tooltipBubble.textContent();
      expect(tooltipText).toContain('Base URL');
      expect(tooltipText.toLowerCase()).toContain('dashboard');
    }
  });

  test('sample tooltip has links - EDITOR_ENABLED', async ({ page }) => {
    // Find EDITOR_ENABLED field
    const editorField = page.locator('input[name="EDITOR_ENABLED"], select[name="EDITOR_ENABLED"]').first();

    if (await editorField.count() > 0) {
      // Find its help icon
      const helpIcon = editorField.locator('xpath=ancestor::div[contains(@class,"input-group")]//span[contains(@class,"help-icon")]').first();

      // Hover to show tooltip
      await helpIcon.hover();
      await page.waitForTimeout(300);

      // Check tooltip bubble appears and has links
      const tooltipBubble = page.locator('.tooltip-bubble').filter({ hasText: 'Editor' }).first();
      await expect(tooltipBubble).toBeVisible();

      // Verify tooltip has at least one link
      const links = tooltipBubble.locator('a');
      const linkCount = await links.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });
});
