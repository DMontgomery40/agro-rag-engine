import { test, expect } from '@playwright/test';

test.describe('Data Quality Tab - Content Rendering', () => {
  test('should render all content from Data Quality tab correctly', async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/gui/');
    await page.waitForLoadState('networkidle');

    // Navigate to the RAG tab
    await page.getByTestId('tab-btn-rag').click();
    await page.waitForSelector('#tab-rag', { state: 'visible' });

    // The Data Quality tab should be active by default
    const dataQualityTab = page.locator('#tab-rag-data-quality');
    await expect(dataQualityTab).toBeVisible();

    // Verify Repository Configuration section exists
    const repoConfigSection = page.locator('h3', { hasText: 'Repository Configuration' });
    await expect(repoConfigSection).toBeVisible();
    console.log('✅ Repository Configuration section is visible');

    // Verify Code Cards Builder & Viewer section exists
    const cardsBuilderSection = page.locator('h3', { hasText: /Code Cards Builder/ });
    await expect(cardsBuilderSection).toBeVisible();
    console.log('✅ Code Cards Builder & Viewer section is visible');

    // Verify Repository to Build Cards For select exists
    const repoSelect = page.locator('#cards-repo-select');
    await expect(repoSelect).toBeVisible();
    console.log('✅ Repository to Build Cards For select is visible');

    // Verify Exclude Directories input exists
    const excludeDirsInput = page.locator('#cards-exclude-dirs');
    await expect(excludeDirsInput).toBeVisible();
    console.log('✅ Exclude Directories input is visible');

    // Verify Exclude Patterns input exists
    const excludePatternsInput = page.locator('#cards-exclude-patterns');
    await expect(excludePatternsInput).toBeVisible();
    console.log('✅ Exclude Patterns input is visible');

    // Verify Exclude Keywords input exists
    const excludeKeywordsInput = page.locator('#cards-exclude-keywords');
    await expect(excludeKeywordsInput).toBeVisible();
    console.log('✅ Exclude Keywords input is visible');

    // Verify Cards Max input exists
    const cardsMaxInput = page.locator('#cards-max');
    await expect(cardsMaxInput).toBeVisible();
    console.log('✅ Cards Max input is visible');

    // Verify Enrich with AI checkbox exists
    const enrichCheckbox = page.locator('#cards-enrich-gui');
    await expect(enrichCheckbox).toBeVisible();
    console.log('✅ Enrich with AI checkbox is visible');

    // Verify Build Cards button exists
    const buildButton = page.locator('#btn-cards-build');
    await expect(buildButton).toBeVisible();
    const buildButtonText = await buildButton.textContent();
    expect(buildButtonText).toContain('Build Cards');
    console.log('✅ Build Cards button is visible');

    // Verify Refresh button exists
    const refreshButton = page.locator('#btn-cards-refresh');
    await expect(refreshButton).toBeVisible();
    console.log('✅ Refresh button is visible');

    // Verify View All button exists
    const viewAllButton = page.locator('#btn-cards-view-all');
    await expect(viewAllButton).toBeVisible();
    console.log('✅ View All button is visible');

    // Verify Cards Viewer container exists
    const cardsViewerContainer = page.locator('#cards-viewer-container');
    await expect(cardsViewerContainer).toBeVisible();
    console.log('✅ Cards Viewer container is visible');

    // Verify Cards Viewer grid exists
    const cardsViewer = page.locator('#cards-viewer');
    await expect(cardsViewer).toBeVisible();
    console.log('✅ Cards Viewer grid is visible');

    // Verify Terminal container exists
    const terminalContainer = page.locator('#cards-terminal-container');
    await expect(terminalContainer).toBeVisible();
    console.log('✅ Cards Terminal container is visible');

    // Verify Semantic Synonyms section exists
    const semanticSynonymsSection = page.locator('h3', { hasText: /Semantic Synonyms/ });
    await expect(semanticSynonymsSection).toBeVisible();
    console.log('✅ Semantic Synonyms section is visible');

    // Verify help icons exist with data-tooltip attributes
    const helpIcons = page.locator('[data-tooltip]');
    const helpIconCount = await helpIcons.count();
    expect(helpIconCount).toBeGreaterThan(0);
    console.log(`✅ Found ${helpIconCount} help icons with tooltips`);

    // Verify specific help icon for CARDS_REPO
    const cardsRepoHelp = page.locator('[data-tooltip="CARDS_REPO"]');
    await expect(cardsRepoHelp).toBeVisible();
    console.log('✅ Help icon for CARDS_REPO is visible');

    // Verify specific help icon for CARDS_EXCLUDE_DIRS
    const excludeDirsHelp = page.locator('[data-tooltip="CARDS_EXCLUDE_DIRS"]');
    await expect(excludeDirsHelp).toBeVisible();
    console.log('✅ Help icon for CARDS_EXCLUDE_DIRS is visible');

    // Verify specific help icon for CARDS_MAX
    const cardsMaxHelp = page.locator('[data-tooltip="CARDS_MAX"]');
    await expect(cardsMaxHelp).toBeVisible();
    console.log('✅ Help icon for CARDS_MAX is visible');

    console.log('\n✅ ALL CONTENT VERIFICATION PASSED - Data Quality tab renders all required content correctly');
  });
});
