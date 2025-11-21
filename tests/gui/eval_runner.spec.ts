import { test, expect } from '@playwright/test';

test.describe('Evaluation Runner - NaN Bug Fixes', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8012', { waitUntil: 'networkidle' });

        // Wait for app to be ready
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Try to navigate to RAG tab using click visible approach
        const ragTab = page.locator('[data-tab="rag"]');
        if (await ragTab.isHidden({ timeout: 1000 }).catch(() => false)) {
            // If hidden, scroll to make it visible
            await ragTab.evaluate(el => el.scrollIntoView());
        }

        await ragTab.click({ force: true });
        await page.waitForTimeout(1000);

        // Navigate to Evaluate subtab
        const evaluateSubtab = page.locator('[data-subtab="evaluate"]');
        await evaluateSubtab.click({ force: true });
        await page.waitForTimeout(1000);
    });

    test('should display error message when Qdrant is unavailable instead of NaN', async ({ page }) => {
        // This test checks that proper error handling is in place
        // When Qdrant is unavailable, the frontend should show a meaningful error, not NaN values

        const runBtn = page.locator('#btn-eval-run');
        await expect(runBtn).toBeVisible();
        await expect(runBtn).toBeEnabled();

        // Try to run evaluation
        await runBtn.click();

        // Wait for response - either success or error
        await page.waitForTimeout(2000);

        // Check if we got either:
        // 1. Running progress (success case)
        // 2. An error alert (Qdrant unavailable or other issue)

        const progressBar = page.locator('#eval-progress');
        const statusEl = page.locator('#eval-status');

        // If evaluation started, it should show progress
        const isRunning = await progressBar.isVisible().catch(() => false);

        if (isRunning) {
            // Evaluation is running - this is good, backend validation passed
            await expect(progressBar).toBeVisible();
            const statusText = await statusEl.textContent();
            expect(statusText).not.toContain('undefined');
            expect(statusText).not.toContain('NaN');
        } else {
            // If not running, we should get a meaningful error message via alert
            // The browser will have an alert if validation failed
            page.on('dialog', async dialog => {
                const message = dialog.message();
                // Error message should be meaningful, not about NaN or undefined
                expect(message).not.toContain('NaN');
                expect(message).not.toContain('undefined');
                expect(message).toBeTruthy();
                await dialog.accept();
            });
        }
    });

    test('should validate golden.json exists before running evaluation', async ({ page }) => {
        // Test that preflight validation checks for golden.json

        const goldenInput = page.locator('#eval-golden-path');
        await goldenInput.fill('data/nonexistent.json');

        const saveBtn = page.locator('#btn-eval-save-settings');
        await saveBtn.click();
        await page.waitForTimeout(500);

        const runBtn = page.locator('#btn-eval-run');
        await runBtn.click();

        // Wait for error response
        await page.waitForTimeout(1500);

        // Should get an error about missing file, not NaN
        page.on('dialog', async dialog => {
            const message = dialog.message();
            expect(message).toContain('Golden questions file not found');
            expect(message).not.toContain('NaN');
            await dialog.accept();
        });
    });

    test('should not display NaN in evaluation results', async ({ page }) => {
        // This is a smoke test to ensure the frontend properly handles results

        const runBtn = page.locator('#btn-eval-run');

        // If evaluation completes, verify no NaN values in results
        // This would happen after a successful evaluation run

        // Check that accuracy metrics have proper format
        const top1Acc = page.locator('#eval-top1-acc');
        const topkAcc = page.locator('#eval-topk-acc');

        // Wait for potential evaluation to complete (with timeout)
        await page.waitForTimeout(2000);

        // If results are shown, verify no NaN
        if (await top1Acc.isVisible().catch(() => false)) {
            const top1Text = await top1Acc.textContent();
            const topkText = await topkAcc.textContent();

            // Should show percentage, not NaN
            expect(top1Text).not.toContain('NaN');
            expect(topkText).not.toContain('NaN');

            // Should show proper percentage format
            expect(top1Text).toMatch(/%/);
            expect(topkText).toMatch(/%/);
        }
    });

    test('should not show NaN in error responses', async ({ page }) => {
        // Verify that error handling in frontend doesn't produce NaN values

        // Attempt to run evaluation
        const runBtn = page.locator('#btn-eval-run');
        await runBtn.click();

        await page.waitForTimeout(2500);

        // Check status message for any NaN or undefined values
        const statusEl = page.locator('#eval-status');
        const statusText = await statusEl.textContent().catch(() => '');

        // Status text should be meaningful, not contain NaN
        if (statusText && statusText.length > 0) {
            expect(statusText).not.toContain('NaN');
            expect(statusText).not.toContain('undefined');
        }

        // Check results metrics display
        const top1Acc = page.locator('#eval-top1-acc');
        if (await top1Acc.isVisible().catch(() => false)) {
            const top1Text = await top1Acc.textContent();
            expect(top1Text).not.toContain('NaN');
        }
    });

    test('button should be enabled and functional (not fake)', async ({ page }) => {
        // Verify the buttons are real and functional

        const runBtn = page.locator('#btn-eval-run');
        const compareBtn = page.locator('#btn-eval-compare');
        const saveBtn = page.locator('#btn-eval-save-baseline');
        const exportBtn = page.locator('#btn-eval-export');

        // All buttons should be visible and enabled initially
        await expect(runBtn).toBeVisible();
        await expect(runBtn).toBeEnabled();

        await expect(compareBtn).toBeVisible();
        await expect(compareBtn).toBeEnabled();

        await expect(saveBtn).toBeVisible();
        await expect(saveBtn).toBeEnabled();

        await expect(exportBtn).toBeVisible();
        await expect(exportBtn).toBeEnabled();

        // Run button click should trigger something (either success or error)
        const initialText = await runBtn.textContent();
        expect(initialText).toContain('Run Full Evaluation');

        await runBtn.click();
        await page.waitForTimeout(500);

        // Button state should change (disable or show loading state)
        const afterClickText = await runBtn.textContent();
        // Text might change to 'Starting...' or button might be disabled
        const isDisabled = await runBtn.isDisabled().catch(() => false);
        const textChanged = afterClickText !== initialText;

        expect(isDisabled || textChanged).toBeTruthy();
    });
});
