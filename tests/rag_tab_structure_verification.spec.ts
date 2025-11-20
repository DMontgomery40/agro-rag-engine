import { test, expect } from '@playwright/test';

test.describe('RAG Tab HTML Structure Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForLoadState('networkidle');
  });

  test('RAG tab wrapper has correct id and className', async ({ page }) => {
    const wrapper = page.locator('#tab-rag.tab-content');
    await expect(wrapper).toBeVisible();
    
    // Verify it has the right class
    const classAttr = await wrapper.getAttribute('class');
    expect(classAttr).toContain('tab-content');
  });

  test('All 6 RAG subtab containers exist with proper IDs and structure', async ({ page }) => {
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
      
      // Verify the element exists in the DOM
      const count = await subtab.count();
      expect(count).toBe(1);
      
      // Verify the class is set
      const classAttr = await subtab.getAttribute('class');
      expect(classAttr).toContain('rag-subtab-content');
    }
  });

  test('Data Quality subtab is active by default', async ({ page }) => {
    const dataQualitySubtab = page.locator('#tab-rag-data-quality');
    const classAttr = await dataQualitySubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify other subtabs are not active
    const otherSubtabs = [
      '#tab-rag-retrieval',
      '#tab-rag-external-rerankers',
      '#tab-rag-learning-ranker',
      '#tab-rag-indexing',
      '#tab-rag-evaluate',
    ];

    for (const selector of otherSubtabs) {
      const subtab = page.locator(selector);
      const attr = await subtab.getAttribute('class');
      expect(attr).not.toContain('active');
    }
  });

  test('Clicking subtab buttons changes active class correctly', async ({ page }) => {
    // Click on Retrieval subtab button
    const retrievalButton = page.locator('.subtab-bar button:has-text("Retrieval")');
    await retrievalButton.click();

    // Wait for state change
    await page.waitForTimeout(100);

    // Verify Retrieval is now active
    const retrievalSubtab = page.locator('#tab-rag-retrieval');
    let classAttr = await retrievalSubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify Data Quality is no longer active
    const dataQualitySubtab = page.locator('#tab-rag-data-quality');
    classAttr = await dataQualitySubtab.getAttribute('class');
    expect(classAttr).not.toContain('active');

    // Click on Indexing subtab button
    const indexingButton = page.locator('.subtab-bar button:has-text("Indexing")');
    await indexingButton.click();

    await page.waitForTimeout(100);

    // Verify Indexing is now active
    const indexingSubtab = page.locator('#tab-rag-indexing');
    classAttr = await indexingSubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify Retrieval is no longer active
    classAttr = await retrievalSubtab.getAttribute('class');
    expect(classAttr).not.toContain('active');
  });

  test('RAG subtabs container is present with proper navigation', async ({ page }) => {
    const ragSubtabsBar = page.locator('#rag-subtabs.subtab-bar');
    await expect(ragSubtabsBar).toBeVisible();

    // Verify it contains 6 buttons (one for each subtab)
    const buttons = page.locator('#rag-subtabs.subtab-bar button');
    const count = await buttons.count();
    expect(count).toBe(6);

    // Verify button names match expected subtabs
    const expectedNames = [
      'Data Quality',
      'Retrieval',
      'External Rerankers',
      'Learning Ranker',
      'Indexing',
      'Evaluate',
    ];

    for (let i = 0; i < expectedNames.length; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      expect(text).toContain(expectedNames[i]);
    }
  });

  test('Subtabs do not use conditional rendering - all are in DOM', async ({ page }) => {
    // All subtabs should be in the DOM regardless of visibility
    const allSubtabs = page.locator('[id^="tab-rag-"][class*="rag-subtab-content"]');
    const count = await allSubtabs.count();
    
    // Should have exactly 6 subtabs
    expect(count).toBe(6);

    // All should exist even if not visible (controlled by CSS/className)
    for (let i = 0; i < 6; i++) {
      const subtab = allSubtabs.nth(i);
      const elementHandle = subtab.elementHandle();
      expect(elementHandle).toBeTruthy();
    }
  });

  test('Structure matches /gui/index.html pattern', async ({ page }) => {
    // Verify overall structure:
    // <div id="tab-rag" class="tab-content">
    //   <RAGSubtabs />  (which renders the buttons)
    //   <div id="tab-rag-data-quality" class="rag-subtab-content active">...</div>
    //   <div id="tab-rag-retrieval" class="rag-subtab-content">...</div>
    //   ... (other subtabs)
    // </div>

    const ragTab = page.locator('#tab-rag');
    
    // Count direct children (subtabs + subtab bar)
    const directChildren = page.locator('#tab-rag > [id^="tab-rag"]');
    const directCount = await directChildren.count();
    
    // Should have exactly 6 subtab divs
    expect(directCount).toBe(6);

    // Verify subtab bar exists as sibling
    const subtabBar = page.locator('#tab-rag #rag-subtabs');
    await expect(subtabBar).toBeVisible();
  });
});
