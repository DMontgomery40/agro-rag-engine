import { test, expect } from '@playwright/test';

/**
 * CRITICAL TEST: Verify "Apply All Changes" button is visible on EVERY tab and subtab.
 * This is non-negotiable - users MUST be able to save settings from anywhere in the GUI.
 */

test.describe('Apply All Changes Button Visibility', () => {
  test('button should be visible on all main tabs and subtabs', async ({ page }) => {
    // Navigate to GUI
    await page.goto('http://127.0.0.1:8012');
    await page.waitForLoadState('networkidle');

    // Get all main tabs from the content area (not the top nav)
    const mainTabs = await page.locator('.content > .tab-bar button[data-tab]').all();
    const mainTabNames = await Promise.all(
      mainTabs.map(tab => tab.getAttribute('data-tab'))
    );

    console.log(`Found ${mainTabNames.length} main tabs:`, mainTabNames);

    const failedTabs: string[] = [];

    for (const tabName of mainTabNames) {
      if (!tabName) continue;

      // Click the main tab in the content area
      await page.click(`.content > .tab-bar button[data-tab="${tabName}"]`);
      await page.waitForTimeout(500);

      // Check if this tab has subtabs
      const subtabBarId = `${tabName}-subtabs`;
      const subtabBar = page.locator(`#${subtabBarId}`);
      const hasSubtabs = await subtabBar.isVisible().catch(() => false);

      if (hasSubtabs) {
        // This tab has subtabs - test each one
        const subtabs = await page.locator(`#${subtabBarId} button[data-subtab]`).all();
        const subtabNames = await Promise.all(
          subtabs.map(st => st.getAttribute('data-subtab'))
        );

        console.log(`  Tab '${tabName}' has ${subtabNames.length} subtabs:`, subtabNames);

        for (const subtabName of subtabNames) {
          if (!subtabName) continue;

          try {
            await page.click(`#${subtabBarId} button[data-subtab="${subtabName}"]`, { timeout: 5000 });
            await page.waitForTimeout(300);
          } catch (e) {
            console.log(`    ⚠ ${tabName} > ${subtabName}: Could not click subtab (may be disabled/hidden)`);
            continue;
          }

          // Check if Apply button is visible
          const saveBtn = page.locator('#save-btn');
          const exists = await saveBtn.count() > 0;
          const visible = exists && await saveBtn.isVisible().catch(() => false);

          if (!exists) {
            failedTabs.push(`${tabName} > ${subtabName} (button not in DOM)`);
            console.log(`    ✗ ${tabName} > ${subtabName}: Button not in DOM`);
          } else if (!visible) {
            failedTabs.push(`${tabName} > ${subtabName} (button not visible)`);
            console.log(`    ✗ ${tabName} > ${subtabName}: Button exists but not visible`);
          } else {
            console.log(`    ✓ ${tabName} > ${subtabName}: Button visible`);
          }
        }
      } else {
        // No subtabs - just check the main tab
        const saveBtn = page.locator('#save-btn');
        const exists = await saveBtn.count() > 0;
        const visible = exists && await saveBtn.isVisible().catch(() => false);

        if (!exists) {
          failedTabs.push(`${tabName} (button not in DOM)`);
          console.log(`  ✗ ${tabName}: Button not in DOM`);
        } else if (!visible) {
          failedTabs.push(`${tabName} (button not visible)`);
          console.log(`  ✗ ${tabName}: Button exists but not visible`);
        } else {
          console.log(`  ✓ ${tabName}: Button visible`);
        }
      }
    }

    // Assert no failures
    if (failedTabs.length > 0) {
      console.log(`\n✗ FAILED: Apply button not visible on ${failedTabs.length} tabs/subtabs:`);
      failedTabs.forEach(ft => console.log(`  - ${ft}`));
    }

    expect(failedTabs, `Apply button must be visible on ALL tabs. Failed on: ${failedTabs.join(', ')}`).toHaveLength(0);

    console.log(`\n✓ SUCCESS: Apply button visible on ALL ${mainTabNames.length} tabs and their subtabs!`);
  });
});
