import { test, expect } from '@playwright/test'

test.describe('Learning Reranker Wiring Smoke', () => {
  test('Buttons are wired and react to clicks', async ({ page }) => {
    await page.goto('http://localhost:8012/web/rag')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)

    // Open Learning Ranker subtab
    const lrBtn = page.locator('#rag-subtabs button[data-subtab="learning-ranker"]')
    await expect(lrBtn).toBeVisible()
    await lrBtn.click()
    await page.waitForTimeout(300)

    const mineBtn = page.locator('#reranker-mine-btn')
    const trainBtn = page.locator('#reranker-train-btn')
    const evalBtn = page.locator('#reranker-eval-btn')

    await expect(mineBtn).toBeVisible({ timeout: 5000 })
    await expect(trainBtn).toBeVisible()
    await expect(evalBtn).toBeVisible()

    // Click Mine Triplets and observe transient state change (disabled or text)
    const before = await mineBtn.textContent()
    await mineBtn.click()
    await page.waitForTimeout(100)
    const during = await mineBtn.textContent().catch(() => before)
    // Either button text changes or becomes disabled momentarily
    const isDisabled = await mineBtn.isDisabled().catch(() => false)
    expect(Boolean(isDisabled || (during && during !== before))).toBeTruthy()
  })
})

