import { test, expect } from '@playwright/test'

test('MCP subtab status and test button are wired', async ({ page }) => {
  await page.goto('http://localhost:8012/web/infrastructure')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(300)

  // Switch to MCP subtab
  const mcpBtn = page.locator('#infrastructure-subtabs button[data-subtab="mcp"]')
  await expect(mcpBtn).toBeVisible()
  await mcpBtn.click()
  await page.waitForTimeout(300)

  // Click "Test Connection" and expect some text in the result area
  const testBtn = page.locator('button:has-text("Test Connection")')
  await expect(testBtn).toBeVisible()
  await testBtn.click()
  await page.waitForTimeout(300)

  // Should render a result text (connected or not running)
  const hasText = await page.locator('text=Connected!').first().isVisible().catch(() => false)
  const hasAlt = await page.locator('text=Not running').first().isVisible().catch(() => false)
  expect(hasText || hasAlt).toBeTruthy()
})

