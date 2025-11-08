import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing onboarding state
    await page.goto('/gui/');
    await page.evaluate(() => {
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_state');
    });

    // Navigate to Start tab (onboarding)
    await page.waitForSelector('.tab-bar');
    await page.locator("button[data-testid='tab-btn-start']").click();
    await page.waitForTimeout(500);
  });

  test('wizard renders with progress dots', async ({ page }) => {
    // Check progress dots are visible
    const dots = await page.locator('.ob-dot').count();
    expect(dots).toBe(5);

    // First dot should be active
    const firstDot = page.locator('.ob-dot').first();
    await expect(firstDot).toHaveClass(/active/);
  });

  test('Step 1: Welcome step displays and source selection works', async ({ page }) => {
    // Welcome step should be visible
    await expect(page.locator('#onboard-welcome')).toBeVisible();
    await expect(page.locator('#onboard-welcome .ob-title')).toContainText('Welcome to AGRO');

    // Check source choice cards are present
    const cards = await page.locator('.ob-card').count();
    expect(cards).toBe(2);

    // Click folder option to advance
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);

    // Should now be on step 2
    await expect(page.locator('#onboard-source')).toBeVisible();
    const activeDot = page.locator('.ob-dot.active');
    await expect(activeDot).toContainText('2');
  });

  test('Step 2: Source step allows folder and GitHub input', async ({ page }) => {
    // Navigate to step 2
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);

    // Folder mode should be active by default
    await expect(page.locator('#onboard-folder-mode')).toHaveClass(/active/);

    // Enter a folder path
    await page.fill('#onboard-folder-path', '/test/project/path');
    const folderValue = await page.inputValue('#onboard-folder-path');
    expect(folderValue).toBe('/test/project/path');

    // Switch to GitHub mode
    await page.locator('.ob-mode-tab').nth(1).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#onboard-github-mode')).toHaveClass(/active/);

    // Enter GitHub URL
    await page.fill('#onboard-github-url', 'https://github.com/test/repo');
    const githubValue = await page.inputValue('#onboard-github-url');
    expect(githubValue).toBe('https://github.com/test/repo');

    // Enter branch
    await page.fill('#onboard-github-branch', 'develop');
    const branchValue = await page.inputValue('#onboard-github-branch');
    expect(branchValue).toBe('develop');
  });

  test('Step 3: Index step shows progress indicators', async ({ page }) => {
    // Navigate to step 3
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);
    await page.locator('#onboard-next').click();
    await page.waitForTimeout(500);

    // Index step should be visible
    await expect(page.locator('#onboard-index')).toBeVisible();

    // Progress indicators should exist
    await expect(page.locator('.ob-stages')).toBeVisible();
    const stages = await page.locator('.ob-stage').count();
    expect(stages).toBe(3);

    // Progress bar should exist
    await expect(page.locator('.ob-progress-bar')).toBeVisible();
    await expect(page.locator('#onboard-index-status')).toBeVisible();

    // Note: Actual indexing would require backend, so we just verify UI elements
  });

  test('Step 4: Questions step allows asking questions', async ({ page }) => {
    // Navigate to step 4 directly by clicking progress dots
    await page.locator('.ob-dot').nth(3).click();
    await page.waitForTimeout(500);

    // Questions step should be visible
    await expect(page.locator('#onboard-questions')).toBeVisible();
    await expect(page.locator('.ob-title')).toContainText('Ask Your Codebase');

    // Check all 3 question inputs exist
    const questionInputs = await page.locator('.ob-question-input').count();
    expect(questionInputs).toBe(3);

    // Check default questions are populated
    const q1 = await page.inputValue('#onboard-q1');
    expect(q1).toContain('hybrid retrieval');

    // Edit a question
    await page.fill('#onboard-q1', 'What is the main entry point?');
    const newQ1 = await page.inputValue('#onboard-q1');
    expect(newQ1).toBe('What is the main entry point?');

    // Ask buttons should be present
    const askButtons = await page.locator('.ob-ask-btn').count();
    expect(askButtons).toBe(3);

    // Save golden button should be visible
    await expect(page.locator('#onboard-save-golden')).toBeVisible();
  });

  test('Step 5: Tune step has sliders and save options', async ({ page }) => {
    // Navigate to step 5 directly
    await page.locator('.ob-dot').nth(4).click();
    await page.waitForTimeout(500);

    // Tune step should be visible
    await expect(page.locator('#onboard-tune')).toBeVisible();
    await expect(page.locator('.ob-title')).toContainText('Tune and Save');

    // Check all 3 sliders exist
    await expect(page.locator('#onboard-slider-speed')).toBeVisible();
    await expect(page.locator('#onboard-slider-quality')).toBeVisible();
    await expect(page.locator('#onboard-slider-cloud')).toBeVisible();

    // Adjust speed slider
    await page.locator('#onboard-slider-speed').fill('3');
    const speedValue = await page.inputValue('#onboard-slider-speed');
    expect(speedValue).toBe('3');

    // Settings summary should update
    await expect(page.locator('#onboard-settings-summary')).toBeVisible();
    const summary = await page.locator('#onboard-summary-content').textContent();
    expect(summary).toContain('MQ_REWRITES');

    // Action buttons should be present
    await expect(page.locator('#onboard-save-project')).toBeVisible();
    await expect(page.locator('#onboard-run-eval')).toBeVisible();
  });

  test('Navigation: back and next buttons work correctly', async ({ page }) => {
    // Start at step 1
    await expect(page.locator('#onboard-welcome')).toBeVisible();

    // Back button should be hidden on step 1
    const backBtn = page.locator('#onboard-back');
    await expect(backBtn).toBeHidden();

    // Navigate to step 2
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);

    // Back button should now be visible
    await expect(backBtn).toBeVisible();

    // Next button should be visible (not on step 1 or 5)
    const nextBtn = page.locator('#onboard-next');
    await expect(nextBtn).toBeVisible();

    // Click back to return to step 1
    await backBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#onboard-welcome')).toBeVisible();
  });

  test('Progress dots are clickable and navigate to steps', async ({ page }) => {
    // Click on dot 3
    await page.locator('.ob-dot').nth(2).click();
    await page.waitForTimeout(300);

    // Should be on step 3
    await expect(page.locator('#onboard-index')).toBeVisible();
    const activeDot = page.locator('.ob-dot.active');
    await expect(activeDot).toContainText('3');

    // Click on dot 5
    await page.locator('.ob-dot').nth(4).click();
    await page.waitForTimeout(300);

    // Should be on step 5
    await expect(page.locator('#onboard-tune')).toBeVisible();
  });

  test('Wizard state persists to localStorage', async ({ page }) => {
    // Navigate to step 3
    await page.locator('.ob-dot').nth(2).click();
    await page.waitForTimeout(300);

    // Check localStorage
    const step = await page.evaluate(() => localStorage.getItem('onboarding_step'));
    expect(step).toBe('3');

    // Enter some data in step 2
    await page.locator('.ob-dot').nth(1).click();
    await page.waitForTimeout(300);
    await page.fill('#onboard-folder-path', '/my/test/path');
    await page.waitForTimeout(300);

    // Check state is saved
    const state = await page.evaluate(() => {
      const saved = localStorage.getItem('onboarding_state');
      return saved ? JSON.parse(saved) : null;
    });

    expect(state).toBeTruthy();
    expect(state.projectDraft?.folderPath).toBe('/my/test/path');
  });

  test('Accessibility: all interactive elements have proper ARIA labels', async ({ page }) => {
    // Check progress dots have aria-label
    const dot1 = page.locator('.ob-dot').first();
    const ariaLabel = await dot1.getAttribute('aria-label');
    expect(ariaLabel).toContain('Step 1');

    // Navigate to step 2
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);

    // Check folder input has aria-label
    const folderInput = page.locator('#onboard-folder-path');
    const folderLabel = await folderInput.getAttribute('aria-label');
    expect(folderLabel).toBeTruthy();

    // Navigate to step 4
    await page.locator('.ob-dot').nth(3).click();
    await page.waitForTimeout(300);

    // Check ask buttons have aria-label
    const askBtn = page.locator('.ob-ask-btn').first();
    const askLabel = await askBtn.getAttribute('aria-label');
    expect(askLabel).toContain('Ask question');
  });

  test('Complete wizard flow from start to finish', async ({ page }) => {
    // Step 1: Select folder source
    await expect(page.locator('#onboard-welcome')).toBeVisible();
    await page.locator('.ob-card').first().click();
    await page.waitForTimeout(300);

    // Step 2: Enter folder path
    await expect(page.locator('#onboard-source')).toBeVisible();
    await page.fill('#onboard-folder-path', '/test/project');

    // Navigate through all steps using progress dots
    await page.locator('.ob-dot').nth(2).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#onboard-index')).toBeVisible();

    await page.locator('.ob-dot').nth(3).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#onboard-questions')).toBeVisible();

    await page.locator('.ob-dot').nth(4).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#onboard-tune')).toBeVisible();

    // Verify we can adjust settings
    await page.locator('#onboard-slider-speed').fill('4');
    const summary = await page.locator('#onboard-summary-content').textContent();
    expect(summary).toContain('MQ_REWRITES=4');

    // Verify action buttons are enabled
    await expect(page.locator('#onboard-save-project')).toBeEnabled();
    await expect(page.locator('#onboard-run-eval')).toBeEnabled();
  });
});
