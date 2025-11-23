import { test, expect } from '@playwright/test';

/**
 * Test settings persistence across page reloads
 * Verifies both Retrieval and Evaluate tabs save settings
 */

test.describe('Settings Persistence', () => {
  test('Evaluate tab settings should persist across page reloads', async ({ page }) => {
    // Navigate to Evaluate tab
    await page.goto('http://localhost:5173');
    await page.click('button:has-text("RAG")');
    await page.waitForTimeout(500);

    // Find and click Evaluate subtab button
    const evaluateButton = page.locator('button').filter({ hasText: /^Evaluate$/ });
    await evaluateButton.click();
    await page.waitForTimeout(1000);

    // Change settings
    await page.selectOption('select:near(:text("Use Multi-Query"))', '0'); // Set to No
    await page.fill('input[type="number"]:near(:text("Final K"))', '8');
    await page.selectOption('select:near(:text("Sample Size"))', '10'); // Quick

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to Evaluate tab
    await page.click('button:has-text("RAG")');
    await page.waitForTimeout(500);
    await evaluateButton.click();
    await page.waitForTimeout(1000);

    // Verify settings persisted
    const useMultiValue = await page.locator('select:near(:text("Use Multi-Query"))').inputValue();
    const finalKValue = await page.locator('input[type="number"]:near(:text("Final K"))').inputValue();
    const sampleSizeValue = await page.locator('select:near(:text("Sample Size"))').inputValue();

    expect(useMultiValue).toBe('0');
    expect(finalKValue).toBe('8');
    expect(sampleSizeValue).toBe('10');

    console.log('✓ Evaluate tab settings persisted after reload');
  });

  test('Retrieval tab settings should persist after save', async ({ page }) => {
    // Navigate to Retrieval tab (should be default)
    await page.goto('http://localhost:5173');
    await page.click('button:has-text("RAG")');
    await page.waitForTimeout(1000);

    // Change a retrieval setting
    const finalKInput = page.locator('input[name="FINAL_K"]');
    await finalKInput.fill('12');
    await finalKInput.blur(); // Trigger save

    await page.waitForTimeout(1000); // Wait for save

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back
    await page.click('button:has-text("RAG")');
    await page.waitForTimeout(1000);

    // Verify setting persisted
    const finalKValue = await page.locator('input[name="FINAL_K"]').inputValue();
    expect(parseInt(finalKValue)).toBe(12);

    console.log('✓ Retrieval tab settings persisted after reload');
  });
});
