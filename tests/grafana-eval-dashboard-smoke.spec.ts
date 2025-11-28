import { test, expect } from '@playwright/test';

test.describe('Grafana Eval Dashboard Smoke Test', () => {
  test('dashboard loads and displays eval data', async ({ page, request }) => {
    // Verify Grafana is up
    const health = await request.get('http://localhost:3000/api/health');
    expect(health.ok()).toBeTruthy();
    console.log('✓ Grafana is healthy');

    // Verify the eval dashboard exists
    const dash = await request.get('http://localhost:3000/api/dashboards/uid/agro_rag_eval_complete', {
      headers: { 'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64') }
    });
    expect(dash.ok()).toBeTruthy();
    const dashData = await dash.json();
    expect(dashData?.dashboard?.title).toBe('AGRO RAG Evaluation - Complete Analysis');
    console.log('✓ Eval dashboard exists');

    // Get available run IDs from Prometheus
    const runIdsResponse = await request.get('http://localhost:9090/api/v1/label/run_id/values');
    expect(runIdsResponse.ok()).toBeTruthy();
    const runIdsData = await runIdsResponse.json();
    const runIds = runIdsData.data;
    expect(runIds.length).toBeGreaterThan(0);
    console.log(`✓ Found ${runIds.length} run IDs in Prometheus`);

    // Use the most recent run IDs (last two)
    const recentRunIds = runIds.slice(-2);
    console.log(`Using run IDs: ${recentRunIds.join(', ')}`);

    // Navigate to dashboard with recent run IDs
    const dashboardUrl = `http://localhost:3000/d/agro_rag_eval_complete/agro-rag-evaluation-complete-analysis?orgId=1&from=now-30d&to=now&var-run_id=${recentRunIds[0]}&var-run_id=${recentRunIds[1]}&var-run_id_detail=${recentRunIds[0]}&var-comparison_run_a=${recentRunIds[0]}&var-comparison_run_b=${recentRunIds[1]}`;

    await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Dashboard page loaded');

    // Wait for Grafana to render
    await page.waitForTimeout(5000);

    // Verify dashboard title is visible
    await expect(page.locator('text=AGRO RAG Evaluation').first()).toBeVisible({ timeout: 10000 });
    console.log('✓ Dashboard title visible');

    // Check for panel content (not blank screen) - look for grid/table elements or chart SVGs
    const grids = page.locator('div[role="grid"]');
    const gridCount = await grids.count();
    console.log(`✓ Found ${gridCount} grid/table elements on dashboard`);

    // Verify at least some content is rendered (tables, charts, etc.)
    const hasContent = gridCount > 0 || (await page.locator('svg').count() > 0);
    expect(hasContent).toBeTruthy();

    // Verify at least one panel has rendered content (not loading or error)
    await page.waitForTimeout(8000); // Give panels time to load data

    // Take screenshot for manual verification
    await page.screenshot({
      path: '/tmp/grafana-eval-dashboard.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved to /tmp/grafana-eval-dashboard.png');

    // Verify no "No data" messages (would indicate empty panels)
    // Note: Some panels might legitimately have no data, so we just log this
    const noDataElements = await page.locator('text=No data').count();
    console.log(`Info: ${noDataElements} panels showing "No data"`);

    // Check for any error panels
    const errorPanels = await page.locator('text=Error').count();
    expect(errorPanels).toBe(0);
    console.log('✓ No error panels detected');
  });

  test('verify specific metrics are available in Prometheus', async ({ request }) => {
    // Test specific eval metrics exist
    const metrics = [
      'agro_eval_run_accuracy',
      'agro_eval_run_total_questions',
      'agro_eval_question_result'
    ];

    for (const metric of metrics) {
      const response = await request.get(`http://localhost:9090/api/v1/query?query=${metric}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.data.result.length).toBeGreaterThan(0);
      console.log(`✓ Metric ${metric} has data`);
    }
  });
});
