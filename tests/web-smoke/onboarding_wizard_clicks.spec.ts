import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/';

test.describe('Onboarding Wizard Navigation', () => {
  test('progress dots and nav buttons switch steps', async ({ page }) => {
    await page.goto(baseUrl);
    await page.click('a:has-text("Get Started")');
    await page.waitForSelector('#tab-start');
    const welcomeStep = page.locator('#onboard-welcome');
    const sourceStep = page.locator('#onboard-source');
    const indexStep = page.locator('#onboard-index');
    const tuneStep = page.locator('#onboard-tune');
    const nextButton = page.locator('#onboard-next');

    await expect(welcomeStep).toHaveClass(/active/);

    await nextButton.click();
    await expect(sourceStep).toHaveClass(/active/);

    await page.click('#onboard-back');
    await expect(welcomeStep).toHaveClass(/active/);

    await nextButton.click();
    await expect(sourceStep).toHaveClass(/active/);

    await page.click('.ob-dot[data-step="3"]');
    await expect(indexStep).toHaveClass(/active/);

    await page.click('.ob-dot[data-step="5"]');
    await expect(tuneStep).toHaveClass(/active/);
    await expect(nextButton).toHaveText(/Done/);
  });
});

