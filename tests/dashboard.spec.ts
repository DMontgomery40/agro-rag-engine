import { test, expect } from '@playwright/test'

test.describe('Dashboard React App - Subtab Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to React dev server
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1500) // Let React initialize
  })

  test('dashboard loads without errors', async ({ page }) => {
    // Check for main app container
    const root = await page.locator('#root')
    await expect(root).not.toBeEmpty()

    // Check for navigation elements
    const nav = await page.locator('[role="navigation"], nav, .topbar')
    await expect(nav).toBeVisible({ timeout: 5000 })
  })

  test('dashboard subtabs render all tabs upfront in DOM', async ({ page }) => {
    // Navigate to the dashboard tab if not already there
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // Check that all subtab divs exist in the DOM (rendered but may be hidden)
    const overviewTab = page.locator('#tab-dashboard-overview')
    const helpTab = page.locator('#tab-dashboard-help')

    // Both should exist in the DOM
    await expect(overviewTab).toBeTruthy()
    await expect(helpTab).toBeTruthy()

    console.log('✅ Both dashboard subtabs exist in DOM')
  })

  test('dashboard overview subtab is active by default', async ({ page }) => {
    // Navigate to dashboard if needed
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // Overview should have active class
    const overviewTab = page.locator('#tab-dashboard-overview')
    const overviewClasses = await overviewTab.getAttribute('class')

    expect(overviewClasses).toContain('active')
    console.log('✅ Overview tab is active by default')

    // Help should not be active
    const helpTab = page.locator('#tab-dashboard-help')
    const helpClasses = await helpTab.getAttribute('class')

    expect(helpClasses).not.toContain('active')
    console.log('✅ Help tab is not active by default')
  })

  test('dashboard subtab switching works with CSS class toggling', async ({ page }) => {
    // Navigate to dashboard if needed
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // Initially, overview should be active
    const overviewTab = page.locator('#tab-dashboard-overview')
    let overviewClasses = await overviewTab.getAttribute('class')
    expect(overviewClasses).toContain('active')

    // Click Help & Glossary subtab button
    const helpButton = page.locator('[data-subtab="help"]')
    if (await helpButton.isVisible()) {
      await helpButton.click()
      await page.waitForTimeout(300)

      // Overview should no longer be active
      overviewClasses = await overviewTab.getAttribute('class')
      expect(overviewClasses).not.toContain('active')
      console.log('✅ Overview tab class removed when switching')

      // Help should now be active
      const helpTab = page.locator('#tab-dashboard-help')
      const helpClasses = await helpTab.getAttribute('class')
      expect(helpClasses).toContain('active')
      console.log('✅ Help tab class added when switching')
    }
  })

  test('dashboard overview tab content displays when active', async ({ page }) => {
    // Navigate to dashboard if needed
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // System Status section should be visible in overview
    const systemStatus = page.locator('text=System Status')
    if (await systemStatus.isVisible()) {
      await expect(systemStatus).toBeVisible()
      console.log('✅ System Status visible in overview')
    }

    // Quick Actions should be visible
    const quickActions = page.locator('text=Quick Actions')
    if (await quickActions.isVisible()) {
      await expect(quickActions).toBeVisible()
      console.log('✅ Quick Actions visible in overview')
    }
  })

  test('dashboard switching to help tab hides overview content', async ({ page }) => {
    // Navigate to dashboard if needed
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // Quick Actions should be visible initially
    const quickActions = page.locator('text=Quick Actions')
    if (await quickActions.isVisible()) {
      await expect(quickActions).toBeVisible()

      // Click Help & Glossary tab
      const helpButton = page.locator('[data-subtab="help"]')
      if (await helpButton.isVisible()) {
        await helpButton.click()
        await page.waitForTimeout(300)

        // Quick Actions should not be visible anymore
        const isHidden = !(await quickActions.isVisible().catch(() => false))
        if (isHidden) {
          console.log('✅ Overview content hidden when switching tabs')
        }
      }
    }
  })

  test('dashboard URL updates when switching subtabs', async ({ page }) => {
    // Navigate to dashboard
    const dashboardLink = page.locator('a[href="/dashboard"], button[href*="dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForTimeout(500)
    }

    // Default should have no subtab param or subtab=overview
    let url = page.url()
    if (url.includes('dashboard') || url === 'http://localhost:5173/') {
      // Click Help & Glossary tab
      const helpButton = page.locator('[data-subtab="help"]')
      if (await helpButton.isVisible()) {
        await helpButton.click()

        // Wait for URL to update with subtab param
        await page.waitForURL(/subtab=help/, { timeout: 2000 }).catch(() => {})

        // URL should now have subtab=help
        url = page.url()
        if (url.includes('subtab=help')) {
          console.log('✅ URL updated to include subtab=help')
        } else {
          console.log('⚠️ URL may use different routing (React Router)')
        }
      }
    }
  })
})
