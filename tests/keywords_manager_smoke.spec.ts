import { test, expect } from '@playwright/test'

test('RAG Data Quality shows Keywords Manager', async ({ page }) => {
  await page.goto('http://localhost:8012/web/rag')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  // Ensure Data Quality subtab is active
  const dqBtn = page.locator('#rag-subtabs button[data-subtab="data-quality"]')
  await dqBtn.click().catch(() => {})
  await page.waitForTimeout(300)

  // Expect repos section to be populated
  const repos = page.locator('#repos-section > div')
  await expect(repos.first()).toBeVisible({ timeout: 5000 })

  // Expect keyword manager elements to exist for at least one repo
  const allList = page.locator('#repos-section select[id^="kw-all-"]')
  await expect(allList.first()).toBeVisible({ timeout: 5000 })
})

