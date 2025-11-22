import { test, expect } from '@playwright/test'

test.describe('Chat Feedback Smoke', () => {
  test('Feedback controls appear and record signal', async ({ page }) => {
    // Speed up retrieval for GUI smoke: set multiQuery=1, small finalK
    await page.addInitScript(() => {
      const cfg = {
        model: '', temperature: 0, maxTokens: 400, multiQuery: 1, finalK: 10, confidence: 0.5,
        showCitations: true, showConfidence: false, autoScroll: true, syntaxHighlight: false,
        systemPrompt: '', historyEnabled: true, historyLimit: 50, showHistoryOnLoad: false
      };
      window.localStorage.setItem('agro_chat_settings', JSON.stringify(cfg));
    })
    await page.goto('http://localhost:8012/web/chat?fast=1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(400)

    const input = page.locator('#chat-input')
    const send = page.locator('#chat-send')
    await expect(input).toBeVisible()
    await input.fill('Explain how chat feedback (thumbs/stars) is logged and used to train the cross-encoder reranker in AGRO.')
    await send.click()

    // Wait for assistant message and feedback container to appear
    const messages = page.locator('#chat-messages')
    await expect(messages).toBeVisible({ timeout: 60000 })
    // Anchor feedback within the last assistant message
    const lastAssistant = messages.locator('[data-role="assistant"]').last()
    await expect(lastAssistant).toBeVisible({ timeout: 60000 })
    const feedbackBtn = lastAssistant.locator('button.feedback-btn').first()
    await expect(feedbackBtn).toBeVisible({ timeout: 60000 })

    // Click thumbs up and expect status to update
    await feedbackBtn.click()
    const status = page.locator('.feedback-status').first()
    await expect(status).toContainText('Feedback recorded', { timeout: 5000 })
  })
})
