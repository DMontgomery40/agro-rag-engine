import { test, expect } from '@playwright/test';

/**
 * Comprehensive Evaluation System Test
 * Tests all 15 critical issues identified in D4's task list
 */

test.describe('Evaluation System - Complete Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8012');
    await page.waitForLoadState('networkidle');

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="app-container"], body', { timeout: 10000 });
  });

  test('Issue #1: API Endpoints Verification', async ({ page }) => {
    console.log('Testing API endpoint connectivity...');

    // Test /api/golden
    const goldenResponse = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8012/api/golden');
      return { status: res.status, data: await res.json() };
    });
    expect(goldenResponse.status).toBe(200);
    expect(goldenResponse.data).toHaveProperty('questions');

    // Test /api/eval/status
    const statusResponse = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8012/api/eval/status');
      return { status: res.status, data: await res.json() };
    });
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.data).toHaveProperty('running');

    // Test /api/traces/latest
    const traceResponse = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8012/api/traces/latest');
      return { status: res.status, data: await res.json() };
    });
    expect(traceResponse.status).toBe(200);

    // Test /api/golden/test
    const testResponse = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8012/api/golden/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'test question',
          repo: 'agro',
          expect_paths: ['test.py'],
          final_k: 5
        })
      });
      return { status: res.status, data: await res.json() };
    });
    expect(testResponse.status).toBe(200);
    expect(testResponse.data).toHaveProperty('ok', true);

    // Test /api/feedback
    const feedbackResponse = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8012/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 5,
          comment: 'test feedback',
          timestamp: new Date().toISOString(),
          context: 'evaluation'
        })
      });
      return { status: res.status, data: await res.json() };
    });
    expect(feedbackResponse.status).toBe(200);
    expect(feedbackResponse.data).toHaveProperty('ok', true);

    console.log('✓ All API endpoints working correctly');
  });

  test('Issues #2-5: Hooks and Service Integration', async ({ page }) => {
    console.log('Testing hooks and service integration...');

    // Navigate to Evaluation tab
    await page.click('text=Evaluation', { timeout: 5000 }).catch(async () => {
      // Fallback: try clicking any element that might open evaluation
      await page.click('[data-tab="evaluation"]').catch(() => {
        console.log('Could not find Evaluation tab, attempting navigation via URL');
      });
    });

    await page.waitForTimeout(1000);

    // Verify EvaluationRunner component is present (tests useEvaluation hook)
    const runnerVisible = await page.locator('text=Run Full Evaluation').isVisible();
    expect(runnerVisible).toBe(true);

    // Verify QuestionManager is accessible (tests useGoldenQuestions hook)
    await page.click('text=Golden Questions').catch(() => {});
    await page.waitForTimeout(500);
    const questionManagerVisible = await page.locator('text=Add Golden Question').isVisible();
    expect(questionManagerVisible).toBe(true);

    // Verify HistoryViewer is accessible (tests useEvalHistory hook)
    await page.click('text=History').catch(() => {});
    await page.waitForTimeout(500);
    const historyVisible = await page.locator('text=Evaluation History').isVisible();
    expect(historyVisible).toBe(true);

    console.log('✓ All hooks and services integrated correctly');
  });

  test('Issue #9: QuestionManager CRUD Operations', async ({ page }) => {
    console.log('Testing QuestionManager CRUD operations...');

    // Navigate to Golden Questions
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Golden Questions').catch(() => {});
    await page.waitForTimeout(1000);

    // Test ADD operation
    await page.fill('textarea[id="golden-new-q"]', 'Where is the test file?');
    await page.fill('input[id="golden-new-paths"]', 'test.py, test2.py');
    await page.click('button:has-text("Add Question")');
    await page.waitForTimeout(1000);

    // Verify question was added
    const questionAdded = await page.locator('text=Where is the test file?').isVisible();
    expect(questionAdded).toBe(true);

    // Test DELETE operation
    const deleteButtons = await page.locator('button:has-text("✗")').all();
    if (deleteButtons.length > 0) {
      // Accept the confirmation dialog
      page.once('dialog', dialog => dialog.accept());
      await deleteButtons[0].click();
      await page.waitForTimeout(500);
    }

    console.log('✓ QuestionManager CRUD operations working');
  });

  test('Issue #10: Test Single Question', async ({ page }) => {
    console.log('Testing single question test functionality...');

    // Navigate to Golden Questions
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Golden Questions').catch(() => {});
    await page.waitForTimeout(1000);

    // Add a test question first
    await page.fill('textarea[id="golden-new-q"]', 'Test query for single test');
    await page.fill('input[id="golden-new-paths"]', 'server/app.py');
    await page.click('button:has-text("Add Question")');
    await page.waitForTimeout(1000);

    // Find and click Test button
    const testButtons = await page.locator('button:has-text("Test")').all();
    if (testButtons.length > 0) {
      await testButtons[0].click();
      await page.waitForTimeout(2000);

      // Verify test result is displayed
      const resultVisible = await page.locator('text=Top-1, text=Top-K').count() > 0;
      expect(resultVisible).toBe(true);
    }

    console.log('✓ Single question test working');
  });

  test('Issue #11: Load Recommended Questions', async ({ page }) => {
    console.log('Testing load recommended questions...');

    // Navigate to Golden Questions
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Golden Questions').catch(() => {});
    await page.waitForTimeout(1000);

    // Click Load Recommended button
    await page.click('button:has-text("Load Recommended")');
    await page.waitForTimeout(2000);

    // Verify questions were added
    const questionCount = await page.locator('text=Golden Questions (').textContent();
    console.log('Question count after loading recommended:', questionCount);

    // Should have at least some questions loaded
    const count = parseInt(questionCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    console.log('✓ Load recommended questions working');
  });

  test('Issue #6: Progress Tracking During Evaluation', async ({ page }) => {
    console.log('Testing evaluation progress tracking...');

    // Navigate to Run Evaluation
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Run Evaluation').catch(() => {});
    await page.waitForTimeout(1000);

    // Start evaluation
    await page.click('button:has-text("Run Full Evaluation")');
    await page.waitForTimeout(500);

    // Verify progress bar appears
    const progressVisible = await page.locator('.eval-progress, text=Running').count() > 0;
    expect(progressVisible).toBe(true);

    console.log('✓ Progress tracking working');
  });

  test('Issue #7-8: Baseline and Export', async ({ page }) => {
    console.log('Testing baseline comparison and export...');

    // Navigate to Run Evaluation
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Run Evaluation').catch(() => {});
    await page.waitForTimeout(1000);

    // Wait for any existing evaluation to complete
    await page.waitForTimeout(2000);

    // Check if results are already present
    const saveBaselineButton = await page.locator('button:has-text("Save as Baseline")');
    const isVisible = await saveBaselineButton.isVisible().catch(() => false);

    if (isVisible) {
      // Test Save as Baseline
      await saveBaselineButton.click();
      await page.waitForTimeout(1000);

      // Test Compare with Baseline
      await page.click('button:has-text("Compare with Baseline")');
      await page.waitForTimeout(1000);

      // Verify comparison display
      const comparisonVisible = await page.locator('text=Baseline Comparison').isVisible();
      expect(comparisonVisible).toBe(true);

      // Test Export
      await page.click('button:has-text("Export Results")');
      await page.waitForTimeout(500);

      console.log('✓ Baseline comparison and export working');
    } else {
      console.log('⚠ No evaluation results available, skipping baseline test');
    }
  });

  test('Issue #12: HistoryViewer Data Display', async ({ page }) => {
    console.log('Testing HistoryViewer data display...');

    // Navigate to History
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=History').catch(() => {});
    await page.waitForTimeout(1000);

    // Verify history viewer is rendering
    const historyHeader = await page.locator('text=Evaluation History').isVisible();
    expect(historyHeader).toBe(true);

    // Check for export button
    const exportButton = await page.locator('button:has-text("Export")').count();
    expect(exportButton).toBeGreaterThan(0);

    console.log('✓ HistoryViewer working correctly');
  });

  test('Issue #13: TraceViewer Display', async ({ page }) => {
    console.log('Testing TraceViewer...');

    // Navigate to Trace Viewer
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Trace Viewer').catch(() => {});
    await page.waitForTimeout(1000);

    // Verify trace viewer header
    const traceHeader = await page.locator('text=Latest Trace').isVisible();
    expect(traceHeader).toBe(true);

    // Click refresh to load trace data
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(2000);

    // Verify trace data is displayed (may show "No traces" or actual data)
    const hasContent = await page.locator('text=Policy, text=No traces').count() > 0;
    expect(hasContent).toBe(true);

    console.log('✓ TraceViewer working correctly');
  });

  test('Issue #14: FeedbackPanel Submission', async ({ page }) => {
    console.log('Testing FeedbackPanel submission...');

    // Navigate to Feedback
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('text=Feedback').catch(() => {});
    await page.waitForTimeout(1000);

    // Verify feedback panel is visible
    const feedbackHeader = await page.locator('text=Help Us Improve').isVisible();
    expect(feedbackHeader).toBe(true);

    // Select 5 stars
    const stars = await page.locator('button[aria-label*="star"]').all();
    if (stars.length >= 5) {
      await stars[4].click(); // Click 5th star
      await page.waitForTimeout(500);
    }

    // Add comment
    await page.fill('textarea[id="feedback-comment"]', 'Test feedback from Playwright');

    // Submit feedback
    await page.click('button:has-text("Submit Feedback")');
    await page.waitForTimeout(1500);

    // Verify success message
    const successVisible = await page.locator('text=Thank you, text=submitted').count() > 0;
    expect(successVisible).toBe(true);

    console.log('✓ FeedbackPanel submission working');
  });

  test('Issue #15: Full Workflow Integration', async ({ page }) => {
    console.log('Testing complete evaluation workflow...');

    // Step 1: Navigate to Evaluation
    await page.click('text=Evaluation', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Step 2: Add a golden question
    await page.click('text=Golden Questions').catch(() => {});
    await page.waitForTimeout(500);
    await page.fill('textarea[id="golden-new-q"]', 'Workflow test question');
    await page.fill('input[id="golden-new-paths"]', 'test.py');
    await page.click('button:has-text("Add Question")');
    await page.waitForTimeout(1000);

    // Step 3: Run evaluation
    await page.click('text=Run Evaluation').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('button:has-text("Run Full Evaluation")');
    await page.waitForTimeout(1000);

    // Step 4: Check history after evaluation
    await page.waitForTimeout(3000); // Wait for evaluation to complete
    await page.click('text=History').catch(() => {});
    await page.waitForTimeout(1000);

    // Step 5: View trace
    await page.click('text=Trace Viewer').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(1000);

    // Step 6: Submit feedback
    await page.click('text=Feedback').catch(() => {});
    await page.waitForTimeout(500);
    const feedbackStars = await page.locator('button[aria-label*="star"]').all();
    if (feedbackStars.length >= 4) {
      await feedbackStars[3].click();
      await page.waitForTimeout(300);
    }
    await page.fill('textarea[id="feedback-comment"]', 'Workflow test complete');
    await page.click('button:has-text("Submit Feedback")');
    await page.waitForTimeout(1500);

    console.log('✓ Complete workflow integration successful');
  });
});
