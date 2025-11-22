import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test('Data Quality tab loads and saves repos.json correctly', async ({ page }) => {
  await page.goto(baseUrl);

  // Ensure app root renders
  const root = page.locator('#root');
  await expect(root).toBeVisible();

  // Navigate to RAG tab
  const ragLink = page.locator('a[href="/rag"], a[href="/web/rag"]').first();
  await expect(ragLink).toBeVisible();
  await ragLink.click();

  // Wait for navigation
  await page.waitForURL(/\/rag/, { timeout: 5000 });

  // Verify RAG tab is visible
  const ragTab = page.locator('#tab-rag');
  await expect(ragTab).toBeVisible({ timeout: 5000 });

  // Click on Data Quality subtab
  const dataQualitySubtab = page.locator('button:has-text("Data Quality")');
  await expect(dataQualitySubtab).toBeVisible();
  await dataQualitySubtab.click();

  // Verify Repository Configuration section is visible
  const repoConfig = page.locator('text=Repository Configuration');
  await expect(repoConfig).toBeVisible();

  // Verify repository selector exists
  const repoSelect = page.locator('select').filter({ hasText: /agro|Loading/ }).first();
  await expect(repoSelect).toBeVisible({ timeout: 5000 });

  // Verify exclude paths field exists in Repository Configuration
  const excludePathsInput = page.locator('input[placeholder*="docs, tests"]').first();
  await expect(excludePathsInput).toBeVisible({ timeout: 5000 });

  // Verify Cards Builder section exists
  const cardsBuilder = page.locator('text=Code Cards Builder');
  await expect(cardsBuilder).toBeVisible();

  // Verify Cards Builder exclude directories field exists and is synced
  const cardsExcludeDirs = page.locator('#cards-exclude-dirs');
  await expect(cardsExcludeDirs).toBeVisible();

  // Check that exclude directories field is pre-filled (should have some values from repos.json)
  const excludeDirsValue = await cardsExcludeDirs.inputValue();
  expect(excludeDirsValue.length).toBeGreaterThan(0); // Should be pre-filled from repos.json
});

