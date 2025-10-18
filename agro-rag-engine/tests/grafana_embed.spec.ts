import { test, expect } from '@playwright/test';

test.describe('Grafana embed + provisioning', () => {
  test('dashboard editable and GUI shows metrics tab', async ({ page, request }) => {
    // Verify Grafana is up and dashboard is editable
    const health = await request.get('http://127.0.0.1:3000/api/health');
    expect(health.ok()).toBeTruthy();

    const dash = await request.get('http://127.0.0.1:3000/api/dashboards/uid/agro-overview');
    expect(dash.ok()).toBeTruthy();
    const j = await dash.json();
    expect(j?.meta?.canEdit).toBeTruthy();
    expect(j?.meta?.canSave).toBeTruthy();

    // GUI metrics tab exists and shows Grafana section
    await page.goto('/gui/');
    await page.locator('.tab-bar button[data-tab="metrics"]').first().click();
    await expect(page.getByText('Grafana Metrics Dashboard')).toBeVisible();
  });
});
