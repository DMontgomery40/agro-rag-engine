import { test, expect } from '@playwright/test'

test('Indexing subtab shows repos and start reacts', async ({ page }) => {
  await page.goto('http://localhost:8012/web/rag')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)

  // Switch to Indexing
  const idxBtn = page.locator('#rag-subtabs button[data-subtab="indexing"]')
  await expect(idxBtn).toBeVisible()
  await idxBtn.click()
  await page.waitForTimeout(400)

  // Repo dropdown populated
  const select = page.locator('#index-repo-select')
  await expect(select).toBeVisible({ timeout: 5000 })
  const opts = await select.locator('option').count()
  expect(opts).toBeGreaterThan(0)

  // Simple Index button shows output panel immediately after click
  const simpleBtn = page.locator('#simple-index-btn')
  await expect(simpleBtn).toBeVisible()
  await simpleBtn.click()
  await page.waitForTimeout(120)
  const visible = await page.locator('#simple-output').isVisible()
  expect(visible).toBeTruthy()
})
