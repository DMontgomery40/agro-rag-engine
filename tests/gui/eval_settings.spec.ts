import { test, expect } from '@playwright/test';

test.describe('RAG → Evaluate settings', () => {
  test('shows GOLDEN_PATH and BASELINE_PATH inputs and saves', async ({ page }) => {
    await page.goto('http://localhost:8012', { waitUntil: 'networkidle' });

    // Navigate to RAG tab
    const ragTab = page.locator('[data-tab="rag"]').first();
    await ragTab.waitFor({ state: 'visible', timeout: 15000 });
    await ragTab.click();
    await page.waitForTimeout(300);

    // Go to Evaluate subtab
    const evaluateSubtab = page.locator('[data-subtab="evaluate"]');
    await evaluateSubtab.waitFor({ state: 'visible', timeout: 10000 });
    await evaluateSubtab.click();
    await page.waitForTimeout(500);

    const goldenInput = page.locator('#eval-golden-path');
    const baselineInput = page.locator('#eval-baseline-path');
    const saveBtn = page.locator('#btn-eval-save-settings');

    await expect(goldenInput).toBeVisible();
    await expect(baselineInput).toBeVisible();
    await expect(saveBtn).toBeVisible();

    // Set values to known defaults and save
    await goldenInput.fill('data/golden.json');
    await baselineInput.fill('data/evals/eval_baseline.json');
    await saveBtn.click();

    // Basic success heuristic: button enabled again and inputs retain values after reload
    await expect(saveBtn).toBeEnabled();
    await page.reload();
    await ragTab.click();
    await evaluateSubtab.click();
    await expect(page.locator('#eval-golden-path')).toHaveValue('data/golden.json');
    await expect(page.locator('#eval-baseline-path')).toHaveValue('data/evals/eval_baseline.json');
  });
});

