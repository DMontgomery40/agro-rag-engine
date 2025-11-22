import { test, expect } from '@playwright/test'

test.describe('Chat Tab Wiring Smoke', () => {
  test('UI sends message and shows activity', async ({ page }) => {
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
    await page.waitForTimeout(1000)

    const input = page.locator('#chat-input')
    const send = page.locator('#chat-send')
    const messages = page.locator('#chat-messages')

    await expect(input).toBeVisible()
    await expect(send).toBeVisible()

    await input.fill('How are feedback signals recorded and mined for the learning reranker?')
    await send.click()

    // Expect some activity: button disables briefly, messages area updates
    // Allow for either a loading placeholder (MODEL …) or an error message
    await page.waitForTimeout(800)
    const text = await messages.textContent()
    expect(text).toBeTruthy()
  })

  test('Chat Settings save persists (API-backed)', async ({ page, request }) => {
    await page.addInitScript(() => {
      const cfg = {
        model: '', temperature: 0, maxTokens: 400, multiQuery: 1, finalK: 10, confidence: 0.5,
        showCitations: true, showConfidence: false, autoScroll: true, syntaxHighlight: false,
        systemPrompt: '', historyEnabled: true, historyLimit: 50, showHistoryOnLoad: false
      };
      window.localStorage.setItem('agro_chat_settings', JSON.stringify(cfg));
    })
    await page.goto('http://localhost:8012/web/chat?fast=1')
    await page.waitForTimeout(500)

    // Switch to Settings subtab
    const settingsBtn = page.locator('#chat-subtabs button:has-text("Settings")')
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()
    await page.waitForTimeout(200)

    const temp = page.locator('#chat-temperature')
    await expect(temp).toBeVisible()
    await temp.fill('0.2')

    const save = page.locator('#chat-save-settings')
    await expect(save).toBeVisible()
    await save.click()

    // Give bindings a moment to persist to API
    await page.waitForTimeout(200)

    // Validate persistence via backend API
    const resp = await request.get('http://localhost:8012/api/chat/config')
    expect(resp.ok()).toBeTruthy()
    const cfg = await resp.json()
    expect(parseFloat(String(cfg.temperature))).toBeCloseTo(0.2, 1)
  })
})
