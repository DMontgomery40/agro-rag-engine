import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:8012/web')
})

test('dashboard loads and displays pipeline summary', async ({ page }) => {
  await expect(page.locator('.topbar .title')).toContainText('AGRO Dashboard')
  await expect(page.locator('h3')).toContainText('Pipeline Summary')
  await expect(page.locator('text=/Repo:/')).toBeVisible()
  await expect(page.locator('text=/Health:/')).toBeVisible()
})

test('dashboard shows loading state initially', async ({ page }) => {
  await page.route('**/api/pipeline/summary', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.continue()
  })
  await page.goto('http://localhost:8012/web')
  await expect(page.locator('text=Loading...')).toBeVisible({ timeout: 2000 })
})

test('dashboard handles API errors gracefully', async ({ page }) => {
  await page.route('**/api/pipeline/summary', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal error', request_id: 'test123' }) })
  })
  await page.goto('http://localhost:8012/web')
  await expect(page.locator('.text-err')).toBeVisible()
  await expect(page.locator('.text-err')).toContainText('Failed to load')
})

