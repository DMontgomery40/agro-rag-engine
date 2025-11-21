import { test, expect } from '@playwright/test';

test.describe('RAG Tab HTML Structure (With Proper Waits)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForLoadState('networkidle');
    // Wait for legacy modules to fully load and apply styles
    await page.waitForTimeout(2000);
  });

  test('RAG tab wrapper is visible with correct classes', async ({ page }) => {
    const wrapper = page.locator('#tab-rag.tab-content');
    await expect(wrapper).toBeVisible();

    const classAttr = await wrapper.getAttribute('class');
    expect(classAttr).toContain('tab-content');
    expect(classAttr).toContain('active');
  });

  test('All 6 RAG subtab containers exist in DOM', async ({ page }) => {
    const expectedSubtabs = [
      'tab-rag-data-quality',
      'tab-rag-retrieval',
      'tab-rag-external-rerankers',
      'tab-rag-learning-ranker',
      'tab-rag-indexing',
      'tab-rag-evaluate',
    ];

    for (const subtabId of expectedSubtabs) {
      const subtab = page.locator(`#${subtabId}.rag-subtab-content`);
      const count = await subtab.count();
      expect(count).toBe(1);
    }
  });

  test('Data Quality subtab is active by default', async ({ page }) => {
    const dataQualitySubtab = page.locator('#tab-rag-data-quality');
    const classAttr = await dataQualitySubtab.getAttribute('class');
    expect(classAttr).toContain('active');
  });

  test('RAG subtab navigation is visible', async ({ page }) => {
    const ragSubtabsBar = page.locator('#rag-subtabs.subtab-bar');
    await expect(ragSubtabsBar).toBeVisible();

    const buttons = page.locator('#rag-subtabs.subtab-bar button');
    const count = await buttons.count();
    expect(count).toBe(6);
  });

  test('Clicking subtab buttons changes active state', async ({ page }) => {
    // Click on Retrieval subtab button
    const retrievalButton = page.locator('.subtab-bar button:has-text("Retrieval")');
    await expect(retrievalButton).toBeVisible();
    await retrievalButton.click();

    // Wait for React state update
    await page.waitForTimeout(200);

    // Verify Retrieval is now active
    const retrievalSubtab = page.locator('#tab-rag-retrieval');
    const classAttr = await retrievalSubtab.getAttribute('class');
    expect(classAttr).toContain('active');
  });
});
