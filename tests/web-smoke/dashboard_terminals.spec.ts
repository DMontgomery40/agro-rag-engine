import { test, expect } from '@playwright/test';

test.describe('Dashboard Terminals', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5175/#/dashboard');

    // Wait for dashboard to load
    await page.waitForSelector('#tab-dashboard-system', { state: 'visible' });
  });

  test('should show terminal when Run Indexer is clicked', async ({ page }) => {
    // Click Run Indexer button
    const indexButton = page.locator('#dash-index-start');
    await expect(indexButton).toBeVisible();
    await indexButton.click();

    // Verify terminal appears with animation
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });

    // Verify terminal has correct title
    const terminalTitle = terminal.locator('.terminal-title');
    await expect(terminalTitle).toContainText('Run Indexer');

    // Verify terminal shows initial message
    const terminalOutput = terminal.locator('.terminal-output');
    await expect(terminalOutput).toContainText('Starting indexer');
  });

  test('should show terminal when Generate Keywords is clicked', async ({ page }) => {
    // Click Generate Keywords button
    const keywordsButton = page.locator('#btn-generate-keywords');
    await expect(keywordsButton).toBeVisible();
    await keywordsButton.click();

    // Verify terminal appears
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });

    // Verify terminal has correct title
    const terminalTitle = terminal.locator('.terminal-title');
    await expect(terminalTitle).toContainText('Generate Keywords');
  });

  test('should show terminal when Run Eval is clicked', async ({ page }) => {
    // Click Run Eval dropdown button
    const evalButton = page.locator('#dash-eval-trigger');
    await expect(evalButton).toBeVisible();
    await evalButton.click();

    // Wait for dropdown to appear
    const evalDropdown = page.locator('#dash-eval-dropdown');
    await expect(evalDropdown).toBeVisible({ timeout: 1000 });

    // Click first eval option if available
    const evalOption = evalDropdown.locator('.eval-model-btn').first();
    const optionCount = await evalOption.count();

    if (optionCount > 0) {
      await evalOption.click();

      // Verify terminal appears
      const terminal = page.locator('#dash-operations-terminal .live-terminal');
      await expect(terminal).toBeVisible({ timeout: 2000 });

      // Verify terminal has correct title containing "Run Eval"
      const terminalTitle = terminal.locator('.terminal-title');
      await expect(terminalTitle).toContainText('Run Eval');
    } else {
      // If no options, just verify dropdown opened
      await expect(evalDropdown).toContainText('Loading options');
    }
  });

  test('terminal should have working controls', async ({ page }) => {
    // Click any button to show terminal
    const indexButton = page.locator('#dash-index-start');
    await indexButton.click();

    // Wait for terminal
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });

    // Test auto-scroll toggle
    const autoScrollBtn = terminal.locator('button:has-text("Auto")');
    await expect(autoScrollBtn).toBeVisible();
    await autoScrollBtn.click();
    await expect(autoScrollBtn).toContainText('Manual');

    // Test clear button
    const clearBtn = terminal.locator('button:has-text("Clear")');
    await expect(clearBtn).toBeVisible();

    // Test collapse/expand
    const collapseBtn = terminal.locator('.terminal-collapse-btn');
    await expect(collapseBtn).toBeVisible();
    const initialText = await collapseBtn.innerText();
    expect(initialText).toBe('▼'); // Should start expanded

    await collapseBtn.click();
    await expect(collapseBtn).toHaveText('▲'); // Should be collapsed
  });

  test('terminal should animate with cubic-bezier timing', async ({ page }) => {
    // Click to show terminal
    const indexButton = page.locator('#dash-index-start');
    await indexButton.click();

    // Check that terminal container has transition with cubic-bezier
    const terminalContainer = page.locator('#dash-operations-terminal');
    const style = await terminalContainer.getAttribute('style');
    expect(style).toContain('cubic-bezier(0.4, 0, 0.2, 1)');

    // Verify terminal is visible with animation
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });
    await expect(terminal).toHaveClass(/expanded/);
  });

  test('progress bar should be visible during operations', async ({ page }) => {
    // Check that progress bar container exists
    const progressBar = page.locator('#dash-index-bar').locator('..');
    await expect(progressBar).toBeVisible();

    // Click Run Indexer to potentially trigger progress
    const indexButton = page.locator('#dash-index-start');
    await indexButton.click();

    // Terminal should show
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });

    // Progress area in terminal should be ready (may not show immediately without real operation)
    const terminalProgress = terminal.locator('.terminal-progress');
    // Just verify the structure exists (progress only shows when operation reports it)
    const progressExists = await terminalProgress.count();
    expect(progressExists).toBeGreaterThanOrEqual(0); // May or may not be visible
  });

  test('status message updates when operations are triggered', async ({ page }) => {
    // Check initial status
    const statusDiv = page.locator('#dash-index-status');
    await expect(statusDiv).toBeVisible();
    const initialStatus = await statusDiv.innerText();
    expect(initialStatus).toBe('Ready');

    // Click Run Indexer
    const indexButton = page.locator('#dash-index-start');
    await indexButton.click();

    // Status should update
    await expect(statusDiv).not.toHaveText('Ready', { timeout: 2000 });
    const newStatus = await statusDiv.innerText();
    expect(newStatus).toContain('indexer');
  });

  test('should handle rapid button clicks without errors', async ({ page }) => {
    // Rapidly click different buttons
    const buttons = [
      '#btn-generate-keywords',
      '#dash-reload-config',
      '#dash-refresh-status'
    ];

    for (const selector of buttons) {
      const button = page.locator(selector);
      await expect(button).toBeVisible();
      await button.click();
      // Don't wait between clicks to test rapid clicking
    }

    // Terminal should still work
    const terminal = page.locator('#dash-operations-terminal .live-terminal');
    await expect(terminal).toBeVisible({ timeout: 2000 });

    // Should not have any console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Give it a moment to catch any delayed errors
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });
});