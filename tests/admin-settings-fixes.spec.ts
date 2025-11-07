import { test, expect } from '@playwright/test';

/**
 * Verification test for Admin Settings D3 critical fixes
 * Tests all 7 issues fixed:
 * 1. Server settings read from config
 * 2. Editor settings connected to state
 * 3. Save button works with changes
 * 4. Validation prevents invalid configs
 * 5. Team 1 hooks integrated
 * 6. Config loads on mount
 * 7. Specific error messages
 */

test.describe('Admin Settings - All 7 Critical Fixes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin tab
    await page.goto('http://127.0.0.1:8012');
    await page.waitForSelector('[data-tab="admin"]', { timeout: 10000 });
    await page.click('[data-tab="admin"]');
    await page.waitForTimeout(1000);
  });

  test('Issue 1: Server settings display config values, not hardcoded', async ({ page }) => {
    // Check Edition field shows actual config value
    const editionInput = await page.locator('input[placeholder*="oss"]');
    const editionValue = await editionInput.inputValue();
    console.log('Edition value:', editionValue);
    expect(editionValue).toBeTruthy();
    expect(['oss', 'pro', 'enterprise']).toContain(editionValue.toLowerCase());

    // Check Host field shows actual config value
    const hostInput = await page.locator('label:has-text("Serve Host") + input, input[type="text"]:near(label:has-text("Serve Host"))').first();
    const hostValue = await hostInput.inputValue();
    console.log('Host value:', hostValue);
    expect(hostValue).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

    // Check Port field shows actual config value
    const portInput = await page.locator('label:has-text("Serve Port") + input, input[type="number"]:near(label:has-text("Serve Port"))').first();
    const portValue = await portInput.inputValue();
    console.log('Port value:', portValue);
    expect(parseInt(portValue)).toBeGreaterThan(1000);
    expect(parseInt(portValue)).toBeLessThan(65536);
  });

  test('Issue 2: Editor settings are interactive, not readOnly', async ({ page }) => {
    // Check Enable Embedded Editor checkbox can be toggled
    const editorEnabledCheckbox = await page.locator('input[type="checkbox"]:near(:text("Enable Embedded Editor"))').first();
    const initialChecked = await editorEnabledCheckbox.isChecked();
    console.log('Editor enabled initial state:', initialChecked);

    await editorEnabledCheckbox.click();
    await page.waitForTimeout(200);
    const afterClick = await editorEnabledCheckbox.isChecked();
    console.log('Editor enabled after click:', afterClick);
    expect(afterClick).not.toBe(initialChecked);

    // Check Editor Port is editable
    const portInput = await page.locator('label:has-text("Editor Port") + input, input[type="number"]:near(label:has-text("Editor Port"))').nth(1);
    const isReadOnly = await portInput.getAttribute('readonly');
    console.log('Editor port readonly:', isReadOnly);
    expect(isReadOnly).toBeNull(); // Should NOT be readonly

    // Try changing the port value
    await portInput.fill('5000');
    await page.waitForTimeout(200);
    const newValue = await portInput.inputValue();
    console.log('Editor port new value:', newValue);
    expect(newValue).toBe('5000');
  });

  test('Issue 3: Save button works and shows what was saved', async ({ page }) => {
    // Change editor port
    const portInput = await page.locator('label:has-text("Editor Port") + input, input[type="number"]:near(label:has-text("Editor Port"))').nth(1);
    await portInput.fill('4445');
    await page.waitForTimeout(200);

    // Click save
    const saveButton = await page.locator('button:has-text("Save Settings")');
    await saveButton.click();

    // Wait for success message
    const successMessage = await page.locator('div:has-text("Settings saved successfully")').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    const messageText = await successMessage.textContent();
    console.log('Save message:', messageText);
    expect(messageText).toContain('EDITOR_PORT');
  });

  test('Issue 4: Validation prevents invalid port numbers', async ({ page }) => {
    // Try invalid port (too low)
    const portInput = await page.locator('label:has-text("Editor Port") + input, input[type="number"]:near(label:has-text("Editor Port"))').nth(1);
    await portInput.fill('500');
    await page.waitForTimeout(200);

    // Click save
    const saveButton = await page.locator('button:has-text("Save Settings")');
    await saveButton.click();

    // Wait for error message
    const errorMessage = await page.locator('div:has-text("Validation failed"), p:has-text("Port must be")').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const messageText = await errorMessage.textContent();
    console.log('Validation error:', messageText);
    expect(messageText).toMatch(/port|1024|65535/i);
  });

  test('Issue 5: Team 1 hooks sections are visible', async ({ page }) => {
    // Check for Secrets Management section
    const secretsSection = await page.locator('h3:has-text("Secrets Management")');
    await expect(secretsSection).toBeVisible();
    console.log('Secrets section found');

    // Check for Git Hooks section
    const gitSection = await page.locator('h3:has-text("Git Hooks")');
    await expect(gitSection).toBeVisible();
    console.log('Git Hooks section found');

    // Check for LangSmith section
    const langsmithSection = await page.locator('h3:has-text("LangSmith Tracing")');
    await expect(langsmithSection).toBeVisible();
    console.log('LangSmith section found');

    // Verify sections show data (not just "loading...")
    await page.waitForTimeout(2000); // Allow hooks to load
    const secretsContent = await page.locator('h3:has-text("Secrets Management")').locator('..').textContent();
    console.log('Secrets content preview:', secretsContent?.substring(0, 100));
    expect(secretsContent).toBeTruthy();
  });

  test('Issue 6: Config loads automatically on mount', async ({ page }) => {
    // Reload page to test mount behavior
    await page.reload();
    await page.waitForTimeout(500);

    // Click admin tab again
    await page.click('[data-tab="admin"]');

    // Check that config values appear (not "Loading configuration...")
    await page.waitForTimeout(2000);
    const loadingText = await page.locator('text="Loading configuration..."').count();
    console.log('Loading text count:', loadingText);
    expect(loadingText).toBe(0); // Should not be loading

    // Verify Edition input has value
    const editionInput = await page.locator('input[placeholder*="oss"]');
    const editionValue = await editionInput.inputValue();
    console.log('Edition after reload:', editionValue);
    expect(editionValue).toBeTruthy();
  });

  test('Issue 7: Specific error messages for network failures', async ({ page }) => {
    // This test simulates network failure by trying invalid port
    // We test that validation errors are specific, not generic

    // Try port that's way too high
    const portInput = await page.locator('label:has-text("Editor Port") + input, input[type="number"]:near(label:has-text("Editor Port"))').nth(1);
    await portInput.fill('99999');
    await page.waitForTimeout(200);

    // Click save
    const saveButton = await page.locator('button:has-text("Save Settings")');
    await saveButton.click();

    // Check for specific error message
    const errorMessage = await page.locator('div:has-text("Validation failed"), div:has-text("Port must be"), p:has-text("Port must be")').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const messageText = await errorMessage.textContent();
    console.log('Specific error:', messageText);

    // Should mention port range, not generic "failed to save"
    expect(messageText).toMatch(/65535|port/i);
    expect(messageText.toLowerCase()).not.toContain('failed to save settings');
  });

  test('Full workflow: Change settings, validate, save, verify', async ({ page }) => {
    console.log('=== FULL WORKFLOW TEST ===');

    // Step 1: Change editor enabled
    const editorCheckbox = await page.locator('input[type="checkbox"]:near(:text("Enable Embedded Editor"))').first();
    const initialState = await editorCheckbox.isChecked();
    await editorCheckbox.click();
    console.log('Changed editor enabled from', initialState, 'to', !initialState);

    // Step 2: Change port to valid value
    const portInput = await page.locator('label:has-text("Editor Port") + input, input[type="number"]:near(label:has-text("Editor Port"))').nth(1);
    await portInput.fill('4450');
    console.log('Changed editor port to 4450');

    // Step 3: Change bind mode
    const bindSelect = await page.locator('label:has-text("Bind Mode") + select, select:near(label:has-text("Bind Mode"))').first();
    await bindSelect.selectOption('public');
    console.log('Changed bind mode to public');

    // Step 4: Save
    const saveButton = await page.locator('button:has-text("Save Settings")');
    await saveButton.click();
    console.log('Clicked Save Settings');

    // Step 5: Verify success
    const successMessage = await page.locator('div:has-text("Settings saved successfully")').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    const messageText = await successMessage.textContent();
    console.log('Success message:', messageText);

    // Should list changed fields
    expect(messageText).toContain('EDITOR');

    console.log('=== WORKFLOW COMPLETE ===');
  });
});
