import { test, expect } from '@playwright/test';

test.describe('GUI cost panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gui/');
    // Cost panel lives in the right sidepanel; no tab switch required.
  });

  test('embeddings and reranks affect totals', async ({ page }) => {
    // Set providers explicitly
    await page.selectOption('#cost-provider', { label: 'openai' }).catch(()=>{});
    await page.fill('#cost-model', 'gpt-4o-mini');

    await page.selectOption('#cost-embed-provider', { label: 'openai' }).catch(()=>{});
    await page.fill('#cost-embed-model', 'text-embedding-3-small');

    await page.selectOption('#cost-rerank-provider', { label: 'Cohere' }).catch(()=>{});
    await page.fill('#cost-rerank-model', 'rerank-english-v3.0');

    // Inputs
    await page.fill('#cost-in', '0');
    await page.fill('#cost-out', '0');
    await page.fill('#cost-rpd', '1');

    // Baseline none
    await page.fill('#cost-embeds', '0');
    await page.fill('#cost-rerank', '0');
    await page.click('#btn-estimate');
    const baseDaily = parseFloat((await page.locator('#cost-daily').textContent())!.replace(/[^0-9.]/g,'')) || 0;

    // With embeddings + reranks
    await page.fill('#cost-embeds', `${Math.ceil(10_000_000/30)}`); // ~10M/month
    await page.fill('#cost-rerank', '10000');
    await page.click('#btn-estimate');
    const incDaily = parseFloat((await page.locator('#cost-daily').textContent())!.replace(/[^0-9.]/g,'')) || 0;
    await expect(incDaily).toBeGreaterThan(baseDaily);
  });
});
