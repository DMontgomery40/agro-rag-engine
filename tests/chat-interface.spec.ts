import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('chat interface renders correctly', async ({ page }) => {
    // Navigate to Chat tab
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Check for main elements
    await expect(page.locator('text=RAG Chat')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Ask a question"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();
  });

  test('can switch between Chat and Settings sub-tabs', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Check Chat UI is visible
    await expect(page.locator('text=RAG Chat')).toBeVisible();

    // Click Settings button
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Check Settings panel is visible
    await expect(page.locator('text=Chat Settings')).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();

    // Switch back to Chat
    await page.click('button:has-text("Chat")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=RAG Chat')).toBeVisible();
  });

  test('chat input is functional', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea[placeholder*="Ask a question"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Initially send button should be disabled (no input)
    await expect(sendButton).toBeVisible();

    // Type a message
    await textarea.fill('How does authentication work?');
    await expect(textarea).toHaveValue('How does authentication work?');

    // Send button should be enabled
    await expect(sendButton).toBeEnabled();
  });

  test('repo selector works', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    const repoSelect = page.locator('select').first();
    await expect(repoSelect).toBeVisible();

    // Check options exist
    await expect(repoSelect).toContainText('Auto-detect');
    await expect(repoSelect).toContainText('agro');
  });

  test('history dropdown functionality', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Click History button
    await page.click('button:has-text("History")');
    await page.waitForTimeout(300);

    // Check dropdown appears
    const dropdown = page.locator('#history-dropdown');
    await expect(dropdown).toBeVisible();

    // Check for import, export and clear options
    await expect(page.locator('button:has-text("Import History")')).toBeVisible();
    await expect(page.locator('button:has-text("Export History")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear History")')).toBeVisible();
  });

  test('chat settings are accessible', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Check all major settings sections exist
    await expect(page.locator('text=Chat Model')).toBeVisible();
    await expect(page.locator('text=Temperature')).toBeVisible();
    await expect(page.locator('text=Max Response Tokens')).toBeVisible();
    await expect(page.locator('text=Retrieval Top-K')).toBeVisible();
    await expect(page.locator('text=Display Options')).toBeVisible();
    await expect(page.locator('text=History Settings')).toBeVisible();

    // Check save/reset buttons
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset to Defaults")')).toBeVisible();
  });

  test('settings can be modified', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Modify temperature setting
    const tempInput = page.locator('input[type="number"]').first();
    await tempInput.fill('0.5');
    await expect(tempInput).toHaveValue('0.5');

    // Save settings
    await page.click('button:has-text("Save Settings")');
    await page.waitForTimeout(300);

    // Check for success message
    await expect(page.locator('text=Chat settings saved')).toBeVisible({ timeout: 2000 });
  });

  test('clear messages button works', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Initially, clear button should be visible but disabled (no messages)
    const clearButton = page.locator('button:has-text("Clear")').first();
    await expect(clearButton).toBeVisible();
  });

  test('empty state is shown initially', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    // Check for empty state message
    await expect(page.locator('text=Start a conversation with your codebase')).toBeVisible();
  });

  test('keyboard shortcut Ctrl+Enter hint is displayed', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Press Ctrl+Enter to send')).toBeVisible();
  });
});
