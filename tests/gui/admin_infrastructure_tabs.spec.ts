import { test, expect } from '@playwright/test';

test.describe('Admin and Infrastructure Tabs - Black Screen Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gui/');
    await page.waitForSelector('.tab-bar');
  });

  test('Admin tab renders without black screen', async ({ page }) => {
    // Click Admin tab
    await page.locator("button[data-tab='admin']").first().click();
    await page.waitForTimeout(500);

    // Verify tab is visible and not completely black
    const adminTab = page.locator('#tab-admin');
    await expect(adminTab).toBeVisible();

    // Check that General subtab content is visible
    const generalContent = page.locator('#tab-admin-general');
    await expect(generalContent).toBeVisible();

    // Verify some content is rendered (e.g., theme selector)
    const themeLabel = page.locator('label:has-text("Theme Mode")');
    await expect(themeLabel).toBeVisible();
  });

  test('Admin subtab switching works', async ({ page }) => {
    // Click Admin tab
    await page.locator("button[data-tab='admin']").first().click();
    await page.waitForTimeout(500);

    // Default should be General
    const generalContent = page.locator('#tab-admin-general');
    await expect(generalContent).toBeVisible();

    // Click Git Integration subtab
    await page.locator(".subtab-bar #admin-subtabs button[data-subtab='git']").click();
    await page.waitForTimeout(300);

    // Git content should be visible
    const gitContent = page.locator('#tab-admin-git');
    await expect(gitContent).toBeVisible();

    // Switch to Secrets
    await page.locator(".subtab-bar #admin-subtabs button[data-subtab='secrets']").click();
    await page.waitForTimeout(300);

    const secretsContent = page.locator('#tab-admin-secrets');
    await expect(secretsContent).toBeVisible();

    // Switch to Integrations
    await page.locator(".subtab-bar #admin-subtabs button[data-subtab='integrations']").click();
    await page.waitForTimeout(300);

    const integrationsContent = page.locator('#tab-admin-integrations');
    await expect(integrationsContent).toBeVisible();
  });

  test('Infrastructure tab renders without black screen', async ({ page }) => {
    // Click Infrastructure tab
    await page.locator("button[data-tab='infrastructure']").first().click();
    await page.waitForTimeout(500);

    // Verify tab is visible and not completely black
    const infraTab = page.locator('#tab-infrastructure');
    await expect(infraTab).toBeVisible();

    // Check that Services subtab content is visible
    const servicesContent = page.locator('#tab-infrastructure-services');
    await expect(servicesContent).toBeVisible();

    // Verify some content is rendered (e.g., Qdrant service)
    const qdrantElement = page.locator('text=Qdrant').first();
    await expect(qdrantElement).toBeVisible();
  });

  test('Infrastructure subtab switching works', async ({ page }) => {
    // Click Infrastructure tab
    await page.locator("button[data-tab='infrastructure']").first().click();
    await page.waitForTimeout(500);

    // Default should be Services
    const servicesContent = page.locator('#tab-infrastructure-services');
    await expect(servicesContent).toBeVisible();

    // Click MCP Servers subtab
    await page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='mcp']").click();
    await page.waitForTimeout(300);

    // MCP content should be visible
    const mcpContent = page.locator('#tab-infrastructure-mcp');
    await expect(mcpContent).toBeVisible();

    // Switch to Paths
    await page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='paths']").click();
    await page.waitForTimeout(300);

    const pathsContent = page.locator('#tab-infrastructure-paths');
    await expect(pathsContent).toBeVisible();

    // Switch to Monitoring
    await page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='monitoring']").click();
    await page.waitForTimeout(300);

    const monitoringContent = page.locator('#tab-infrastructure-monitoring');
    await expect(monitoringContent).toBeVisible();
  });

  test('Admin tab subtab buttons have active class', async ({ page }) => {
    // Click Admin tab
    await page.locator("button[data-tab='admin']").first().click();
    await page.waitForTimeout(500);

    // General should be active initially
    let generalBtn = page.locator(".subtab-bar #admin-subtabs button[data-subtab='general']");
    await expect(generalBtn).toHaveClass(/active/);

    // Click Git Integration
    await page.locator(".subtab-bar #admin-subtabs button[data-subtab='git']").click();
    await page.waitForTimeout(300);

    // Git should now be active
    let gitBtn = page.locator(".subtab-bar #admin-subtabs button[data-subtab='git']");
    await expect(gitBtn).toHaveClass(/active/);
  });

  test('Infrastructure tab subtab buttons have active class', async ({ page }) => {
    // Click Infrastructure tab
    await page.locator("button[data-tab='infrastructure']").first().click();
    await page.waitForTimeout(500);

    // Services should be active initially
    let servicesBtn = page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='services']");
    await expect(servicesBtn).toHaveClass(/active/);

    // Click MCP Servers
    await page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='mcp']").click();
    await page.waitForTimeout(300);

    // MCP should now be active
    let mcpBtn = page.locator(".subtab-bar #infrastructure-subtabs button[data-subtab='mcp']");
    await expect(mcpBtn).toHaveClass(/active/);
  });

  test('Tab content does not show black screen when switching between Admin and Infrastructure', async ({ page }) => {
    // Switch to Admin
    await page.locator("button[data-tab='admin']").first().click();
    await page.waitForTimeout(300);
    let adminTab = page.locator('#tab-admin');
    await expect(adminTab).toBeVisible();

    // Switch to Infrastructure
    await page.locator("button[data-tab='infrastructure']").first().click();
    await page.waitForTimeout(300);
    let infraTab = page.locator('#tab-infrastructure');
    await expect(infraTab).toBeVisible();

    // Switch back to Admin
    await page.locator("button[data-tab='admin']").first().click();
    await page.waitForTimeout(300);
    adminTab = page.locator('#tab-admin');
    await expect(adminTab).toBeVisible();

    // Content should still be visible
    const generalContent = page.locator('#tab-admin-general');
    await expect(generalContent).toBeVisible();
  });
});
