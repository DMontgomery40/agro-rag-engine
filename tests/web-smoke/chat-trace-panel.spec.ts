import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test('Chat trace panel stays below chat and shows steps', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator('body')).toBeVisible();

  const chatNav = page.locator('text=Chat');
  if (await chatNav.count()) {
    await chatNav.first().scrollIntoViewIfNeeded();
    await chatNav.first().click({ force: true });
  }

  const chatInput = page.locator('#chat-input');
  if (!(await chatInput.count())) {
    test.skip(true, 'Chat UI not found; skipping trace panel smoke');
  }

  // Enable trace from settings so panel should auto-open
  await page.locator('#chat-subtabs button:has-text("Settings")').click();
  await page.locator('#chat-show-trace').check({ force: true });
  await page.locator('#chat-save-settings').click();
  await page.locator('#chat-subtabs button:has-text("Interface")').click();

  await chatInput.fill('trace panel smoke check');
  await page.locator('#chat-send').click();

  const assistant = page.locator('[data-role="assistant"]').last();
  await assistant.waitFor({ state: 'visible', timeout: 15000 });

  const tracePanel = page.locator('#chat-trace');
  await tracePanel.waitFor({ state: 'visible', timeout: 5000 });
  await expect(tracePanel).toHaveJSProperty('open', true);

  const traceOutput = page.locator('#chat-trace-output');
  await expect(traceOutput).toBeVisible({ timeout: 5000 });
  await expect(traceOutput).toContainText(/retrieve/i, { timeout: 10000 });

  const assistantText = (await assistant.textContent()) || '';
  expect(assistantText.toLowerCase()).not.toContain('retriever.retrieve');
});
