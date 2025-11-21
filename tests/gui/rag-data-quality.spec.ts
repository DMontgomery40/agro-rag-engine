import { test, expect } from '@playwright/test';

test.describe('RAG Data Quality', () => {
  test('loads keywords controls and repository metadata', async ({ page }) => {
    await page.goto('/');

    const ragTabButton = page.locator('.tab-bar button[data-tab="rag"]');
    await expect(ragTabButton).toBeVisible();
    await ragTabButton.click();

    const dataQualityPanel = page.locator('#tab-rag-data-quality');
    await expect(dataQualityPanel).toBeVisible();

    const repoSection = page.locator('#repos-section');
    await expect(repoSection).toContainText('Keyword Manager');
    await expect(repoSection.locator('select[id^="kw-src-"]').first()).toBeVisible();

    await page.waitForFunction(() => {
      const sel = document.getElementById('cards-repo-select') as HTMLSelectElement | null;
      if (!sel || !sel.options || sel.options.length === 0) return false;
      return !Array.from(sel.options).some(opt => (opt.textContent || '').includes('Loading'));
    });

    const firstRepoOption = page.locator('#cards-repo-select option').first();
    await expect(firstRepoOption).not.toHaveText(/Loading/i);

    await page.waitForFunction(() => document.querySelectorAll('#keywords-list option').length > 0);
  });
});
