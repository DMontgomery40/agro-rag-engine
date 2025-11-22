import { test, expect } from '@playwright/test';

test.describe('RAG Model Picker', () => {
  test('should load model options and allow selection', async ({ page }) => {
    // Navigate to RAG tab
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Click Retrieval subtab
    await page.click('text=Retrieval');
    await page.waitForTimeout(500); // Wait for subtab content to render

    // Wait for model select to be visible
    await page.waitForSelector('#gen-model-select', { timeout: 5000 });

    // Check that model dropdown has options
    const modelSelect = page.locator('#gen-model-select');
    await expect(modelSelect).toBeVisible();

    // Get all options
    const options = await modelSelect.locator('option').all();
    const optionCount = options.length;

    console.log(`Found ${optionCount} options in model dropdown`);

    // Should have more than just "Select a model..." option
    expect(optionCount).toBeGreaterThan(1);

    // Try selecting a model
    await modelSelect.selectOption({ index: 1 }); // Select first real model (not placeholder)

    // Verify selection worked
    const selectedValue = await modelSelect.inputValue();
    expect(selectedValue).not.toBe('');
    expect(selectedValue).not.toBe('Select a model...');

    console.log(`Successfully selected model: ${selectedValue}`);
  });

  test('API keys should be editable', async ({ page }) => {
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Click Retrieval subtab
    await page.click('text=Retrieval');
    await page.waitForTimeout(500); // Wait for subtab content to render

    // Find OpenAI API key input
    const apiKeyInput = page.locator('input[name="OPENAI_API_KEY"]');
    await expect(apiKeyInput).toBeVisible();

    // Clear and type new value
    await apiKeyInput.fill('sk-test-1234567890');

    // Verify value was set
    const value = await apiKeyInput.inputValue();
    expect(value).toBe('sk-test-1234567890');

    console.log('API key input is editable');
  });
});
