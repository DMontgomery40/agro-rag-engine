import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test('Chat settings toggles confidence prefix and citations visibility', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator('body')).toBeVisible();

  const chatNav = page.locator('text=Chat');
  if (await chatNav.count()) {
    await chatNav.first().scrollIntoViewIfNeeded();
    await chatNav.first().click({ force: true });
  }

  const chatInput = page.locator('#chat-input');
  if (!(await chatInput.count())) {
    test.skip(true, 'Chat UI not available; skipping toggle test');
  }

  // Turn on confidence, turn off citations
  await page.locator('#chat-subtabs button:has-text("Settings")').click();
  await page.locator('#chat-show-confidence').check({ force: true });
  await page.locator('#chat-show-citations').uncheck({ force: true });
  await page.locator('#chat-save-settings').click();
  await page.locator('#chat-subtabs button:has-text("Interface")').click();

  await chatInput.fill('Where is the chat interface implemented?');
  await page.locator('#chat-send').click();

  const assistant = page.locator('[data-role="assistant"]').last();
  await assistant.waitFor({ state: 'visible', timeout: 15000 });
  await expect(assistant).toContainText('Confidence:', { timeout: 10000 });
  await expect(assistant.locator('text=Citations:')).toHaveCount(0);

  // Re-enable citations and confirm they render
  await page.locator('#chat-subtabs button:has-text("Settings")').click();
  await page.locator('#chat-show-citations').check({ force: true });
  await page.locator('#chat-save-settings').click();
  await page.locator('#chat-subtabs button:has-text("Interface")').click();

  await page.locator('button[aria-label="Clear chat"]').click();
  await chatInput.fill('Show me citations in this answer');
  await page.locator('#chat-send').click();
  await assistant.waitFor({ state: 'visible', timeout: 15000 });
  const citationBlocks = await assistant.locator('text=Citations:').count();
  expect(citationBlocks).toBeGreaterThan(0);
});
