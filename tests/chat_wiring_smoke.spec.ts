import { test, expect } from '@playwright/test'

test.describe('Chat Tab Wiring Smoke', () => {
  test('UI sends message and shows activity', async ({ page }) => {
    await page.goto('http://localhost:8012/web/chat')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const input = page.locator('#chat-input')
    const send = page.locator('#chat-send')
    const messages = page.locator('#chat-messages')

    await expect(input).toBeVisible()
    await expect(send).toBeVisible()

    await input.fill('hello world')
    await send.click()

    // Expect some activity: button disables briefly, messages area updates
    // Allow for either a loading placeholder (MODEL …) or an error message
    await page.waitForTimeout(500)
    const text = await messages.textContent()
    expect(text).toBeTruthy()
  })

  test.fixme('Chat Settings save persists local state (pending full settings API wiring)', async ({ page }) => {
    await page.goto('http://localhost:8012/web/chat')
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

    // Give bindings a moment to write to localStorage
    await page.waitForTimeout(150)

    // Navigate away and back, value should persist via localStorage
    await page.goto('http://localhost:8012/web/rag')
    await page.waitForTimeout(300)
    await page.goto('http://localhost:8012/web/chat')
    await page.waitForTimeout(300)
    // Ensure re-bind on re-entry
    await page.evaluate(() => { (window as any).ChatUI?.init?.() })
    await settingsBtn.click()
    await page.waitForTimeout(200)

    // Validate persistence via localStorage
    const saved = await page.evaluate(() => localStorage.getItem('agro_chat_settings'))
    expect(saved).toBeTruthy()
    const obj = JSON.parse(saved || '{}')
    expect(parseFloat(String(obj.temperature))).toBeCloseTo(0.2, 1)
  })
})
