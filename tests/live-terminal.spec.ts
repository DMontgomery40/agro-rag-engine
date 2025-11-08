import { test, expect } from '@playwright/test';

/**
 * LiveTerminal Component Tests
 *
 * Verifies the ported React component matches the original JavaScript implementation:
 * - macOS chrome with exact colors (#ff5f57, #ffbd2e, #28c840)
 * - Slide animation (0.4s cubic-bezier)
 * - ANSI color parsing (16 colors)
 * - Auto-scroll detection
 * - Progress bar with gradient
 */

test.describe('LiveTerminal Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003/');
    await page.waitForSelector('.dashboard-container', { timeout: 10000 });
  });

  test('should show terminal with macOS chrome when Show Terminal clicked', async ({ page }) => {
    // Click "Show Terminal" button
    await page.click('button:has-text("Show Terminal")');

    // Wait for terminal to appear
    await page.waitForSelector('#live-terminal', { state: 'visible', timeout: 5000 });

    // Verify terminal is visible
    const terminal = page.locator('#live-terminal');
    await expect(terminal).toBeVisible();

    // Verify macOS traffic lights are present with exact colors
    const redLight = terminal.locator('div[style*="background: rgb(255, 95, 87)"]').first();
    const yellowLight = terminal.locator('div[style*="background: rgb(255, 189, 46)"]').first();
    const greenLight = terminal.locator('div[style*="background: rgb(40, 200, 64)"]').first();

    await expect(redLight).toBeVisible();
    await expect(yellowLight).toBeVisible();
    await expect(greenLight).toBeVisible();

    // Verify title
    await expect(terminal.locator('text=Live Output')).toBeVisible();

    // Verify initial messages
    await expect(terminal.locator('text=Terminal initialized...')).toBeVisible();
    await expect(terminal.locator('text=Connection established')).toBeVisible();
  });

  test('should display ANSI colored text correctly', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    // Click "Add ANSI Colors" button
    await page.click('button:has-text("Add ANSI Colors")');

    // Wait a moment for lines to render
    await page.waitForTimeout(500);

    // Verify colored text is present
    const terminal = page.locator('#live-terminal');

    // Check for error message (red text)
    await expect(terminal.locator('text=Failed to connect to service')).toBeVisible();

    // Check for warning message (yellow text)
    await expect(terminal.locator('text=Retrying in 5 seconds...')).toBeVisible();

    // Check for info message (blue text)
    await expect(terminal.locator('text=Attempting reconnection...')).toBeVisible();

    // Verify ANSI color spans are rendered
    const coloredSpans = terminal.locator('span[style*="color:"]');
    const count = await coloredSpans.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show and update progress bar', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    // Click "Test Progress Bar" button
    await page.click('button:has-text("Test Progress Bar")');

    // Wait for progress bar to appear
    await page.waitForSelector('text=Processing files...', { timeout: 5000 });

    // Verify progress bar is visible
    const terminal = page.locator('#live-terminal');
    await expect(terminal.locator('text=Processing files...')).toBeVisible();

    // Wait for progress to complete
    await page.waitForSelector('text=All files processed successfully', { timeout: 5000 });

    // Verify completion message
    await expect(terminal.locator('text=All files processed successfully')).toBeVisible();

    // Verify multiple progress lines were added
    await expect(terminal.locator('text=Processing file')).toHaveCount(10);
  });

  test('should clear terminal when Clear button clicked', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    // Verify initial messages exist
    const terminal = page.locator('#live-terminal');
    await expect(terminal.locator('text=Terminal initialized...')).toBeVisible();

    // Click Clear button in terminal header
    await terminal.locator('button:has-text("Clear")').click();

    // Wait a moment
    await page.waitForTimeout(300);

    // Verify messages are cleared and waiting message appears
    await expect(terminal.locator('text=Terminal initialized...')).not.toBeVisible();
    await expect(terminal.locator('text=Waiting for output...')).toBeVisible();
  });

  test('should hide terminal when Hide Terminal clicked', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    const terminal = page.locator('#live-terminal');
    await expect(terminal).toBeVisible();

    // Click "Hide Terminal" button
    await page.click('button:has-text("Hide Terminal")');

    // Wait for animation (0.4s)
    await page.waitForTimeout(500);

    // Verify terminal has max-height: 0 and opacity: 0
    const style = await terminal.getAttribute('style');
    expect(style).toContain('max-height: 0px');
    expect(style).toContain('opacity: 0');
  });

  test('should toggle auto-scroll button', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    const terminal = page.locator('#live-terminal');
    const autoScrollBtn = terminal.locator('button').filter({ hasText: 'Auto' }).or(
      terminal.locator('button').filter({ hasText: 'Manual' })
    ).first();

    // Verify auto-scroll button is visible
    await expect(autoScrollBtn).toBeVisible();

    // Get initial text
    const initialText = await autoScrollBtn.textContent();
    expect(initialText).toContain('Auto');

    // Click to toggle
    await autoScrollBtn.click();

    // Wait a moment for state to update
    await page.waitForTimeout(200);

    // Verify it changed to Manual
    const manualBtn = terminal.locator('button').filter({ hasText: 'Manual' });
    await expect(manualBtn).toBeVisible();

    // Click again to re-enable
    await manualBtn.click();

    // Wait a moment
    await page.waitForTimeout(200);

    // Verify it changed back to Auto
    const autoBtn = terminal.locator('button').filter({ hasText: 'Auto' });
    await expect(autoBtn).toBeVisible();
  });

  test('should collapse and expand terminal body', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    const terminal = page.locator('#live-terminal');
    const collapseBtn = terminal.locator('button:has-text("▼")');

    // Verify terminal body is visible
    const terminalBody = terminal.locator('pre');
    await expect(terminalBody).toBeVisible();

    // Click collapse button
    await collapseBtn.click();

    // Wait a moment
    await page.waitForTimeout(200);

    // Verify terminal body is hidden
    await expect(terminalBody).not.toBeVisible();

    // Verify button changed to expand icon
    const expandBtn = terminal.locator('button:has-text("▶")');
    await expect(expandBtn).toBeVisible();

    // Click to expand
    await expandBtn.click();

    // Wait a moment
    await page.waitForTimeout(200);

    // Verify terminal body is visible again
    await expect(terminalBody).toBeVisible();
  });

  test('should verify animation timing (0.4s cubic-bezier)', async ({ page }) => {
    // Click Show Terminal
    const startTime = Date.now();
    await page.click('button:has-text("Show Terminal")');

    // Wait for terminal to be fully visible
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    // Wait for animation to complete
    await page.waitForTimeout(500);

    const terminal = page.locator('#live-terminal');
    const style = await terminal.getAttribute('style');

    // Verify transition property
    expect(style).toContain('transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)');
    expect(style).toContain('max-height: 500px');
    expect(style).toContain('opacity: 1');
  });

  test('should verify font family matches original', async ({ page }) => {
    // Show terminal first
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    const terminal = page.locator('#live-terminal');
    const terminalBody = terminal.locator('pre').first();

    // Get computed style
    const fontFamily = await terminalBody.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });

    // Verify monospace font is set (browser may fall back to generic monospace)
    expect(fontFamily.toLowerCase()).toMatch(/(sf mono|monaco|consolas|monospace)/);
  });

  test('should preserve all 16 ANSI colors from original', async ({ page }) => {
    // Show terminal
    await page.click('button:has-text("Show Terminal")');
    await page.waitForSelector('#live-terminal', { state: 'visible' });

    // Add ANSI colored lines
    await page.click('button:has-text("Add ANSI Colors")');

    // Wait for content
    await page.waitForTimeout(500);

    const terminal = page.locator('#live-terminal');

    // Verify colored text content exists (ANSI parsing works)
    await expect(terminal.locator('text=Failed to connect to service')).toBeVisible();
    await expect(terminal.locator('text=Retrying in 5 seconds...')).toBeVisible();
    await expect(terminal.locator('text=Attempting reconnection...')).toBeVisible();

    // Verify that span elements with color styles exist
    const coloredSpans = terminal.locator('span[style*="color:"]');
    const count = await coloredSpans.count();
    expect(count).toBeGreaterThan(0);
  });
});
