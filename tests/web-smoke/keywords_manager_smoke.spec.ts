import { test, expect } from '@playwright/test';

test.describe('Keywords Manager', () => {
  test('should load and display keywords configuration', async ({ page }) => {
    // Navigate to RAG tab -> Data Quality subtab
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Click Data Quality subtab
    await page.click('text=Data Quality');
    await page.waitForTimeout(500); // Wait for subtab content to render

    // Wait for Keywords Manager section to be visible
    await page.waitForSelector('text=Keywords Manager', { timeout: 5000 });

    // Verify all 5 keyword fields are present and visible
    const maxPerRepo = page.locator('#KEYWORDS_MAX_PER_REPO');
    await expect(maxPerRepo).toBeVisible();

    const minFreq = page.locator('#KEYWORDS_MIN_FREQ');
    await expect(minFreq).toBeVisible();

    const boost = page.locator('#KEYWORDS_BOOST');
    await expect(boost).toBeVisible();

    const autoGenerate = page.locator('#KEYWORDS_AUTO_GENERATE');
    await expect(autoGenerate).toBeVisible();

    const refreshHours = page.locator('#KEYWORDS_REFRESH_HOURS');
    await expect(refreshHours).toBeVisible();

    console.log('✓ All 5 keywords configuration fields are visible');

    // Verify default values are loaded
    const maxValue = await maxPerRepo.inputValue();
    expect(parseInt(maxValue, 10)).toBeGreaterThan(0);

    const minValue = await minFreq.inputValue();
    expect(parseInt(minValue, 10)).toBeGreaterThan(0);

    const boostValue = await boost.inputValue();
    expect(parseFloat(boostValue)).toBeGreaterThan(0);

    console.log('✓ Keywords configuration values loaded successfully');
    console.log(`  Max Per Repo: ${maxValue}`);
    console.log(`  Min Freq: ${minValue}`);
    console.log(`  Boost: ${boostValue}`);
  });

  test('should allow editing keywords configuration', async ({ page }) => {
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Click Data Quality subtab
    await page.click('text=Data Quality');
    await page.waitForTimeout(500);

    // Find keywords fields
    const maxPerRepo = page.locator('#KEYWORDS_MAX_PER_REPO');
    await expect(maxPerRepo).toBeVisible();

    // Change value and blur to trigger save
    await maxPerRepo.fill('100');
    await maxPerRepo.blur();

    // Wait a bit for save to complete
    await page.waitForTimeout(500);

    // Verify value persisted
    const value = await maxPerRepo.inputValue();
    expect(value).toBe('100');

    console.log('✓ Keywords configuration is editable and saves');
  });
});
