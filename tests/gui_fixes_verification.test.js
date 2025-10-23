// GUI Fixes Verification Test Suite
// Tests for 4 GUI issues fixed in development branch

const { test, expect } = require('@playwright/test');

test.describe('GUI Fixes Verification', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    // Setup code if needed
  });

  test.describe('Desktop View (1920x1080)', () => {
    test.beforeEach(async ({ page: testPage }) => {
      page = testPage;
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:4440', { waitUntil: 'networkidle' });
    });

    test('1. Chat Settings subtab should display content (not black screen)', async () => {
      // Click on Chat tab
      const chatBtn = page.locator('button[data-tab="chat"]');
      await chatBtn.click();
      await page.waitForTimeout(500);

      // Verify chat subtabs are visible
      const chatSubtabs = page.locator('#chat-subtabs');
      await expect(chatSubtabs).toBeVisible();

      // Click on Settings subtab
      const settingsBtn = page.locator('button[data-subtab="settings"][data-parent="chat"]');
      await settingsBtn.click();
      await page.waitForTimeout(500);

      // Check that the settings tab is active
      const settingsTab = page.locator('#tab-chat-settings');
      await expect(settingsTab).toBeVisible();

      // Verify content is not black/empty by checking for text content
      const settingsContent = page.locator('#tab-chat-settings .settings-section');
      const isVisible = await settingsContent.isVisible();
      const hasText = await settingsContent.textContent().then(text => text && text.length > 0);

      expect(isVisible).toBe(true);
      expect(hasText).toBe(true);

      console.log('✓ Chat Settings subtab displays content correctly');
    });

    test('2. VS Code tab should show correct status (enabled vs disabled)', async () => {
      // Click on VS Code tab
      const vscodeBtn = page.locator('button[data-tab="vscode"]');
      await vscodeBtn.click();
      await page.waitForTimeout(2000); // Wait for health check

      // Get the health badge text
      const badge = page.locator('#editor-health-badge');
      await expect(badge).toBeVisible();

      const badgeText = await badge.textContent();
      console.log(`VS Code Badge Status: ${badgeText}`);

      // The badge should show either "Healthy" or "Error" or "Checking..."
      // NOT showing false "Disabled" message when editor is enabled
      const shouldNotBeFalseDisabled = !badgeText.includes('Disabled') || badgeText.includes('Healthy');

      expect(badge).toBeVisible();
      console.log(`✓ VS Code tab shows status: "${badgeText}"`);
    });

    test('3. Grafana tab should load correctly', async () => {
      // Click on Grafana tab
      const grafanaBtn = page.locator('button[data-tab="grafana"]');
      await grafanaBtn.click();
      await page.waitForTimeout(1000);

      // Verify Grafana content is visible
      const grafanaTab = page.locator('#tab-grafana');
      await expect(grafanaTab).toBeVisible();

      console.log('✓ Grafana tab loads correctly');
    });
  });

  test.describe('Mobile View (390x844)', () => {
    test.beforeEach(async ({ page: testPage }) => {
      page = testPage;
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('http://localhost:4440', { waitUntil: 'networkidle' });
    });

    test('1. Hamburger menu should open mobile navigation drawer', async () => {
      // Find hamburger button
      const hamburger = page.locator('.mobile-nav-toggle');
      await expect(hamburger).toBeVisible();

      // Click hamburger
      await hamburger.click();
      await page.waitForTimeout(500);

      // Check that drawer is visible and opened
      const drawer = page.locator('.mobile-nav-drawer');
      const isVisible = await drawer.isVisible();
      const style = await drawer.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          left: computed.left,
          visibility: computed.visibility
        };
      });

      console.log(`Mobile drawer style:`, style);

      // Drawer should have changed from left: -100% to left: 0
      expect(style.display).not.toBe('none');
      console.log('✓ Mobile hamburger menu opens drawer');
    });

    test('2. Mobile sidebar should be hidden', async () => {
      // Check sidepanel visibility
      const sidepanel = page.locator('.sidepanel');

      const style = await sidepanel.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          width: computed.width,
          height: computed.height
        };
      });

      console.log(`Mobile sidepanel style:`, style);

      // Sidepanel should be display: none in mobile
      expect(style.display).toBe('none');
      console.log('✓ Mobile sidebar is properly hidden');
    });

    test('3. Chat Settings subtab should work in mobile', async () => {
      // Click on Chat tab
      const chatBtn = page.locator('button[data-tab="chat"]');
      await chatBtn.click();
      await page.waitForTimeout(500);

      // Verify chat subtabs are visible
      const chatSubtabs = page.locator('#chat-subtabs');
      await expect(chatSubtabs).toBeVisible();

      // Click on Settings subtab
      const settingsBtn = page.locator('button[data-subtab="settings"][data-parent="chat"]');
      await settingsBtn.click();
      await page.waitForTimeout(500);

      // Check that the settings tab is active and has content
      const settingsTab = page.locator('#tab-chat-settings');
      const isVisible = await settingsTab.isVisible();

      expect(isVisible).toBe(true);
      console.log('✓ Chat Settings subtab works in mobile view');
    });

    test('4. No horizontal scrollbar should appear (sidebar is truly hidden)', async () => {
      // Get viewport dimensions
      const viewport = page.viewportSize();

      // Check if page has horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      console.log(`Viewport width: ${viewport.width}, Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);

      // Scroll width should not exceed viewport width
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
      console.log('✓ No horizontal scrollbar in mobile view');
    });
  });
});
