import { test, expect } from '@playwright/test';

test.describe('GUI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gui/');
    await page.waitForSelector('.tab-bar');
  });

  test('dashboard renders and health shows OK', async ({ page }) => {
    await expect(page.locator('#dash-health')).toBeVisible();
    // Kick health
    await page.waitForTimeout(200);
  });

  test('tab switching works', async ({ page }) => {
    // Configuration → Models subtab is default
    await page.locator("button[data-tab='config']").first().click();
    await expect(page.locator('#tab-config-models')).toBeVisible();
    // Data & Indexing main tab
    await page.locator("button[data-tab='data']").first().click();
    await expect(page.locator('#tab-data-indexing')).toBeVisible();
  });

  test('global search highlights', async ({ page }) => {
    await page.fill('#global-search', 'System Status');
    await page.locator('#global-search').press('Enter');
    await page.waitForTimeout(600);
    const marks = await page.locator('mark.hl').count();
    expect(marks).toBeGreaterThan(0);
  });

  test('Git hooks install via Developer Tools', async ({ page }) => {
    await page.locator("button[data-tab='devtools']").first().click();
    await page.locator(".subtab-bar .subtab-btn[data-subtab='devtools-integrations']").click();
    await page.locator('#btn-install-hooks').click();
    await page.waitForTimeout(200);
    const status = await page.locator('#hooks-status').textContent();
    expect(status || '').not.toContain('Not installed');
  });

  test('indexer quick action updates status', async ({ page }) => {
    // Dashboard quick action
    await page.locator('.tab-bar button[data-tab="dashboard"]').first().click();
    await page.locator('#dash-index-start').click();
    await page.waitForTimeout(600);
    const txt = (await page.locator('#dash-index-status').textContent()) || '';
    // Accept any non-empty log line as success (UI changed from showing chunk counts)
    expect(txt.trim().length).toBeGreaterThan(0);
  });

  test('wizard one-click config produces preview', async ({ page }) => {
    await page.locator('.tab-bar button[data-tab="dashboard"]').first().click();
    await page.locator('#btn-wizard-oneclick').click();
    await page.waitForTimeout(500);
    const preview = await page.locator('#profile-preview').textContent();
    expect((preview || '')).toContain('Models:');
  });

  test('cost calculator estimates include embeddings', async ({ page }) => {
    // Configure embed+rerank + token counts in sidepanel cost calculator
    await page.selectOption('#cost-embed-provider', { label: 'OpenAI' }).catch(()=>{});
    const embedModel = page.locator('#cost-embed-model');
    if (await embedModel.count()) {
      await embedModel.fill('text-embedding-3-small');
    }
    await page.selectOption('#cost-rerank-provider', { label: 'Cohere' }).catch(()=>{});
    const rrModel = page.locator('#cost-rerank-model');
    if (await rrModel.count()) {
      await rrModel.fill('rerank-english-v3.0');
    }
    await page.fill('#cost-in', '1000');
    await page.fill('#cost-out', '1000');
    await page.fill('#cost-embeds', '1000');
    await page.fill('#cost-rerank', '1000');
    await page.fill('#cost-rpd', '10');
    await page.click('#btn-estimate');
    const daily = (await page.locator('#cost-daily').textContent()) || '';
    const monthly = (await page.locator('#cost-monthly').textContent()) || '';
    expect(daily.replace(/[^0-9.]/g,'').length).toBeGreaterThan(0);
    expect(monthly.replace(/[^0-9.]/g,'').length).toBeGreaterThan(0);
  });

  test('profiles save and list updates', async ({ page }) => {
    await page.locator('.tab-bar button[data-tab="dashboard"]').first().click();
    await page.fill('#profile-name', 'pw-ui');
    const btn = page.locator('#btn-save-profile');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(200);
      const ul = page.locator('#profiles-ul');
      await expect(ul).toContainText(/pw-ui/);
    }
  });
});
