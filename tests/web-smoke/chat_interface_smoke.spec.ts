import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test('should render chat interface without DOM errors', async ({ page }) => {
    // Navigate to chat tab
    await page.goto('http://localhost:5175/web/chat');
    await page.waitForLoadState('networkidle');

    // Check for React DOM errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for chat interface to render
    await page.waitForSelector('#chat-messages', { timeout: 5000 });

    // Verify key elements are present
    await expect(page.locator('h3:has-text("RAG Chat")')).toBeVisible();
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#chat-send')).toBeVisible();
    await expect(page.locator('#chat-repo-select')).toBeVisible();

    // Check for DOM manipulation errors
    const domErrors = errors.filter(err =>
      err.includes('insertBefore') ||
      err.includes('removeChild') ||
      err.includes('Node')
    );

    if (domErrors.length > 0) {
      console.error('DOM errors found:', domErrors);
      throw new Error(`Found ${domErrors.length} DOM manipulation errors`);
    }

    console.log('✓ Chat interface rendered without DOM errors');
  });

  test('should handle basic chat interaction', async ({ page }) => {
    await page.goto('http://localhost:5175/web/chat');
    await page.waitForLoadState('networkidle');

    // Wait for chat input
    await page.waitForSelector('#chat-input', { timeout: 5000 });

    // Type a message
    await page.fill('#chat-input', 'What is the useAPI hook?');

    // Verify send button is enabled
    const sendButton = page.locator('#chat-send');
    await expect(sendButton).not.toBeDisabled();

    console.log('✓ Chat input and send button are functional');
  });
});
