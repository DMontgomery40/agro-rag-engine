import { test, expect } from '@playwright/test';

test.describe('Admin General and Git Integration Subtabs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to admin page via React Router (at /web prefix)
    await page.goto('http://127.0.0.1:8012/web/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('General subtab loads with all settings visible', async ({ page }) => {
    // Click General subtab (should be default)
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Verify sections are visible within the general subtab
    const generalTab = page.locator('#tab-admin-general');
    await expect(generalTab.locator('h3:has-text("Theme & Appearance")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("Server Settings")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("Tracing & Observability")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("Embedded Editor")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("MCP & Channels")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("Alert Notifications")')).toBeVisible();
    await expect(generalTab.locator('h3:has-text("MCP RAG Search")')).toBeVisible();
  });

  test('Theme mode dropdown works', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Find theme mode select
    const themeSelect = page.locator('select').first();
    await expect(themeSelect).toBeVisible();

    // Verify options exist (check count, not visibility - options are not "visible" in DOM)
    const autoOption = await themeSelect.locator('option[value="auto"]').count();
    const darkOption = await themeSelect.locator('option[value="dark"]').count();
    const lightOption = await themeSelect.locator('option[value="light"]').count();
    expect(autoOption).toBe(1);
    expect(darkOption).toBe(1);
    expect(lightOption).toBe(1);

    // Change value
    await themeSelect.selectOption('dark');
    await expect(themeSelect).toHaveValue('dark');
  });

  test('Server settings inputs are editable', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Test HOST input
    const hostInput = page.locator('input[type="text"]').filter({ hasText: '' }).nth(2);
    await hostInput.fill('0.0.0.0');
    await expect(hostInput).toHaveValue('0.0.0.0');

    // Test PORT input
    const portInput = page.locator('input[type="number"]').first();
    await portInput.fill('9000');
    await expect(portInput).toHaveValue('9000');
  });

  test('Tracing settings are configurable', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to tracing section
    await page.locator('text=Tracing & Observability').scrollIntoViewIfNeeded();

    // Test log level select
    const logLevelSelect = page.locator('select').filter({ has: page.locator('option[value="DEBUG"]') });
    await logLevelSelect.selectOption('DEBUG');
    await expect(logLevelSelect).toHaveValue('DEBUG');
  });

  test('Editor checkboxes toggle correctly', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to editor section
    await page.locator('#tab-admin-general h3:has-text("Embedded Editor")').scrollIntoViewIfNeeded();

    // Find checkboxes by their toggle labels within general tab
    const generalTab = page.locator('#tab-admin-general');
    const editorEnabledCheckbox = generalTab.locator('label:has-text("Enable Embedded Editor") input[type="checkbox"]');
    const editorEnabledLabel = generalTab.locator('label:has-text("Enable Embedded Editor")');

    // Test toggling by clicking the label (checkbox is hidden in custom toggle UI)
    const isChecked = await editorEnabledCheckbox.isChecked();
    await editorEnabledLabel.click();
    await expect(editorEnabledCheckbox).toBeChecked({ checked: !isChecked });
  });

  test('MCP channel inputs work', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to MCP section
    await page.locator('#tab-admin-general h3:has-text("MCP & Channels")').scrollIntoViewIfNeeded();

    // Test HTTP model input
    const httpModelInput = page.locator('input[placeholder*="gpt-4"]').first();
    await httpModelInput.fill('claude-sonnet-4');
    await expect(httpModelInput).toHaveValue('claude-sonnet-4');
  });

  test('Webhook configuration inputs are present', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to webhooks section
    await page.locator('#tab-admin-general h3:has-text("Alert Notifications")').scrollIntoViewIfNeeded();

    // Work within the general tab
    const generalTab = page.locator('#tab-admin-general');

    // Verify webhook URL inputs exist
    await expect(generalTab.locator('input[type="password"]').first()).toBeVisible();

    // Verify notification settings section exists
    await expect(generalTab.locator('label:has-text("Enable notifications")')).toBeVisible();

    // Verify save button exists
    await expect(generalTab.locator('button:has-text("Save Webhook Configuration")')).toBeVisible();
  });

  test('Webhook save button sends request', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to webhooks section
    await page.locator('#tab-admin-general h3:has-text("Alert Notifications")').scrollIntoViewIfNeeded();

    // Work within the general tab
    const generalTab = page.locator('#tab-admin-general');

    // Listen for API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/webhooks/config') && response.request().method() === 'POST'
    );

    // Fill in test data
    const slackInput = generalTab.locator('input[placeholder*="hooks.slack.com"]');
    await slackInput.fill('https://hooks.slack.com/services/TEST/TEST/TEST');

    // Click save webhook button
    await generalTab.locator('button:has-text("Save Webhook Configuration")').click();

    // Verify request was sent
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);
  });

  test('MCP RAG Search debug tool runs', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to MCP RAG section
    await page.locator('text=MCP RAG Search').scrollIntoViewIfNeeded();

    // Fill in question
    const questionInput = page.locator('input[placeholder*="OAuth"]');
    await questionInput.fill('test query');
    await expect(questionInput).toHaveValue('test query');

    // Listen for API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/mcp/rag_search')
    );

    // Click run button
    await page.click('button:has-text("Run")');

    // Verify request was sent
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);

    // Verify results appear
    await page.waitForTimeout(1000);
    const resultsDisplay = page.locator('pre.result-display');
    const resultsText = await resultsDisplay.textContent();
    expect(resultsText).not.toBe('');
  });

  test('General settings save button sends request', async ({ page }) => {
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);

    // Scroll to bottom
    await page.locator('button:has-text("Save General Settings")').scrollIntoViewIfNeeded();

    // Listen for API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/config') && response.request().method() === 'POST'
    );

    // Click save button
    await page.click('button:has-text("Save General Settings")');

    // Verify request was sent
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);

    // Wait for alert (success or error)
    await page.waitForTimeout(500);
  });

  test('Git Integration subtab loads correctly', async ({ page }) => {
    // Click Git Integration subtab
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Verify sections are visible within git subtab
    const gitTab = page.locator('#tab-admin-git');
    await expect(gitTab.locator('h2:has-text("Git Integration")')).toBeVisible();
    await expect(gitTab.locator('h3:has-text("Git Hooks")')).toBeVisible();
    await expect(gitTab.locator('h3:has-text("Commit Metadata")')).toBeVisible();
  });

  test('Git hooks status loads', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(500);

    // Wait for status to load
    await page.waitForTimeout(1000);

    // Verify status display exists (it's in a monospace div)
    const statusDisplay = page.locator('div[style*="monospace"]').first();
    const statusText = await statusDisplay.textContent();
    // Status text will be "Installed", "Not Installed", or "Not checked"
    expect(statusText).toBeTruthy();
  });

  test('Install git hooks button works', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Listen for API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/git/hooks/install') && response.request().method() === 'POST'
    );

    // Click install button
    await page.click('button:has-text("Install")');

    // Verify request was sent
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);

    // Wait for alert
    await page.waitForTimeout(500);
  });

  test('Commit metadata inputs are editable', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Scroll to commit metadata section
    await page.locator('h3:has-text("Commit Metadata")').scrollIntoViewIfNeeded();

    // Test agent name input
    const agentNameInput = page.locator('input[placeholder*="Codex"]');
    await agentNameInput.fill('Test Agent');
    await expect(agentNameInput).toHaveValue('Test Agent');

    // Test agent email input
    const agentEmailInput = page.locator('input[placeholder*="agent@example.com"]');
    await agentEmailInput.fill('test@example.com');
    await expect(agentEmailInput).toHaveValue('test@example.com');

    // Test chat session ID input
    const chatSessionInput = page.locator('input[placeholder*="session id"]');
    await chatSessionInput.fill('test-session-123');
    await expect(chatSessionInput).toHaveValue('test-session-123');
  });

  test('Commit metadata checkboxes toggle', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Scroll to commit metadata section
    await page.locator('h3:has-text("Commit Metadata")').scrollIntoViewIfNeeded();

    // Test git user checkbox
    const gitUserCheckbox = page.locator('label:has-text("Set git user.name/email") input[type="checkbox"]');
    const wasChecked = await gitUserCheckbox.isChecked();
    await gitUserCheckbox.click();
    await expect(gitUserCheckbox).toBeChecked({ checked: !wasChecked });

    // Test append trailer checkbox
    const appendCheckbox = page.locator('label:has-text("Append session trailer") input[type="checkbox"]');
    const appendWasChecked = await appendCheckbox.isChecked();
    await appendCheckbox.click();
    await expect(appendCheckbox).toBeChecked({ checked: !appendWasChecked });
  });

  test('Save commit metadata button sends request', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Scroll to save button
    await page.locator('button:has-text("Save Commit Metadata")').scrollIntoViewIfNeeded();

    // Listen for API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/git/commit-meta') && response.request().method() === 'POST'
    );

    // Fill in some data
    const agentNameInput = page.locator('input[placeholder*="Codex"]');
    await agentNameInput.fill('Playwright Test Agent');

    // Click save button
    await page.click('button:has-text("Save Commit Metadata")');

    // Verify request was sent
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);

    // Wait for alert
    await page.waitForTimeout(500);
  });

  test('Auto-index command copyable', async ({ page }) => {
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);

    // Find the readonly input with export command
    const exportInput = page.locator('input[value="export AUTO_INDEX=1"]');
    await expect(exportInput).toBeVisible();
    await expect(exportInput).toHaveAttribute('readonly');

    // Click to copy
    await exportInput.click();

    // Wait for alert
    await page.waitForTimeout(500);
  });

  test('Navigation between General and Git Integration works', async ({ page }) => {
    // Start on General
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Theme & Appearance')).toBeVisible();

    // Switch to Git Integration
    await page.click('[data-subtab="git"]');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Git Hooks (Auto-Index)')).toBeVisible();
    await expect(page.locator('text=Theme & Appearance')).not.toBeVisible();

    // Switch back to General
    await page.click('[data-subtab="general"]');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Theme & Appearance')).toBeVisible();
    await expect(page.locator('text=Git Hooks (Auto-Index)')).not.toBeVisible();
  });
});
