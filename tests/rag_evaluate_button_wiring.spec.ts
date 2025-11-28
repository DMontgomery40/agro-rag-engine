import { test, expect } from '@playwright/test';

/**
 * RAG Evaluate Subtab - Run Full Evaluation Button Wiring Test
 *
 * Verifies that the "Run Full Evaluation" button in the RAG > Evaluate subtab
 * is properly wired to the backend and shows UI feedback when clicked.
 *
 * This test addresses the issue where the button previously did nothing
 * (no UI response, not even error messages) due to dangerouslySetInnerHTML
 * being used instead of the proper React EvaluationRunner component.
 */

test.describe('RAG Evaluate Subtab - Button Wiring', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and RAG tab
    await page.goto('http://localhost:5173/web/');
    await page.waitForLoadState('networkidle');

    // Click RAG tab
    const ragTab = page.locator('.tab-bar button:has-text("RAG")');
    await ragTab.click();
    await page.waitForTimeout(500);

    // Click Evaluate subtab
    const evaluateSubtab = page.locator('.subtab-bar button:has-text("Evaluate")');
    await evaluateSubtab.click();
    await page.waitForTimeout(500);
  });

  test('Evaluate subtab loads with EvaluationRunner component (not dangerouslySetInnerHTML)', async ({ page }) => {
    // Verify the subtab is active
    const evaluateContent = page.locator('#tab-rag-evaluate');
    await expect(evaluateContent).toBeVisible();

    const classAttr = await evaluateContent.getAttribute('class');
    expect(classAttr).toContain('active');

    // Verify EvaluationRunner component rendered (has expected structure)
    const evalConfig = page.locator('text=/Evaluation Configuration/i');
    await expect(evalConfig).toBeVisible();

    // Verify NO dangerouslySetInnerHTML artifacts (old HTML had id="btn-eval-run")
    const oldButton = page.locator('#btn-eval-run');
    const oldCount = await oldButton.count();
    expect(oldCount).toBe(0);
  });

  test('Run Full Evaluation button exists and is enabled', async ({ page }) => {
    // Find button by text content
    const runButton = page.locator('button:has-text("Run Full Evaluation")');

    // Verify button exists
    await expect(runButton).toBeVisible();

    // Verify button is NOT disabled (this was the bug - button existed but did nothing)
    const isDisabled = await runButton.isDisabled();
    expect(isDisabled).toBe(false);

    // Verify button has proper styling (not a placeholder)
    const bgColor = await runButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Should have a background color (not transparent/default)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('');
  });

  test('Clicking Run Full Evaluation shows immediate UI feedback', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Full Evaluation")');

    // Set up network request listener to verify backend call
    const apiRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/eval')) {
        apiRequests.push(url);
      }
    });

    // Click the button
    await runButton.click();

    // Wait a moment for UI to update
    await page.waitForTimeout(500);

    // CRITICAL: Verify SOMETHING changed in the UI (proves it's wired)
    // Option 1: Button becomes disabled
    const isDisabledAfterClick = await runButton.isDisabled();

    // Option 2: Button text changes (to show progress)
    const buttonText = await runButton.textContent();
    const textChanged = buttonText !== 'Run Full Evaluation';

    // Option 3: Progress indicator appears
    const progressExists = await page.locator('[class*="progress"]').count() > 0;

    // Option 4: API call was made
    const apiCallMade = apiRequests.length > 0;

    // At least ONE of these should be true (proves button is wired)
    const uiFeedbackDetected = isDisabledAfterClick || textChanged || progressExists || apiCallMade;

    expect(uiFeedbackDetected).toBe(true);

    if (!uiFeedbackDetected) {
      // Helpful debug info if test fails
      console.error('NO UI FEEDBACK DETECTED:');
      console.error(`  Button disabled: ${isDisabledAfterClick}`);
      console.error(`  Button text: "${buttonText}"`);
      console.error(`  Progress visible: ${progressExists}`);
      console.error(`  API calls: ${apiRequests.length}`);

      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/eval-button-no-feedback.png', fullPage: true });
    }
  });

  test('Configuration inputs exist and can be modified', async ({ page }) => {
    // Verify Multi-Stage Retrieval dropdown
    const useMultiSelect = page.locator('#eval-use-multi');
    await expect(useMultiSelect).toBeVisible();

    const isSelectDisabled = await useMultiSelect.isDisabled();
    expect(isSelectDisabled).toBe(false);

    // Verify Final K input
    const finalKInput = page.locator('#eval-final-k');
    await expect(finalKInput).toBeVisible();

    const isInputDisabled = await finalKInput.isDisabled();
    expect(isInputDisabled).toBe(false);

    // Try changing values (proves inputs are wired to React state)
    await useMultiSelect.selectOption('0');
    await finalKInput.fill('10');

    const newValue = await finalKInput.inputValue();
    expect(newValue).toBe('10');
  });

  test('Evaluate subtab does not crash on load (React component renders)', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Wait for component to fully render
    await page.waitForTimeout(1000);

    // Verify no React errors
    const hasReactError = errors.some(err =>
      err.includes('React') ||
      err.includes('dangerouslySetInnerHTML') ||
      err.includes('Cannot read properties')
    );

    expect(hasReactError).toBe(false);

    // If there are errors, log them for debugging
    if (errors.length > 0) {
      console.log('Console errors detected:', errors);
    }
  });

  test('Backend API endpoint is available (smoke test)', async ({ page }) => {
    // Verify evaluation API endpoint responds (even if empty/error, proves backend exists)
    const response = await page.request.get('http://localhost:8012/api/eval/status');

    // Should get SOME response (not 404)
    expect(response.status()).not.toBe(404);

    // Common valid responses: 200 (OK), 400 (bad request), 500 (server error)
    // All prove the endpoint exists and is wired
    const validStatuses = [200, 400, 500, 503];
    expect(validStatuses).toContain(response.status());
  });
});
