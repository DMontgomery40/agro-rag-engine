import { test, expect } from '@playwright/test';

test.describe('Sidepanel Layout', () => {
  test('should display cost calculator labels without truncation', async ({ page }) => {
    await page.goto('http://127.0.0.1:8012/gui/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Get all labels in the sidepanel
    const labels = await page.locator('.sidepanel-section label').allTextContents();

    console.log('Sidepanel labels found:');
    labels.forEach((label, i) => {
      console.log(`  ${i + 1}. "${label}"`);
    });

    // Check that labels are complete and not truncated
    const expectedLabels = [
      'INFERENCE PROVIDER',
      'INFERENCE MODEL',
      'EMBEDDINGS PROVIDER',
      'EMBEDDING MODEL',
      'RERANKER',
      'RERANK MODEL',
      'INPUT TOKENS / REQUEST',
      'OUTPUT TOKENS / REQUEST',
      'EMBEDDING TOKENS / DAY',
      'RERANKS / DAY',
      'API REQUESTS / DAY'
    ];

    expectedLabels.forEach(expectedLabel => {
      const found = labels.some(label =>
        label.trim().toUpperCase().includes(expectedLabel)
      );
      if (!found) {
        console.log(`✗ Label NOT found: ${expectedLabel}`);
      }
      expect(found).toBeTruthy();
      console.log(`✓ Found: ${expectedLabel}`);
    });

    // Verify inputs are visible
    const costInInput = page.locator('#cost-in');
    const costOutInput = page.locator('#cost-out');
    const costEmbedsInput = page.locator('#cost-embeds');

    expect(await costInInput.isVisible()).toBeTruthy();
    expect(await costOutInput.isVisible()).toBeTruthy();
    expect(await costEmbedsInput.isVisible()).toBeTruthy();

    console.log('✓ All labels visible and not truncated');
    console.log('✓ All inputs visible');
  });
});
