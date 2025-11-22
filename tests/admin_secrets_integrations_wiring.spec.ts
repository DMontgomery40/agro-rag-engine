import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test.describe('Admin Secrets and Integrations Wiring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/web/');
    await page.waitForTimeout(1000);

    // Navigate to Admin tab
    const adminTab = page.locator('a[href="/web/admin"]');
    await expect(adminTab).toBeVisible({ timeout: 10000 });
    await adminTab.click();
    await page.waitForTimeout(1000);
  });

  test('Secrets subtab - API key save works', async ({ page }) => {
    // Navigate to Secrets subtab
    const secretsSubtab = page.locator('[data-subtab="secrets"]');
    await expect(secretsSubtab).toBeVisible({ timeout: 5000 });
    await secretsSubtab.click();
    await page.waitForTimeout(1000);

    // Wait for content to load and find a visible password input
    const openaiInput = page.locator('input[placeholder="sk-..."]');
    await expect(openaiInput).toBeVisible({ timeout: 10000 });
    await openaiInput.fill('sk-test-key-12345');

    // Click save button
    const saveBtn = page.locator('[data-testid="save-api-keys-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Wait for success status
    const statusMsg = page.locator('[data-testid="secrets-save-status"]');
    await expect(statusMsg).toBeVisible({ timeout: 5000 });
    await expect(statusMsg).toContainText('successfully', { timeout: 5000 });
  });

  test('Secrets subtab - .env file upload works', async ({ page }) => {
    // Navigate to Secrets subtab
    const secretsSubtab = page.locator('[data-subtab="secrets"]');
    await expect(secretsSubtab).toBeVisible({ timeout: 5000 });
    await secretsSubtab.click();
    await page.waitForTimeout(500);

    // Create a temporary .env file
    const tmpDir = os.tmpdir();
    const envFilePath = path.join(tmpDir, 'test.env');
    const envContent = `TEST_KEY_1=value1
TEST_KEY_2=value2
TEST_API_KEY=sk-test-123
# This is a comment
TEST_KEY_3=value3`;

    fs.writeFileSync(envFilePath, envContent);

    try {
      // Upload the file
      const fileInput = page.locator('[data-testid="env-file-upload"]');
      await expect(fileInput).toBeVisible();
      await fileInput.setInputFiles(envFilePath);

      // Wait for upload status
      const uploadStatus = page.locator('[data-testid="secrets-upload-status"]');
      await expect(uploadStatus).toBeVisible({ timeout: 10000 });

      // Check that it shows success and count
      const statusText = await uploadStatus.textContent();
      expect(statusText).toContain('Successfully imported');
      expect(statusText).toMatch(/\d+\s+secrets/); // Should mention number of secrets
    } finally {
      // Clean up temp file
      if (fs.existsSync(envFilePath)) {
        fs.unlinkSync(envFilePath);
      }
    }
  });

  test('Secrets subtab - .env upload error handling', async ({ page }) => {
    // Navigate to Secrets subtab
    const secretsSubtab = page.locator('[data-subtab="secrets"]');
    await expect(secretsSubtab).toBeVisible({ timeout: 5000 });
    await secretsSubtab.click();
    await page.waitForTimeout(500);

    // Create an invalid file (not .env format)
    const tmpDir = os.tmpdir();
    const invalidFilePath = path.join(tmpDir, 'invalid.txt');
    fs.writeFileSync(invalidFilePath, 'this is not env format at all - no equals signs');

    try {
      // Upload the invalid file
      const fileInput = page.locator('[data-testid="env-file-upload"]');
      await fileInput.setInputFiles(invalidFilePath);

      // Should still complete (backend will just return 0 secrets imported)
      const uploadStatus = page.locator('[data-testid="secrets-upload-status"]');
      await expect(uploadStatus).toBeVisible({ timeout: 10000 });
    } finally {
      // Clean up
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });

  test('Integrations subtab - LangSmith settings save works', async ({ page }) => {
    // Navigate to Integrations subtab
    const integrationsSubtab = page.locator('[data-subtab="integrations"]');
    await expect(integrationsSubtab).toBeVisible({ timeout: 5000 });
    await integrationsSubtab.click();
    await page.waitForTimeout(500);

    // Fill in LangSmith API key
    const langsmithKeyInput = page.locator('[data-testid="langsmith-api-key"]');
    await expect(langsmithKeyInput).toBeVisible();
    await langsmithKeyInput.fill('lsv2_test_key_12345');

    // Click save all integrations
    const saveBtn = page.locator('[data-testid="save-integrations-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Wait for success status
    const statusMsg = page.locator('[data-testid="integrations-save-status"]');
    await expect(statusMsg).toBeVisible({ timeout: 10000 });
    await expect(statusMsg).toContainText('successfully', { timeout: 5000 });
  });

  test('Integrations subtab - All settings save properly', async ({ page }) => {
    // Navigate to Integrations subtab
    const integrationsSubtab = page.locator('[data-subtab="integrations"]');
    await expect(integrationsSubtab).toBeVisible({ timeout: 5000 });
    await integrationsSubtab.click();
    await page.waitForTimeout(500);

    // Fill in various integration settings
    const langsmithKeyInput = page.locator('[data-testid="langsmith-api-key"]');
    await langsmithKeyInput.fill('lsv2_test_full_12345');

    // The inputs don't all have test IDs, but we can verify the save button works
    // In a real test we'd fill more fields, but for now we test that save works

    // Click save
    const saveBtn = page.locator('[data-testid="save-integrations-btn"]');
    await saveBtn.click();

    // Verify success
    const statusMsg = page.locator('[data-testid="integrations-save-status"]');
    await expect(statusMsg).toBeVisible({ timeout: 10000 });
    await expect(statusMsg).toContainText('successfully');

    // Verify no error styling
    const bgColor = await statusMsg.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    // Should be green (ok), not red (error)
    // We can't easily check the CSS variable, but we can verify the message doesn't say "Error"
    const statusText = await statusMsg.textContent();
    expect(statusText).not.toContain('Error');
    expect(statusText).not.toContain('Failed');
  });

  test('Full workflow - Save secrets then integrations', async ({ page }) => {
    // First, save some API keys in Secrets
    const secretsSubtab = page.locator('[data-subtab="secrets"]');
    await secretsSubtab.click();
    await page.waitForTimeout(1000);

    const openaiInput = page.locator('input[placeholder="sk-..."]');
    await expect(openaiInput).toBeVisible({ timeout: 10000 });
    await openaiInput.fill('sk-workflow-test');

    const saveSecretsBtn = page.locator('[data-testid="save-api-keys-btn"]');
    await saveSecretsBtn.click();

    const secretsStatus = page.locator('[data-testid="secrets-save-status"]');
    await expect(secretsStatus).toBeVisible({ timeout: 5000 });
    await expect(secretsStatus).toContainText('successfully');

    // Now switch to Integrations and save there
    const integrationsSubtab = page.locator('[data-subtab="integrations"]');
    await integrationsSubtab.click();
    await page.waitForTimeout(500);

    const langsmithKeyInput = page.locator('[data-testid="langsmith-api-key"]');
    await langsmithKeyInput.fill('lsv2_workflow_test');

    const saveIntegrationsBtn = page.locator('[data-testid="save-integrations-btn"]');
    await saveIntegrationsBtn.click();

    const integrationsStatus = page.locator('[data-testid="integrations-save-status"]');
    await expect(integrationsStatus).toBeVisible({ timeout: 10000 });
    await expect(integrationsStatus).toContainText('successfully');
  });

  test('Error handling - Empty API key save', async ({ page }) => {
    // Navigate to Secrets
    const secretsSubtab = page.locator('[data-subtab="secrets"]');
    await secretsSubtab.click();
    await page.waitForTimeout(500);

    // Don't fill anything, just click save
    const saveBtn = page.locator('[data-testid="save-api-keys-btn"]');
    await saveBtn.click();

    // Should still work (backend will just save empty keys)
    // In this case, we're testing that the frontend doesn't crash
    await page.waitForTimeout(2000);

    // Page should still be functional
    const heading = page.locator('h2:has-text("Secrets Management")');
    await expect(heading).toBeVisible();
  });
});
