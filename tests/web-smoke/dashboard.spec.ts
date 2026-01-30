import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the dashboard to be visible
    await expect(page.locator('#tab-dashboard')).toBeVisible();
  });

  test('should open terminal and show output when "Run Indexer" is clicked', async ({ page }) => {
    await page.locator('#dash-index-start').click();

    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible();
    await expect(terminal.locator('.terminal-title')).toHaveText('Run Indexer');

    // Wait for the live stream to report the clean indexer banner
    await expect(terminal.locator('.terminal-output')).toContainText('=== Clean Indexer v2 ===', {
      timeout: 15000
    });
  });

  test('should open terminal when "Generate Keywords" is clicked', async ({ page }) => {
    await page.locator('#btn-generate-keywords').click();

    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible();
    await expect(terminal.locator('.terminal-title')).toHaveText('Generate Keywords');
  });

  test('should open "Run Eval" dropdown and show options', async ({ page }) => {
    await page.locator('#dash-eval-trigger').click();

    const dropdown = page.locator('#dash-eval-dropdown');
    await expect(dropdown).toBeVisible();

    // Check that there are options loaded
    const options = await dropdown.locator('button').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should open terminal when an eval option is clicked', async ({ page }) => {
    await page.locator('#dash-eval-trigger').click();
    
    const dropdown = page.locator('#dash-eval-dropdown');
    await expect(dropdown).toBeVisible();

    // Click the first option
    await dropdown.locator('button').first().click();

    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible();
    await expect(terminal.locator('.terminal-title')).toContainText('Evaluate');
  });

  test('should populate branch name in system stats', async ({ page }) => {
    const branchLocator = page.locator('#dash-branch');
    await page.waitForFunction(() => {
      const el = document.querySelector('#dash-branch');
      return el ? el.textContent?.trim() !== '—' : false;
    });
    await expect(branchLocator).not.toHaveText('—');
    const branchName = (await branchLocator.innerText()).trim();
    expect(branchName).not.toBe('—');
    expect(branchName.length).toBeGreaterThan(0);
  });
});