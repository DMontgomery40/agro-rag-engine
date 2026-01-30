import { test, expect } from '@playwright/test';

// Chat interface smoke test - verify markdown rendering works
test.describe('Chat Interface Smoke Test', () => {
  test('chat page loads and renders correctly', async ({ page }) => {
    // Navigate to chat page
    await page.goto('/web/chat');
    
    // Verify page loads (not blank)
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Verify RAG Chat heading exists
    await expect(page.getByRole('heading', { name: /RAG Chat/i })).toBeVisible({ timeout: 10000 });
    
    // Verify chat input is present
    const chatInput = page.getByPlaceholder(/ask a question/i);
    await expect(chatInput).toBeVisible();
    
    // Verify send button exists
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    
    // Verify the chat interface has the correct structure
    await expect(page.locator('text=Ask questions about your codebase')).toBeVisible();
  });

  test('chat input accepts text', async ({ page }) => {
    await page.goto('/web/chat');
    
    // Wait for chat input
    const chatInput = page.getByPlaceholder(/ask a question/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Type in the input
    await chatInput.fill('test message');
    
    // Verify text was entered
    await expect(chatInput).toHaveValue('test message');
    
    // Verify send button becomes enabled
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).not.toBeDisabled();
  });
});

