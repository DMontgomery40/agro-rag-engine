import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Utility: flatten agro_config.json keys into param list (lower_snake)
function loadAgroParams(): string[] {
  const root = path.resolve(__dirname, '..')
  const cfgPath = path.resolve(root, 'agro_config.json')
  const text = fs.readFileSync(cfgPath, 'utf-8')
  const json = JSON.parse(text) as Record<string, Record<string, any>>
  const params: string[] = []
  for (const section of Object.values(json)) {
    for (const k of Object.keys(section)) params.push(k)
  }
  return params
}

// Utility: map lower_snake to possible DOM identifiers
function idCandidates(param: string): string[] {
  const up = param.toUpperCase()
  const hyphen = param.replace(/_/g, '-')
  return [
    param,
    up,
    hyphen,
    hyphen.toLowerCase(),
    `input-${param}`,
    `select-${param}`,
    `${param}-input`,
  ]
}

// Pages to scan for controls in the React app
const WEB_PAGES = ['/web/rag', '/web/admin', '/web/infrastructure']

test.describe('Config ↔ Web UI Wiring Audit', () => {
  test('Scan /web for all agro_config.json parameters and report missing', async ({ page }) => {
    const params = loadAgroParams()
    const missing: string[] = []
    let foundCount = 0

    for (const url of WEB_PAGES) {
      await page.goto(`http://localhost:8012${url}`)
      await page.waitForLoadState('networkidle')
      // Allow React + legacy modules to initialize and render tab content
      await page.waitForTimeout(2000)
      await page.locator('.subtab-bar').first().waitFor({ timeout: 5000 }).catch(() => {})

      // Click through subtabs if present to ensure all sections render
      const subtabButtons = page.locator('.subtab-bar button[data-subtab]')
      const subtabCount = await subtabButtons.count()
      const subtabIds: string[] = []
      for (let i = 0; i < subtabCount; i++) {
        const id = await subtabButtons.nth(i).getAttribute('data-subtab')
        if (id) subtabIds.push(id)
      }

      const visitStates = subtabIds.length ? subtabIds : ['__default']
      for (const sub of visitStates) {
        if (sub !== '__default') {
          await subtabButtons.locator(`[data-subtab="${sub}"]`).click({ trial: false }).catch(() => {})
          await page.waitForTimeout(250)
        }

        for (const p of params) {
          // Skip if already found on a previous page/subtab
          if ((page as any)._found?.has(p)) continue

          const candidates = idCandidates(p)
          let present = false
          for (const id of candidates) {
            const loc = page.locator(
              `input#${id}, input[name="${id}"] , select#${id}, select[name="${id}"], textarea#${id}, textarea[name="${id}"]`
            )
            if (await loc.count()) {
              present = true
              foundCount++
              ;(page as any)._found = (page as any)._found || new Set<string>()
              ;(page as any)._found.add(p)
              break
            }
          }
          if (!present && url === WEB_PAGES[WEB_PAGES.length - 1] && sub === visitStates[visitStates.length - 1]) missing.push(p)
        }
      }
    }

    console.log(`\nFound ${foundCount}/${params.length} parameters across ${WEB_PAGES.join(', ')}`)
    if (missing.length) {
      console.log(`Missing (${missing.length}):\n${missing.join(', ')}`)
    }
    // Expect at least 80 present to catch major regressions
    expect(foundCount).toBeGreaterThan(80)
  })

  test('Backend wiring: changing GEN_TEMPERATURE reflects in UI (and revert)', async ({ page, request }) => {
    // Read current config from API
    const resp = await request.get('http://localhost:8012/api/config')
    expect(resp.ok()).toBeTruthy()
    const cfg = await resp.json()
    const current = parseFloat(String(cfg.env?.GEN_TEMPERATURE ?? '0'))
    const next = current === 0 ? 0.07 : 0.0

    // Update via API (writes agro_config.json)
    const set1 = await request.post('http://localhost:8012/api/config', {
      data: { env: { GEN_TEMPERATURE: next } },
    })
    expect(set1.ok()).toBeTruthy()

    // Load UI and verify field reflects updated value
    await page.goto('http://localhost:8012/web/rag')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    // Ensure Retrieval subtab is active where GEN_TEMPERATURE lives
    await page.locator('.subtab-bar button[data-subtab="retrieval"]').first().click({ trial: false }).catch(() => {})
    await page.waitForTimeout(250)

    const input = page.locator('input[name="GEN_TEMPERATURE"]')
    await expect(input).toHaveCount(1)
    // Compare string forms with fixed decimals to avoid float string diffs
    const val = await input.inputValue()
    expect(Number.parseFloat(val)).toBeCloseTo(next, 3)

    // Revert to original
    const set2 = await request.post('http://localhost:8012/api/config', {
      data: { env: { GEN_TEMPERATURE: current } },
    })
    expect(set2.ok()).toBeTruthy()
  })
})
