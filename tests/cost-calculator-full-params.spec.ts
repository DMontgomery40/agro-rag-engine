import { test, expect } from '@playwright/test';

test.describe('Cost Calculator - Full Parameters', () => {
  test('should calculate costs with all parameters including voyage embeddings', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('=== Test 1: OpenAI Generation + Voyage Embeddings ===');

    // Set generation (OpenAI gpt-4o-mini)
    await page.selectOption('#cost-provider', 'openai');
    await page.fill('#cost-model', 'gpt-4o-mini');
    await page.fill('#cost-in', '1000');
    await page.fill('#cost-out', '200');
    await page.fill('#cost-rpd', '100');

    // Set embeddings (Voyage large - expensive model)
    await page.selectOption('#cost-embed-provider', 'voyage');
    await page.fill('#cost-embed-model', 'voyage-3-large');
    await page.fill('#cost-embeds', '1000000');  // 1M embedding tokens per day

    // Set reranking
    await page.selectOption('#cost-rerank-provider', 'cohere');
    await page.fill('#cost-rerank-model', 'rerank-3.5');
    await page.fill('#cost-rerank', '1000');  // 1000 rerank operations

    console.log('Form values set:');
    console.log('  Generation: openai/gpt-4o-mini, 1000 in/200 out, 100 req/day');
    console.log('  Embeddings: voyage/voyage-3-large, 1M tokens/day');
    console.log('  Reranking: cohere/rerank-3.5, 1000 ops/day');

    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message;
      console.log('Alert:', String(alertMessage));
      await dialog.dismiss();
    });

    // Click calculate
    const calculateBtn = page.locator('#btn-estimate');
    await calculateBtn.click();
    await page.waitForTimeout(2000);

    // Check results
    const dailyCost = await page.locator('#cost-daily').textContent();
    const monthlyCost = await page.locator('#cost-monthly').textContent();

    console.log('Results:');
    console.log(`  Daily: ${dailyCost}`);
    console.log(`  Monthly: ${monthlyCost}`);

    // Verify no errors
    expect(String(alertMessage).toLowerCase()).not.toContain('costlogic missing');
    expect(String(alertMessage).toLowerCase()).not.toContain('cost estimation failed');

    // Verify costs are displayed and contain $
    expect(dailyCost).toContain('$');
    expect(monthlyCost).toContain('$');

    // The cost should be significant due to 1M embedding tokens per day
    const dailyValue = parseFloat(dailyCost?.replace('$', '') || '0');
    expect(dailyValue).toBeGreaterThan(0.1);  // Should be at least $0.1/day with embeddings

    console.log('✓ Test passed - All parameters working correctly\n');

    // Test 2: Verify embedding cost is significant
    console.log('=== Test 2: Verify Voyage embedding cost impact ===');

    // Clear embeddings to compare
    await page.fill('#cost-embeds', '0');
    await calculateBtn.click();
    await page.waitForTimeout(2000);

    const dailyCostNoEmbed = await page.locator('#cost-daily').textContent();
    console.log(`  Daily (no embeddings): ${dailyCostNoEmbed}`);

    const noCostValue = parseFloat(dailyCostNoEmbed?.replace('$', '') || '0');

    // Set embeddings back
    await page.fill('#cost-embeds', '1000000');
    await calculateBtn.click();
    await page.waitForTimeout(2000);

    const dailyCostWithEmbed = await page.locator('#cost-daily').textContent();
    console.log(`  Daily (with 1M embed tokens): ${dailyCostWithEmbed}`);

    const withCostValue = parseFloat(dailyCostWithEmbed?.replace('$', '') || '0');

    // Verify that adding embeddings increased the cost
    expect(withCostValue).toBeGreaterThan(noCostValue);
    console.log(`✓ Embedding cost impact verified: +$${(withCostValue - noCostValue).toFixed(4)}/day`);
  });
});
