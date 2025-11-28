import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test.describe('Top-level Tabs Smoke', () => {
  test('nav shows core tabs and subtabs render', async ({ page }) => {
    await page.goto(baseUrl);

    // Top-level tabs visible
    for (const label of ['Get Started', 'Dashboard', 'Chat', 'VS Code', 'Grafana', 'RAG', 'Profiles', 'Infrastructure', 'Admin']) {
      await expect(page.locator(`a:has-text("${label}")`)).toBeVisible();
    }

    // Get Started tab
    await page.click('a:has-text("Get Started")');
    await expect(page.locator('#tab-start')).toHaveCount(1);
    await expect(page.locator('.ob-progress-dots')).toHaveCount(1);
    await expect(page.locator('#onboard-next')).toHaveCount(1);

    // Chat tab + settings subtab structure
    await page.click('a:has-text("Chat")');
    await expect(page.locator('#chat-messages')).toHaveCount(1);
    // Settings exists in legacy JSX tab
    await expect(page.locator('#tab-chat-settings')).toHaveCount(1);

    // Grafana tab structure
    await page.click('a:has-text("Grafana")');
    await expect(page.locator('#tab-grafana')).toHaveCount(1);
    await expect(page.locator('#grafana-embed')).toHaveCount(1);

    // RAG subtabs
    await page.click('a:has-text("RAG")');
    await expect(page.locator('#rag-subtabs')).toHaveCount(1);
    const ragButtons = page.locator('#rag-subtabs .subtab-btn');
    await expect(ragButtons).toHaveCount(6);
  });
});
