import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test('Chat tab renders correctly', async ({ page }) => {
  await page.goto(baseUrl);

  // Ensure app root renders
  const root = page.locator('#root');
  await expect(root).toBeVisible();

  // Navigate to Chat tab
  const chatLink = page.locator('a[href="/chat"], a[href="/web/chat"]').first();
  await expect(chatLink).toBeVisible();
  await chatLink.click();

  // Wait for navigation
  await page.waitForURL(/\/chat/, { timeout: 5000 });

  // Verify Chat tab container exists and is visible
  const chatTab = page.locator('#tab-chat');
  await expect(chatTab).toBeVisible({ timeout: 5000 });

  // Verify Chat subtabs are visible
  const chatSubtabs = page.locator('#chat-subtabs');
  await expect(chatSubtabs).toBeVisible();

  // Verify Chat UI subtab is visible (should be active by default)
  const chatUI = page.locator('#tab-chat-ui');
  await expect(chatUI).toBeVisible();

  // Verify ChatInterface component renders (check for chat input or any chat content)
  const chatInput = page.locator('#chat-input');
  const chatContainer = page.locator('#tab-chat-ui');
  
  // Check if chat UI subtab is visible
  await expect(chatContainer).toBeVisible({ timeout: 5000 });
  
  // Chat input should be visible if ChatInterface rendered
  // If not found, check for any chat-related content as fallback
  const hasInput = await chatInput.count();
  if (hasInput > 0) {
    await expect(chatInput).toBeVisible({ timeout: 2000 });
  } else {
    // Fallback: check if any chat content exists
    const chatContent = page.locator('#tab-chat-ui').locator('text=/chat|message|ask/i');
    const hasContent = await chatContent.count();
    expect(hasContent).toBeGreaterThan(0);
  }
});

